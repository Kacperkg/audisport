import base64
import io
import json
import os
import sys
import tempfile
import unittest
import zipfile
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

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

    def test_run_provenance(self):
        run = {"id": 1, "workflow_id": 2, "event": "push", "head_branch": "staging",
               "run_attempt": 1, "status": "completed", "conclusion": "success",
               "head_repository": {"full_name": wire.REPOSITORY},
               "repository": {"full_name": wire.REPOSITORY}}
        for change in ({"head_branch": "main"}, {"event": "workflow_dispatch"},
                       {"run_attempt": 2}, {"conclusion": "failure"}, {"workflow_id": 99}):
            with self.subTest(change=change), patch.object(release, "require_main"), patch.object(
                release, "github", side_effect=[wire.canonical(run | change), b'{"id":2}']
            ), self.assertRaisesRegex(ValueError, "ineligible staging run"):
                release.select(1, 1, SOURCE, None)


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
    def test_staging_replaces_only_frontend_and_keeps_attempt_when_unhealthy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, source in (
                ("deploy.py", DEPLOY / "host/deploy.py"),
                ("compose.yml", DEPLOY / "host/compose.yml"),
                ("manifest.py", DEPLOY / "manifest.py"),
            ):
                (root / name).write_bytes(source.read_bytes())
            (root / "docker-config").mkdir()
            coordinator_path = root / "coordinator.py"
            coordinator_path.write_bytes(b"# simulated Vellum coordinator")
            coordination = CoordinationTests.Coordinator()
            read_module = host.module
            manifest = candidate()
            project = "audi-staging"
            previous = "sha256:" + "c" * 64
            image_id = "sha256:" + "d" * 64

            with (
                patch.object(host, "ASSETS", root),
                patch.object(host, "STATE", root),
                patch.object(host, "COORDINATOR", coordinator_path),
                patch.object(host, "COORDINATOR_SHA", wire.digest(coordinator_path.read_bytes())),
                patch.object(host, "protected", side_effect=lambda path, **_: path),
                patch.object(host.os, "geteuid", return_value=0),
                patch.object(host, "module", side_effect=lambda name, code:
                             coordination if name == "vellum_coordination" else read_module(name, code)),
                patch.object(host, "command", side_effect=[
                    b"", b"web", f"{project} frontend {previous}".encode(), b"",
                    f"{image_id} {SOURCE} linux/amd64".encode(), b"", f"{image_id} unhealthy".encode(),
                ]) as command,
                self.assertRaisesRegex(ValueError, "health mismatch"),
            ):
                host.deploy("staging", base64.b64encode(manifest).decode())
            argv = [call.args[0] for call in command.call_args_list]
            up = [call for call in argv if "up" in call]
            self.assertEqual(len(up), 1)
            self.assertEqual(up[0][up[0].index("--project-name") + 1], "audi-staging")
            self.assertEqual(up[0][-1], "frontend")
            self.assertIn("--no-deps", up[0])
            self.assertTrue(all("audi-production" not in " ".join(call) for call in argv))
            self.assertTrue(coordination.pending)
            attempt = json.loads((root / "staging-1-1.attempt.json").read_bytes())
            self.assertEqual(attempt["previous_image_id"], previous)
            self.assertFalse((root / "staging-1-1.receipt.json").exists())


class PromotionTests(unittest.TestCase):
    def test_select_preserves_exact_staged_image(self):
        raw = candidate()
        receipt = wire.canonical({
            "environment": "staging", "manifest_sha256": wire.digest(raw),
            "previous_image_id": "sha256:" + "d" * 64, "image": wire.IMAGE + "@sha256:" + DIGEST,
            "source_sha": SOURCE, "image_id": "sha256:" + "e" * 64, "status": "healthy",
            "public_origin": "https://" + wire.ROUTES["staging"], "completed_at": "2026-11-04T10:00:00+00:00",
        })
        deployment = wire.canonical({
            "environment": "staging", "command_id": COMMAND, "instance_id": INSTANCE,
            "document": "audi-deploy-staging", "document_version": "2", "document_hash": DIGEST,
            "status": "Success", "dispatch_sha": SOURCE, "manifest_sha256": wire.digest(raw),
            "receipt_sha256": wire.digest(receipt),
        })
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            for name, body in zip(release.MEMBERS, (raw, receipt, deployment)):
                archive.writestr(name, body)
        data = output.getvalue()
        metadata = {
            "total_count": 1, "artifacts": [{
                "name": "audi-staged-1-1", "id": 3, "expired": False, "size_in_bytes": len(data),
                "digest": "sha256:" + wire.digest(data),
            }],
        }
        run = {"id": 1, "workflow_id": 2, "event": "push", "head_branch": "staging", "head_sha": SOURCE,
               "run_attempt": 1, "status": "completed", "conclusion": "success",
               "head_repository": {"full_name": wire.REPOSITORY}, "repository": {"full_name": wire.REPOSITORY}}
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.dict(os.environ, {"AUDI_INSTANCE_ID": INSTANCE}),
            patch.object(release, "require_main"),
            patch.object(release, "github", side_effect=[wire.canonical(run), b'{"id":2}',
                                                        wire.canonical(metadata), data]),
            patch.object(release, "process", side_effect=[b"", b"same-tree", b"same-tree"]),
        ):
            selected = Path(directory) / "candidate.json"
            release.select(1, 1, "f" * 40, selected)
            self.assertEqual(selected.read_bytes(), raw)
