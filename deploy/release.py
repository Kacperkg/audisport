"""Create, select and dispatch an Audi release from GitHub Actions."""
import base64
import io
import json
import os
import subprocess
import sys
import time
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

from manifest import (
    HASH, PRODUCTION_VALIDITY_SECONDS, REPOSITORY, ROUTES, SHA, SSM_DELIVERY_SECONDS,
    canonical, digest, matches, production_request, read_manifest, require, source_bundle,
)

ROOT = Path(__file__).resolve().parents[1]
STAGING_WORKFLOW = "release-staging.yml"
STAGING_JOBS = ("ci / Application", "ci / Deployment configuration", "publish", "deploy")
CONFIRMATION_SECONDS = 20 * 60
MEMBERS = ("manifest.json", "receipt.json", "deployment.json")


def process(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          timeout=60).stdout


def github(path):
    return process(["gh", "api", "--hostname", "github.com", f"repos/{REPOSITORY}/{path}"])


def aws(operation, *args):
    return json.loads(process(["aws", "ssm", operation, *args, "--region", "eu-west-2",
                               "--no-cli-pager", "--output", "json"]))


def positive(value):
    require(matches(r"[1-9][0-9]{0,17}", value), "invalid GitHub run ID or attempt")
    return int(value)


def branch_tip(branch, sha):
    ref = json.loads(github(f"branches/{branch}"))
    require(ref["protected"] is True and ref["commit"]["sha"] == sha,
            f"{branch} must be protected and still point to the expected SHA")


def artifact_name(run_id, attempt):
    return f"audi-staged-{run_id}-{attempt}"


def create(image, output):
    require(os.environ["GITHUB_REPOSITORY"] == REPOSITORY
            and os.environ["GITHUB_REF"] == "refs/heads/staging"
            and os.environ["GITHUB_EVENT_NAME"] == "push", "staging push required")
    sha = os.environ["GITHUB_SHA"]
    branch_tip("staging", sha)
    data = canonical({
        "schema": 1, "repository": REPOSITORY, "source_sha": sha,
        "run_id": positive(os.environ["GITHUB_RUN_ID"]),
        "run_attempt": positive(os.environ["GITHUB_RUN_ATTEMPT"]), "image": image,
        "bundle": source_bundle(ROOT),
    })
    read_manifest(data)
    output.write_bytes(data)


def read_receipt(data, raw, env):
    manifest = read_manifest(raw)
    value = json.loads(data)
    require(isinstance(value, dict) and canonical(value) == data and set(value) == {
        "environment", "manifest_sha256", "previous_image_id", "image", "source_sha",
        "image_id", "status", "public_origin", "completed_at",
    }, "invalid host receipt")
    require(value["environment"] == env and value["manifest_sha256"] == digest(raw)
            and value["image"] == manifest["image"] and value["source_sha"] == manifest["source_sha"]
            and value["status"] == "healthy" and value["public_origin"] == "https://" + ROUTES[env]
            and all(matches("sha256:" + HASH, value[key]) for key in ("image_id", "previous_image_id"))
            and matches(r"\d{4}-\d\d-\d\dT[0-9:.]+\+00:00", value["completed_at"]),
            "host receipt does not match the release")
    return value


def read_deployment(data, env):
    value = json.loads(data)
    require(isinstance(value, dict) and canonical(value) == data and set(value) == {
        "environment", "command_id", "instance_id", "document", "document_version",
        "document_hash", "status", "dispatch_sha", "manifest_sha256", "receipt_sha256",
    }, "invalid invocation receipt")
    require(value["environment"] == env and value["status"] == "Success"
            and matches(r"[0-9a-f-]{36}", value["command_id"])
            and str(uuid.UUID(value["command_id"])) == value["command_id"]
            and matches(r"i-[0-9a-f]{17}", value["instance_id"])
            and matches(r"[a-z][a-z0-9-]{1,23}-deploy-" + env, value["document"])
            and matches(r"[1-9][0-9]*", value["document_version"])
            and matches(HASH, value["document_hash"])
            and matches(SHA, value["dispatch_sha"])
            and matches(HASH, value["manifest_sha256"])
            and matches(HASH, value["receipt_sha256"]), "invalid invocation identity")
    return value


def archive_members(archive, expected_hash):
    require(len(archive) <= 65536 and digest(archive) == expected_hash, "artifact archive hash mismatch")
    with zipfile.ZipFile(io.BytesIO(archive)) as contents:
        entries = contents.infolist()
        require(len(entries) == len(MEMBERS) and {entry.filename for entry in entries} == set(MEMBERS)
                and all(0 < entry.file_size <= 8192 for entry in entries), "unexpected artifact entries")
        return {entry.filename: contents.read(entry) for entry in entries}


def require_main():
    sha = os.environ["GITHUB_SHA"]
    require(matches(SHA, sha) and os.environ["GITHUB_REPOSITORY"] == REPOSITORY
            and os.environ["GITHUB_REF"] == "refs/heads/main"
            and os.environ["GITHUB_EVENT_NAME"] == "workflow_dispatch"
            and os.environ.get("GITHUB_RUN_ATTEMPT") == "1"
            and os.environ.get("AUDI_PRODUCTION_CONFIRMATION") == "true"
            and os.environ.get("AUDI_PRODUCTION_DEPLOY_ENABLED") == "true",
            "production requires a fresh confirmed dispatch on protected main with deployment enabled")
    branch_tip("main", sha)
    return sha


def run_identity(run, workflow_id, branch, event):
    return (run["workflow_id"] == workflow_id and run["event"] == event
            and run["head_branch"] == branch and matches(SHA, run["head_sha"])
            and run["head_repository"]["full_name"] == REPOSITORY
            and run["repository"]["full_name"] == REPOSITORY)


def confirmation_expiry(sha):
    run_id = positive(os.environ["GITHUB_RUN_ID"])
    run = json.loads(github(f"actions/runs/{run_id}"))
    workflow = json.loads(github("actions/workflows/release-production.yml"))
    require(run["id"] == run_id and run_identity(run, workflow["id"], "main", "workflow_dispatch")
            and run["head_sha"] == sha and run["run_attempt"] == 1 and run["status"] == "in_progress",
            "GitHub production dispatch identity changed")
    created = github_time(run["created_at"])
    require(created <= time.time(), "production confirmation timestamp is in the future")
    return created + CONFIRMATION_SECONDS


def github_time(value):
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()


def staged_runs(workflow_id):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    query = urlencode({"branch": "staging", "event": "push", "created": ">=" + cutoff, "per_page": 100})
    runs = {}
    total = None
    for page in range(1, 4):
        result = json.loads(github(f"actions/workflows/{workflow_id}/runs?{query}&page={page}"))
        if total is None:
            total = result["total_count"]
        require(type(total) is int and 0 <= total <= 300,
                "staging search exceeded 300 pushes in 30 days; no safe selection")
        items = result["workflow_runs"]
        require(result["total_count"] == total and len(items) == min(100, total - len(runs)),
                "staging search changed or was truncated")
        for run in items:
            require(type(run["id"]) is int and run["id"] > 0 and run["id"] not in runs
                    and run_identity(run, workflow_id, "staging", "push")
                    and github_time(run["created_at"]) >= github_time(cutoff),
                    "unexpected staging workflow run identity or pagination")
            runs[run["id"]] = run
        if len(runs) == total:
            return runs.values()
    raise ValueError("staging search did not complete")


def staging_jobs(run):
    run_id, attempt = run["id"], run["run_attempt"]
    require(type(attempt) is int and attempt > 0, "invalid latest staging attempt")
    result = json.loads(github(f"actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100"))
    jobs = result["jobs"]
    require(result["total_count"] == len(jobs) <= 100, "staging attempt job list was truncated")
    seen = {}
    for job in jobs:
        require(job["run_id"] == run_id and job["head_sha"] == run["head_sha"]
                and job["run_attempt"] == attempt and job["name"] not in seen,
                "unexpected or duplicate staging attempt job")
        seen[job["name"]] = (job["status"], job["conclusion"])
    return all(seen.get(name) == ("completed", "success") for name in STAGING_JOBS)


def staging_artifact(run, main, tree):
    run_id, attempt = run["id"], run["run_attempt"]
    name = artifact_name(run_id, attempt)
    artifacts = json.loads(github(f"actions/runs/{run_id}/artifacts?name={name}"))
    require(artifacts["total_count"] == 1 and len(artifacts["artifacts"]) == 1,
            "matching staging deployment has no unique promotion artifact")
    artifact = artifacts["artifacts"][0]
    require(type(artifact["id"]) is int and artifact["id"] > 0
            and artifact["name"] == name and artifact["expired"] is False
            and 0 < artifact["size_in_bytes"] <= 65536
            and matches("sha256:" + HASH, artifact.get("digest")), "invalid or expired staging artifact")
    identity = artifact.get("workflow_run")
    if identity is not None:
        require(identity["id"] == run_id and identity["head_branch"] == "staging"
                and identity["head_sha"] == run["head_sha"]
                and identity["repository_id"] == run["repository"]["id"]
                and identity["head_repository_id"] == run["head_repository"]["id"],
                "artifact workflow run identity mismatch")
    files = archive_members(github(f'actions/artifacts/{artifact["id"]}/zip'), artifact["digest"][7:])
    raw = files["manifest.json"]
    manifest = read_manifest(raw)
    require(manifest["run_id"] == run_id and manifest["run_attempt"] == attempt
            and manifest["source_sha"] == run["head_sha"], "manifest/run identity mismatch")
    require(manifest["bundle"] == source_bundle(ROOT), "reviewed deployment bundle differs")
    receipt = files["receipt.json"]
    read_receipt(receipt, raw, "staging")
    deployment = read_deployment(files["deployment.json"], "staging")
    production_document = os.environ["AUDI_DOCUMENT"]
    require(matches(r"[a-z][a-z0-9-]{1,23}-deploy-production", production_document),
            "invalid production SSM document name")
    staging_document = production_document.removesuffix("production") + "staging"
    require(deployment["dispatch_sha"] == manifest["source_sha"]
            and deployment["instance_id"] == os.environ["AUDI_INSTANCE_ID"]
            and deployment["document"] == staging_document
            and deployment["document_version"] == os.environ["AUDI_STAGING_DOCUMENT_VERSION"]
            and deployment["document_hash"] == os.environ["AUDI_STAGING_DOCUMENT_SHA256"]
            and deployment["manifest_sha256"] == digest(raw)
            and deployment["receipt_sha256"] == digest(receipt), "staging invocation or approved document pin mismatch")
    return {
        "main_sha": main, "tree": tree, "manifest": manifest, "manifest_sha256": digest(raw),
        "artifact_id": artifact["id"], "archive_digest": artifact["digest"],
        "staging_receipt_sha256": digest(receipt), "staging_command_id": deployment["command_id"],
    }


def resolve(main):
    require(process(["git", "rev-parse", "HEAD"]).decode().strip() == main
            and process(["git", "rev-parse", "--is-shallow-repository"]).strip() == b"false",
            "promotion requires a full checkout of the dispatch commit")
    tree = process(["git", "rev-parse", f"{main}^{{tree}}"]).decode().strip()
    # Enumerate only ancestors of the reviewed commit, including the commit itself.
    history = process(["git", "log", "--format=%H:%T", "--no-show-signature", main]).decode().splitlines()
    equivalent = {sha for sha, ancestor_tree in (line.split(":") for line in history) if ancestor_tree == tree}
    staging = json.loads(github("branches/staging"))
    require(staging["protected"] is True, "staging must still be protected")
    workflow_id = json.loads(github(f"actions/workflows/{STAGING_WORKFLOW}"))["id"]
    require(type(workflow_id) is int and workflow_id > 0, "invalid staging workflow identity")
    selected = None
    for run in staged_runs(workflow_id):
        if (run["head_sha"] not in equivalent or run["status"] != "completed"
                or run["conclusion"] != "success" or not staging_jobs(run)):
            continue
        require(selected is None, "multiple eligible staging deployments match main; promotion is ambiguous")
        selected = staging_artifact(run, main, tree)
    require(selected is not None,
            "no eligible staging release in the last 30 days; merge a successful staged ancestor with the same tree")
    manifest = selected["manifest"]
    try:
        process(["docker", "buildx", "imagetools", "inspect", manifest["image"]])
    except subprocess.CalledProcessError:
        raise ValueError("verified staging digest is unavailable for anonymous pull") from None
    latest = json.loads(github(f'actions/runs/{manifest["run_id"]}'))
    require(run_identity(latest, workflow_id, "staging", "push")
            and latest["id"] == manifest["run_id"] and latest["run_attempt"] == manifest["run_attempt"]
            and latest["head_sha"] == manifest["source_sha"] and latest["status"] == "completed"
            and latest["conclusion"] == "success", "selected staging run changed or was rerun")
    return selected


def require_coverage(expires, now):
    require(now + PRODUCTION_VALIDITY_SECONDS <= expires,
            "production confirmation is too old for a full deployment; submit a fresh dispatch")


def select(output):
    main = require_main()
    expires = confirmation_expiry(main)
    require_coverage(expires, time.time())
    selected = resolve(main)
    branch_tip("main", main)
    require_coverage(expires, time.time())
    output.write_bytes(canonical(selected))
    manifest = selected["manifest"]
    summary(
        "## Selected Audi staging release\n"
        f'- [Staging run {manifest["run_id"]}, attempt {manifest["run_attempt"]}]'
        f'(https://github.com/{REPOSITORY}/actions/runs/{manifest["run_id"]})\n'
        f'- Main commit `{main}` and staged ancestor `{manifest["source_sha"]}` share tree `{selected["tree"]}`.\n'
        f'- Image `{manifest["image"]}`\n'
        f'- Artifact {selected["artifact_id"]}, archive digest `{selected["archive_digest"]}`\n'
        f'- Verified the required jobs, approved staging document pin, target-specific HTTPS receipt and anonymous digest access.\n'
        f'- Receipt SHA-256 `{selected["staging_receipt_sha256"]}`\n'
    )


def summary(message):
    with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as output:
        output.write(message + "\n")


def summarize(outcome, evidence):
    status = evidence / "status.json"
    message = f"## Audi production result\n- Dispatch step: **{outcome or 'skipped'}**\n"
    if status.exists():
        result = json.loads(status.read_bytes())
        message += f'- SSM command `{result["command_id"]}`, last observed status **{result["status"]}**\n'
    if (evidence / "deployment.json").exists():
        message += "- Production health, source SHA and target-specific HTTPS checks passed.\n"
    summary(message)


def dispatch(env, raw, output):
    if env == "production":
        main = require_main()
        confirmation_end = confirmation_expiry(main)
        require_coverage(confirmation_end, time.time())
        previous_selection = raw
        # The final full resolution runs below, after verifying the production SSM pin.
        raw = canonical(json.loads(raw)["manifest"])
    manifest = read_manifest(raw)
    require(manifest["bundle"] == source_bundle(ROOT), "checkout bundle mismatch")
    branch = "staging" if env == "staging" else "main"
    sha = os.environ["GITHUB_SHA"]
    require(os.environ["GITHUB_REPOSITORY"] == REPOSITORY
            and os.environ["GITHUB_REF"] == f"refs/heads/{branch}", "unexpected dispatch context")
    if env == "staging":
        require(os.environ["GITHUB_EVENT_NAME"] == "push"
                and manifest["source_sha"] == sha
                and manifest["run_id"] == positive(os.environ["GITHUB_RUN_ID"])
                and manifest["run_attempt"] == positive(os.environ["GITHUB_RUN_ATTEMPT"]),
                "staging dispatch/run mismatch")

    instance, name, version, sha256 = (os.environ[key] for key in (
        "AUDI_INSTANCE_ID", "AUDI_DOCUMENT", "AUDI_DOCUMENT_VERSION", "AUDI_DOCUMENT_SHA256",
    ))
    require(matches(r"i-[a-f0-9]{17}", instance)
            and matches(r"[a-z][a-z0-9-]{1,23}-deploy-" + env, name)
            and matches(r"[1-9][0-9]*", version) and matches(HASH, sha256), "invalid SSM pin")
    account = os.environ["AUDI_AWS_ACCOUNT_ID"]
    require(matches(r"[0-9]{12}", account), "invalid AWS account")
    doc = aws("describe-document", "--name", name, "--document-version", version)["Document"]
    require((doc["Owner"], doc["Name"], doc["DocumentVersion"], doc["HashType"], doc["Hash"],
             doc["Status"], doc["DocumentType"]) ==
            (account, name, version, "Sha256", sha256, "Active", "Command"), "SSM document pin mismatch")
    if env == "production":
        selected = resolve(main)
        require(canonical(selected) == previous_selection,
                "staging release or artifact changed after credential acquisition")
        require(confirmation_expiry(main) == confirmation_end, "production confirmation changed")
    branch_tip(branch, sha)
    payload = raw
    if env == "production":
        now = time.time()
        require_coverage(confirmation_end, now)
        payload = production_request(raw, int(now))
    request = {
        "DocumentName": name, "DocumentVersion": version, "DocumentHash": sha256,
        "DocumentHashType": "Sha256", "InstanceIds": [instance], "TimeoutSeconds": SSM_DELIVERY_SECONDS,
        "Parameters": {"Manifest": [base64.b64encode(payload).decode()]},
        "Comment": f"Audi {env} GitHub run {os.environ['GITHUB_RUN_ID']}",
    }
    output.mkdir(exist_ok=True)
    # A transport failure can occur after AWS accepts the request; do not retry SendCommand.
    os.environ["AWS_MAX_ATTEMPTS"] = "1"
    response = aws("send-command", "--cli-input-json", json.dumps(request))["Command"]
    command_id = response["CommandId"]
    require(str(uuid.UUID(command_id)) == command_id, "invalid command ID")
    print(f"SSM command {command_id}", flush=True)
    diagnostic = {
        "environment": env, "command_id": command_id, "instance_id": instance, "document": name,
        "document_version": version, "document_hash": sha256, "dispatch_sha": sha,
        "manifest_sha256": digest(raw), "status": "Dispatched",
    }
    status_path = output / "status.json"
    status_path.write_bytes(canonical(diagnostic))
    deadline = time.monotonic() + 590
    while time.monotonic() < deadline:
        try:
            invocation = aws("get-command-invocation", "--command-id", command_id,
                             "--instance-id", instance, "--plugin-name", "deployAudi")
        except subprocess.CalledProcessError as error:
            if b"InvocationDoesNotExist" not in error.stderr:
                raise
            time.sleep(5)
            continue
        require((invocation["CommandId"], invocation["InstanceId"], invocation["DocumentName"],
                 invocation["DocumentVersion"]) == (command_id, instance, name, version)
                and invocation["PluginName"] in ("deployAudi", "aws:runShellScript"),
                "unexpected SSM invocation")
        status = invocation["Status"]
        diagnostic["status"] = status
        diagnostic["response_code"] = invocation["ResponseCode"]
        status_path.write_bytes(canonical(diagnostic))
        if status in ("Pending", "InProgress", "Delayed", "Cancelling"):
            time.sleep(5)
            continue
        require(status == "Success" and invocation["ResponseCode"] == 0, f"SSM returned {status}")
        receipt = invocation["StandardOutputContent"].encode().rstrip(b"\r\n") + b"\n"
        read_receipt(receipt, raw, env)
        result = {key: value for key, value in diagnostic.items() if key != "response_code"}
        result["receipt_sha256"] = digest(receipt)
        (output / "manifest.json").write_bytes(raw)
        (output / "receipt.json").write_bytes(receipt)
        if env == "production":
            (output / "selection.json").write_bytes(previous_selection)
        (output / "deployment.json").write_bytes(canonical(result))
        return
    raise ValueError("SSM observation timed out; inspect command and shared host state before retrying")


if __name__ == "__main__":
    try:
        verb, *args = sys.argv[1:]
        if verb == "create" and len(args) == 2:
            create(args[0], Path(args[1]))
        elif verb == "select" and len(args) == 1:
            select(Path(args[0]))
        elif verb == "summarize" and len(args) == 2:
            summarize(args[0], Path(args[1]))
        elif verb == "dispatch" and len(args) == 3 and args[0] in ROUTES:
            dispatch(args[0], Path(args[1]).read_bytes(), Path(args[2]))
        else:
            raise ValueError("invalid release command")
    except subprocess.CalledProcessError as error:
        # CLI output may include other command invocations. Publish only the command category.
        sys.exit(f"Audi release failed during {error.cmd[0]} (exit {error.returncode})")
    except (ValueError, OSError, KeyError, TypeError, subprocess.TimeoutExpired, zipfile.BadZipFile) as error:
        sys.exit(f"Audi release failed: {error}")
