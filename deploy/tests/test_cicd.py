import base64
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

DEPLOY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(DEPLOY))
import manifest as wire
import release
from host import deploy as host

SOURCE = "a" * 40
DIGEST = "b" * 64
INSTANCE = "i-01234567890123456"
COMMAND = "e7bab9e9-dbd5-4c05-ac60-a60acdc3a0f0"


def candidate(**override):
    value = {
        "schema": 1, "repository": wire.REPOSITORY, "source_sha": SOURCE, "run_id": 1,
        "run_attempt": 1, "image": wire.IMAGE + "@sha256:" + DIGEST,
        "bundle": wire.source_bundle(DEPLOY.parent),
    }
    return wire.canonical(value | override)


class ManifestTests(unittest.TestCase):
    def test_exact_schema_package_and_digest(self):
        self.assertEqual(wire.read_manifest(candidate())["source_sha"], SOURCE)
        for override in (
            {"repository": "other/audisport"}, {"source_sha": "main"},
            {"run_attempt": True}, {"environment": "production"}, {"bundle": {}},
            {"image": wire.IMAGE + ":latest"}, {"image": "ghcr.io/other/app@sha256:" + DIGEST},
        ):
            with self.subTest(override=override), self.assertRaises(ValueError):
                wire.read_manifest(candidate(**override))

    def test_archive_hash_and_members(self):
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            for name in release.MEMBERS:
                archive.writestr(name, b"{}")
        data = output.getvalue()
        self.assertEqual(set(release.archive_members(data, wire.digest(data))), set(release.MEMBERS))
        with self.assertRaises(ValueError):
            release.archive_members(data, DIGEST)
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            archive.writestr("../manifest.json", b"{}")
        with self.assertRaises(ValueError):
            release.archive_members(output.getvalue(), wire.digest(output.getvalue()))

class DispatchTests(unittest.TestCase):
    def setUp(self):
        environment = {
            "GITHUB_SHA": SOURCE, "GITHUB_REPOSITORY": wire.REPOSITORY, "GITHUB_REF": "refs/heads/staging",
            "GITHUB_EVENT_NAME": "push", "GITHUB_RUN_ID": "1", "GITHUB_RUN_ATTEMPT": "1",
            "AUDI_AWS_ACCOUNT_ID": "123456789012", "AUDI_INSTANCE_ID": INSTANCE,
            "AUDI_DOCUMENT": "audi-deploy-staging", "AUDI_DOCUMENT_VERSION": "2",
            "AUDI_DOCUMENT_SHA256": DIGEST,
        }
        self.enterContext(patch.dict(os.environ, environment))
        self.enterContext(patch.object(release, "branch_tip"))
        self.doc = {"Document": {
            "Owner": "123456789012", "Name": "audi-deploy-staging", "DocumentVersion": "2",
            "HashType": "Sha256", "Hash": DIGEST, "Status": "Active", "DocumentType": "Command",
        }}
        self.directory = Path(self.enterContext(tempfile.TemporaryDirectory()))

    def test_invalid_document_or_version_never_sends(self):
        for key, value in (("Name", "audi-deploy-production"), ("DocumentVersion", "1"),
                           ("Hash", "c" * 64), ("Owner", "000000000000")):
            with self.subTest(key=key), patch.object(release, "aws", return_value={
                "Document": self.doc["Document"] | {key: value},
            }) as aws, self.assertRaisesRegex(ValueError, "pin mismatch"):
                release.dispatch("staging", candidate(), self.directory)
            self.assertEqual(aws.call_count, 1)

    def test_wrong_instance_and_failed_command_leave_status(self):
        response = {"Command": {"CommandId": COMMAND}}
        invocation = {
            "CommandId": COMMAND, "InstanceId": INSTANCE, "DocumentName": "audi-deploy-staging",
            "DocumentVersion": "2", "PluginName": "deployAudi", "Status": "Cancelled", "ResponseCode": 1,
        }
        for returned, message in (
            (invocation | {"InstanceId": "i-11111111111111111"}, "unexpected SSM invocation"),
            (invocation, "SSM returned Cancelled"),
        ):
            with self.subTest(message=message), patch.object(release, "aws", side_effect=[
                self.doc, response, returned,
            ]) as aws, self.assertRaisesRegex(ValueError, message):
                release.dispatch("staging", candidate(), self.directory)
            sent = json.loads(aws.call_args_list[1].args[-1])
            self.assertEqual(sent["InstanceIds"], [INSTANCE])
            self.assertEqual(sent["DocumentVersion"], "2")
            self.assertEqual(base64.b64decode(sent["Parameters"]["Manifest"][0]), candidate())
            self.assertEqual(json.loads((self.directory / "status.json").read_bytes())["command_id"], COMMAND)
            self.assertFalse((self.directory / "deployment.json").exists())


class CoordinationTests(unittest.TestCase):
    class Coordinator:
        def __init__(self, busy=False):
            self.busy = busy
            self.pending = False

        @contextmanager
        def operation(self, directory, kind, target):
            if self.busy or self.pending:
                raise ValueError("host busy")
            self.pending = True
            yield
            self.pending = False

    def test_busy_or_pending_prevents_mutation(self):
        for pending in (False, True):
            coordination = self.Coordinator(busy=not pending)
            coordination.pending = pending
            with self.assertRaisesRegex(ValueError, "host busy"):
                with host.guarded_operation(coordination, "staging"):
                    self.fail("conflict allowed operation")

    def test_interrupt_after_start_preserves_the_recovery_marker(self):
        coordination = self.Coordinator()
        with self.assertRaises(KeyboardInterrupt):
            with host.guarded_operation(coordination, "production") as start:
                start()
                raise KeyboardInterrupt
        self.assertTrue(coordination.pending)

    def test_failed_mutation_keeps_marker_but_preflight_replay_does_not(self):
        coordination = self.Coordinator()
        with self.assertRaisesRegex(ValueError, "replay"):
            with host.guarded_operation(coordination, "staging"):
                raise ValueError("replay")
        self.assertFalse(coordination.pending)
        with self.assertRaisesRegex(ValueError, "unhealthy"):
            with host.guarded_operation(coordination, "staging") as start:
                start()
                raise ValueError("unhealthy")
        self.assertTrue(coordination.pending)


class HostDeploymentTests(unittest.TestCase):
    def run_host(self, target, payload, responses, failure, clock=None, existing_attempt=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, source in (
                ("deploy.py", DEPLOY / "host/deploy.py"),
                ("compose.yml", DEPLOY / "host/compose.yml"),
                ("manifest.py", DEPLOY / "manifest.py"),
            ):
                (root / name).write_bytes(source.read_bytes())
            (root / "docker-config").mkdir()
            coordinator = root / "coordinator.py"
            coordinator.write_bytes(b"# simulated Vellum coordinator")
            coordination = CoordinationTests.Coordinator()
            read_module = host.module
            attempt = root / f"{target}-1-1.attempt.json"
            if existing_attempt:
                attempt.write_bytes(b"previous attempt evidence")
            with (
                patch.object(host, "ASSETS", root),
                patch.object(host, "STATE", root),
                patch.object(host, "COORDINATOR", coordinator),
                patch.object(host, "COORDINATOR_SHA", wire.digest(coordinator.read_bytes())),
                patch.object(host, "protected", side_effect=lambda path, **_: path),
                patch.object(host.os, "geteuid", return_value=0),
                patch.object(host, "module", side_effect=lambda name, code:
                             coordination if name == "vellum_coordination" else read_module(name, code)),
                patch.object(host, "command", side_effect=responses) as command,
                patch.object(host.time, "time", side_effect=clock),
                self.assertRaisesRegex(ValueError, failure),
            ):
                host.deploy(target, base64.b64encode(payload).decode())
            self.assertFalse((root / f"{target}-1-1.receipt.json").exists())
            return command, coordination, attempt.read_bytes() if attempt.exists() else None

    def test_staging_replaces_only_frontend_and_keeps_attempt_when_unhealthy(self):
        previous = "sha256:" + "c" * 64
        image_id = "sha256:" + "d" * 64
        command, coordination, attempt = self.run_host("staging", candidate(), [
            b"", b"web", f"audi-staging frontend {previous}".encode(), b"",
            f"{image_id} {SOURCE} linux/amd64".encode(), b"", f"{image_id} unhealthy".encode(),
        ], "health mismatch")
        argv = [call.args[0] for call in command.call_args_list]
        up = [call for call in argv if "up" in call]
        self.assertEqual(len(up), 1)
        self.assertEqual(up[0][up[0].index("--project-name") + 1], "audi-staging")
        self.assertEqual(up[0][-1], "frontend")
        self.assertIn("--no-deps", up[0])
        self.assertTrue(all("audi-production" not in " ".join(call) for call in argv))
        self.assertTrue(coordination.pending)
        self.assertEqual(json.loads(attempt)["previous_image_id"], previous)

    def test_delayed_production_command_never_touches_docker(self):
        for clock, payload, failure in (
            ([1091], wire.production_request(candidate(), 1000), "expired"),
            ([999], wire.production_request(candidate(), 1000), "early"),
            ([1511], wire.production_request(candidate(), 1000), "expired"),
            ([], candidate(), "invalid production request"),
        ):
            with self.subTest(clock=clock, failure=failure):
                # Reading the envelope obtains a clock value even when its schema is wrong.
                command, coordination, attempt = self.run_host(
                    "production", payload, [], failure, clock or [1000],
                )
                command.assert_not_called()
                self.assertFalse(coordination.pending)
                self.assertIsNone(attempt)

    def test_expiry_is_rechecked_under_locks_before_mutation(self):
        previous = "sha256:" + "c" * 64
        command, coordination, attempt = self.run_host(
            "production", wire.production_request(candidate(), 1000),
            [b"", b"web", f"audi-production frontend {previous}".encode()],
            "expired", [1020, 1091],
        )
        self.assertEqual(command.call_count, 3)
        self.assertFalse(coordination.pending)
        self.assertIsNone(attempt)

    def test_compose_preflight_failure_releases_marker_without_mutation(self):
        command, coordination, attempt = self.run_host(
            "production", wire.production_request(candidate(), 1000),
            [ValueError("Compose validation failed")], "Compose validation failed", [1020],
        )
        self.assertEqual(command.call_count, 1)
        self.assertFalse(coordination.pending)
        self.assertIsNone(attempt)

    def test_fresh_replay_preserves_prior_evidence_and_releases_marker(self):
        command, coordination, attempt = self.run_host(
            "production", wire.production_request(candidate(), 1000), [],
            "already attempted", [1020], existing_attempt=True,
        )
        command.assert_not_called()
        self.assertFalse(coordination.pending)
        self.assertEqual(attempt, b"previous attempt evidence")


class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.git("init", "-q", "-b", "main")
        (self.directory / "index").write_text("baseline")
        self.git("add", "index")
        self.git("commit", "-qm", "base")
        self.git("checkout", "-qb", "staging")
        (self.directory / "index").write_text("reviewed")
        self.git("commit", "-qam", "stage")
        self.stage_sha = self.git("rev-parse", "HEAD").decode().strip()
        self.git("checkout", "-q", "main")
        self.git("merge", "--no-ff", "-qm", "merge reviewed staging", "staging")
        self.main_sha = self.git("rev-parse", "HEAD").decode().strip()
        self.assertNotEqual(self.stage_sha, self.main_sha)
        self.now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.env = {
            "GITHUB_SHA": self.main_sha, "GITHUB_REPOSITORY": wire.REPOSITORY,
            "GITHUB_REF": "refs/heads/main", "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_RUN_ID": "100", "GITHUB_RUN_ATTEMPT": "1",
            "AUDI_PRODUCTION_CONFIRMATION": "true", "AUDI_PRODUCTION_DEPLOY_ENABLED": "true",
            "AUDI_INSTANCE_ID": INSTANCE, "AUDI_AWS_ACCOUNT_ID": "123456789012",
            "AUDI_DOCUMENT": "audi-deploy-production", "AUDI_DOCUMENT_VERSION": "3",
            "AUDI_DOCUMENT_SHA256": "c" * 64,
            "AUDI_STAGING_DOCUMENT_VERSION": "2", "AUDI_STAGING_DOCUMENT_SHA256": DIGEST,
            "GITHUB_STEP_SUMMARY": str(self.directory / "summary"),
        }
        self.enterContext(patch.dict(os.environ, self.env))
        self.enterContext(patch.object(release, "process", side_effect=self.process))
        self.github_mock = self.enterContext(patch.object(release, "github", side_effect=self.github))
        self.main_protected = True
        self.main_tip = self.main_sha
        self.staging_protected = True
        self.runs = [self.run_record(1)]
        self.latest = {}
        self.skip_job = None
        self.job_sha = self.stage_sha
        self.artifact = None
        self.archive = None
        self.set_artifact()

    def git(self, *args):
        return subprocess.check_output([
            "git", "-C", str(self.directory), "-c", "user.name=Audi Test",
            "-c", "user.email=audi-test@example.invalid", *args,
        ])

    def process(self, args):
        if args[0] == "git":
            return self.git(*args[1:])
        if args == ["docker", "buildx", "imagetools", "inspect", json.loads(self.raw)["image"]]:
            return b"registry manifest"
        self.fail(f"unexpected process: {args}")

    def run_record(self, run_id, **changes):
        return {
            "id": run_id, "workflow_id": 2, "event": "push", "head_branch": "staging",
            "head_sha": self.stage_sha, "run_attempt": 1, "status": "completed",
            "conclusion": "success", "created_at": self.now,
            "repository": {"full_name": wire.REPOSITORY, "id": 9},
            "head_repository": {"full_name": wire.REPOSITORY, "id": 9},
        } | changes

    def set_artifact(self, manifest_change=None, receipt_change=None, deployment_change=None):
        self.raw = candidate(source_sha=self.stage_sha, **(manifest_change or {}))
        value = json.loads(self.raw)
        self.receipt = wire.canonical({
            "environment": "staging", "manifest_sha256": wire.digest(self.raw),
            "previous_image_id": "sha256:" + "d" * 64, "image": value["image"],
            "source_sha": self.stage_sha, "image_id": "sha256:" + "e" * 64, "status": "healthy",
            "public_origin": "https://" + wire.ROUTES["staging"], "completed_at": self.now[:-1] + "+00:00",
        } | (receipt_change or {}))
        deployment = wire.canonical({
            "environment": "staging", "command_id": COMMAND, "instance_id": INSTANCE,
            "document": "audi-deploy-staging", "document_version": "2", "document_hash": DIGEST,
            "status": "Success", "dispatch_sha": self.stage_sha, "manifest_sha256": wire.digest(self.raw),
            "receipt_sha256": wire.digest(self.receipt),
        } | (deployment_change or {}))
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            for name, body in zip(release.MEMBERS, (self.raw, self.receipt, deployment)):
                archive.writestr(name, body)
        self.archive = output.getvalue()
        self.artifact = {
            "name": "audi-staged-1-1", "id": 3, "expired": False, "size_in_bytes": len(self.archive),
            "digest": "sha256:" + wire.digest(self.archive),
            "workflow_run": {"id": 1, "head_branch": "staging", "head_sha": self.stage_sha,
                             "repository_id": 9, "head_repository_id": 9},
        }

    def github(self, endpoint):
        url = urlsplit(endpoint)
        path = url.path
        if path == "branches/main":
            return wire.canonical({"protected": self.main_protected, "commit": {"sha": self.main_tip}})
        if path == "branches/staging":
            return wire.canonical({"protected": self.staging_protected})
        if path == "actions/workflows/release-staging.yml":
            return b'{"id":2}'
        if path == "actions/workflows/release-production.yml":
            return b'{"id":4}'
        if path == "actions/runs/100":
            return wire.canonical(self.run_record(
                100, workflow_id=4, event="workflow_dispatch", head_branch="main", head_sha=self.main_sha,
                status="in_progress",
            ))
        if path == "actions/workflows/2/runs":
            page = int(parse_qs(url.query)["page"][0])
            return wire.canonical({"total_count": len(self.runs),
                                   "workflow_runs": self.runs[(page - 1) * 100:page * 100]})
        if path == "actions/runs/1":
            return wire.canonical(self.runs[-1] | self.latest)
        if path.endswith("/jobs"):
            run_id, attempt = (int(path.split("/")[index]) for index in (2, 4))
            jobs = [{"name": name, "run_id": run_id, "head_sha": self.job_sha, "run_attempt": attempt,
                     "status": "completed", "conclusion": "skipped" if name == self.skip_job else "success"}
                    for name in (*release.STAGING_JOBS, "ci / Docker image")]
            return wire.canonical({"total_count": len(jobs), "jobs": jobs})
        if path.endswith("/artifacts"):
            return wire.canonical({"total_count": int(self.artifact is not None),
                                   "artifacts": [self.artifact] if self.artifact else []})
        if path == "actions/artifacts/3/zip":
            return self.archive
        self.fail(f"unexpected API request: {endpoint}")

    def select(self):
        path = self.directory / "selected.json"
        release.select(path)
        return path.read_bytes()

    def test_normal_merge_selects_exact_staged_image_despite_newer_different_run(self):
        self.git("checkout", "-q", "staging")
        (self.directory / "index").write_text("newer unreviewed")
        self.git("commit", "-qam", "newer")
        newer = self.git("rev-parse", "HEAD").decode().strip()
        self.git("checkout", "-q", "main")
        self.runs.insert(0, self.run_record(7, head_sha=newer))
        selected = json.loads(self.select())
        self.assertEqual(wire.canonical(selected["manifest"]), self.raw)
        self.assertEqual(selected["main_sha"], self.main_sha)
        self.assertEqual(selected["archive_digest"], self.artifact["digest"])
        self.assertIn(json.loads(self.raw)["image"], Path(self.env["GITHUB_STEP_SUMMARY"]).read_text())

    def test_ambiguous_matching_successes_are_rejected(self):
        self.runs.append(self.run_record(7))
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            self.select()

    def test_search_uses_bounded_pagination(self):
        matching = self.runs[0]
        self.runs = [self.run_record(n, head_sha="b" * 40) for n in range(1000, 1100)] + [matching]
        self.select()
        self.assertTrue(any("page=2" in call.args[0] for call in self.github_mock.call_args_list))
        self.runs = [self.run_record(n) for n in range(301)]
        with self.assertRaisesRegex(ValueError, "exceeded 300"):
            self.select()

    def test_no_release_failed_latest_and_publish_only_are_ineligible(self):
        for changes, job in (({"head_sha": "b" * 40}, None),
                             ({"run_attempt": 2, "conclusion": "failure"}, None),
                             ({"run_attempt": 2, "conclusion": "cancelled"}, None), ({}, "deploy")):
            with self.subTest(changes=changes, job=job):
                self.runs = [self.run_record(1, **changes)]
                self.skip_job = job
                with self.assertRaisesRegex(ValueError, "no eligible"):
                    self.select()

    def test_rejects_manual_wrong_repository_workflow_and_branch(self):
        for changes in ({"event": "workflow_dispatch"}, {"workflow_id": 11}, {"head_branch": "main"},
                        {"head_repository": {"full_name": "elsewhere/audisport"}}):
            self.runs = [self.run_record(1, **changes)]
            with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, "run identity"):
                self.select()

    def test_rejects_wrong_job_sha(self):
        self.job_sha = "b" * 40
        with self.assertRaisesRegex(ValueError, "attempt job"):
            self.select()

    def test_rejects_missing_expired_or_tampered_artifact(self):
        self.artifact = None
        with self.assertRaisesRegex(ValueError, "no unique promotion artifact"):
            self.select()
        self.set_artifact()
        self.artifact["expired"] = True
        with self.assertRaisesRegex(ValueError, "expired staging artifact"):
            self.select()
        self.set_artifact()
        self.archive += b"tamper"
        with self.assertRaisesRegex(ValueError, "artifact archive hash mismatch"):
            self.select()

    def test_rejects_manifest_receipt_and_staging_ssm_mismatches(self):
        for changes, pattern in (
            ({"manifest_change": {"image": wire.IMAGE + ":latest"}}, "unexpected image"),
            ({"manifest_change": {"bundle": {"deploy.py": "b" * 64}}}, "invalid bundle"),
            ({"receipt_change": {"environment": "production"}}, "host receipt"),
            ({"receipt_change": {"image": wire.IMAGE + "@sha256:" + "f" * 64}}, "host receipt"),
            ({"deployment_change": {"receipt_sha256": "f" * 64}}, "pin mismatch"),
            ({"deployment_change": {"instance_id": "i-11111111111111111"}}, "pin mismatch"),
            ({"deployment_change": {"document_version": "4"}}, "pin mismatch"),
            ({"deployment_change": {"document_hash": "f" * 64}}, "pin mismatch"),
        ):
            with self.subTest(changes=changes):
                self.set_artifact(**changes)
                with self.assertRaisesRegex(ValueError, pattern):
                    self.select()

    def test_squash_equal_tree_without_staged_ancestor_is_rejected(self):
        self.git("reset", "--hard", "HEAD^1")
        self.git("merge", "--squash", "staging")
        self.git("commit", "-qm", "squash")
        self.main_sha = self.git("rev-parse", "HEAD").decode().strip()
        self.main_tip = self.main_sha
        with patch.dict(os.environ, {"GITHUB_SHA": self.main_sha}), self.assertRaisesRegex(ValueError, "no eligible"):
            self.select()

    def test_mismatched_main_tree_is_rejected(self):
        (self.directory / "index").write_text("changed after staging")
        self.git("commit", "-qam", "main change")
        self.main_sha = self.git("rev-parse", "HEAD").decode().strip()
        self.main_tip = self.main_sha
        with patch.dict(os.environ, {"GITHUB_SHA": self.main_sha}), self.assertRaisesRegex(ValueError, "no eligible"):
            self.select()

    def test_production_context_fails_closed(self):
        for override in ({"GITHUB_REPOSITORY": "elsewhere/audisport"}, {"GITHUB_REF": "refs/heads/staging"},
                         {"GITHUB_EVENT_NAME": "push"}, {"AUDI_PRODUCTION_DEPLOY_ENABLED": "false"},
                         {"AUDI_PRODUCTION_CONFIRMATION": "false"}, {"GITHUB_RUN_ATTEMPT": "2"}):
            with self.subTest(override=override), patch.dict(os.environ, override), self.assertRaisesRegex(
                ValueError, "fresh confirmed dispatch",
            ):
                self.select()
        self.main_protected = False
        with self.assertRaisesRegex(ValueError, "main must be protected"):
            self.select()
        self.main_protected = True
        self.staging_protected = False
        with self.assertRaisesRegex(ValueError, "staging must still be protected"):
            self.select()

    def test_stale_confirmation_and_advanced_main_before_selection(self):
        with patch.object(release, "confirmation_expiry", return_value=0), self.assertRaisesRegex(
            ValueError, "confirmation is too old",
        ):
            self.select()
        self.main_tip = "b" * 40
        with self.assertRaisesRegex(ValueError, "main must be protected"):
            self.select()

    def test_main_advancing_during_selection_invalidates_the_proof(self):
        def advance_main(main):
            selected = resolve(main)
            self.main_tip = "b" * 40
            return selected

        resolve = release.resolve
        with patch.object(release, "resolve", side_effect=advance_main), self.assertRaisesRegex(
            ValueError, "main must be protected",
        ):
            self.select()
        self.assertFalse((self.directory / "selected.json").exists())

    def test_selected_run_rerun_after_archive_check_is_rejected(self):
        self.latest = {"run_attempt": 2, "conclusion": "failure"}
        with self.assertRaisesRegex(ValueError, "changed or was rerun"):
            self.select()

    def production_document(self):
        return {"Document": {
            "Owner": self.env["AUDI_AWS_ACCOUNT_ID"], "Name": self.env["AUDI_DOCUMENT"],
            "DocumentVersion": self.env["AUDI_DOCUMENT_VERSION"], "HashType": "Sha256",
            "Hash": self.env["AUDI_DOCUMENT_SHA256"], "Status": "Active", "DocumentType": "Command",
        }}

    def test_dispatch_rejects_changed_evidence_and_main_after_aws_validation(self):
        selected = self.select()
        with patch.object(release, "aws", return_value=self.production_document()) as aws:
            self.artifact["id"] = 4
            original = self.github_mock.side_effect
            self.github_mock.side_effect = lambda path: self.archive if path == "actions/artifacts/4/zip" else original(path)
            with self.assertRaisesRegex(ValueError, "artifact changed"):
                release.dispatch("production", selected, self.directory)
            aws.assert_called_once()
        self.artifact["id"] = 3

        def advance_main(*args):
            self.main_tip = "b" * 40
            return self.production_document()

        with patch.object(release, "aws", side_effect=advance_main) as aws, self.assertRaisesRegex(
            ValueError, "main must be protected",
        ):
            release.dispatch("production", selected, self.directory)
        aws.assert_called_once()

    def test_dispatch_rejects_an_unavailable_digest(self):
        selected = self.select()

        def registry_unavailable(args):
            if args[0] == "docker":
                raise subprocess.CalledProcessError(1, args)
            return self.process(args)

        with patch.object(release, "process", side_effect=registry_unavailable), patch.object(
            release, "aws", return_value=self.production_document(),
        ) as aws, self.assertRaisesRegex(ValueError, "digest is unavailable"):
            release.dispatch("production", selected, self.directory)
        aws.assert_called_once()

    def test_dispatch_never_sends_wrong_ssm_pin_or_invalid_selection(self):
        selected = self.select()
        doc = self.production_document()
        doc["Document"]["Hash"] = "f" * 64
        with patch.object(release, "aws", return_value=doc) as aws, self.assertRaisesRegex(
            ValueError, "document pin mismatch",
        ):
            release.dispatch("production", selected, self.directory)
        aws.assert_called_once()
        with patch.object(release, "aws") as aws, self.assertRaises(ValueError):
            release.dispatch("production", b"bad JSON", self.directory)
        aws.assert_not_called()

    def test_dispatch_sends_the_same_manifest_in_a_fresh_expiring_envelope(self):
        selected = self.select()
        production_receipt = wire.canonical(json.loads(self.receipt) | {
            "environment": "production", "public_origin": "https://" + wire.ROUTES["production"],
        })
        invocation = {
            "CommandId": COMMAND, "InstanceId": INSTANCE, "DocumentName": self.env["AUDI_DOCUMENT"],
            "DocumentVersion": self.env["AUDI_DOCUMENT_VERSION"], "PluginName": "deployAudi",
            "Status": "Success", "ResponseCode": 0, "StandardOutputContent": production_receipt.decode(),
        }
        with patch.object(release, "aws", side_effect=[
            self.production_document(), {"Command": {"CommandId": COMMAND}}, invocation,
        ]) as aws:
            release.dispatch("production", selected, self.directory)
        sent = json.loads(aws.call_args_list[1].args[-1])
        payload = base64.b64decode(sent["Parameters"]["Manifest"][0])
        decoded, issued, expires = wire.read_production_request(payload, json.loads(payload)["issued_at"])
        self.assertEqual(decoded, self.raw)
        self.assertEqual(expires - issued, 510)
        self.assertEqual(sent["InstanceIds"], [INSTANCE])
        self.assertEqual((self.directory / "selection.json").read_bytes(), selected)
        self.assertEqual((self.directory / "receipt.json").read_bytes(), production_receipt)
