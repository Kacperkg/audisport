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
from datetime import datetime, timezone
from pathlib import Path

from manifest import (
    HASH, IMAGE, REPOSITORY, ROUTES, SHA, canonical, digest, matches, read_manifest,
    require, source_bundle,
)

ROOT = Path(__file__).resolve().parents[1]
STAGING_WORKFLOW = "release-staging.yml"
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


def require_main(expected):
    require(matches(SHA, expected) and os.environ["GITHUB_SHA"] == expected
            and os.environ["GITHUB_REPOSITORY"] == REPOSITORY
            and os.environ["GITHUB_REF"] == "refs/heads/main"
            and os.environ["GITHUB_EVENT_NAME"] == "workflow_dispatch",
            "dispatch must use the exact expected main SHA")
    branch_tip("main", expected)


def select(run_id, attempt, expected, output):
    require_main(expected)
    run = json.loads(github(f"actions/runs/{run_id}"))
    workflow = json.loads(github(f"actions/workflows/{STAGING_WORKFLOW}"))
    require(run["id"] == run_id and run["workflow_id"] == workflow["id"]
            and run["event"] == "push" and run["head_branch"] == "staging"
            and run["run_attempt"] == attempt and run["status"] == "completed"
            and run["conclusion"] == "success"
            and run["head_repository"]["full_name"] == REPOSITORY
            and run["repository"]["full_name"] == REPOSITORY, "ineligible staging run")
    name = artifact_name(run_id, attempt)
    artifacts = json.loads(github(f"actions/runs/{run_id}/artifacts?name={name}"))
    require(artifacts["total_count"] == 1 and len(artifacts["artifacts"]) == 1,
            "exact staged artifact required")
    artifact = artifacts["artifacts"][0]
    require(artifact["name"] == name and artifact["expired"] is False
            and 0 < artifact["size_in_bytes"] <= 65536
            and matches("sha256:" + HASH, artifact.get("digest")), "invalid artifact metadata")
    files = archive_members(github(f'actions/artifacts/{artifact["id"]}/zip'), artifact["digest"][7:])
    raw = files["manifest.json"]
    manifest = read_manifest(raw)
    require(manifest["run_id"] == run_id and manifest["run_attempt"] == attempt
            and manifest["source_sha"] == run["head_sha"], "manifest/run identity mismatch")
    receipt = files["receipt.json"]
    read_receipt(receipt, raw, "staging")
    deployment = read_deployment(files["deployment.json"], "staging")
    require(deployment["dispatch_sha"] == manifest["source_sha"]
            and deployment["instance_id"] == os.environ["AUDI_INSTANCE_ID"]
            and deployment["manifest_sha256"] == digest(raw)
            and deployment["receipt_sha256"] == digest(receipt), "staging invocation mismatch")
    source = manifest["source_sha"]
    process(["git", "merge-base", "--is-ancestor", source, expected])
    require(process(["git", "rev-parse", f"{source}^{{tree}}"]) ==
            process(["git", "rev-parse", f"{expected}^{{tree}}"]), "main and staging trees differ")
    require(manifest["bundle"] == source_bundle(ROOT), "reviewed deployment bundle differs")
    output.write_bytes(raw)


def require_window():
    end = datetime.strptime(os.environ["WINDOW_END_UTC"], "%Y-%m-%dT%H:%M:%SZ")
    remaining = (end.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
    require(540 <= remaining <= 3600, "production requires a maintenance window ending in 9–60 minutes")


def dispatch(env, raw, output):
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
    else:
        require_main(os.environ["EXPECTED_MAIN_SHA"])

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
    branch_tip(branch, sha)
    if env == "production":
        require_window()
    request = {
        "DocumentName": name, "DocumentVersion": version, "DocumentHash": sha256,
        "DocumentHashType": "Sha256", "InstanceIds": [instance], "TimeoutSeconds": 90,
        "Parameters": {"Manifest": [base64.b64encode(raw).decode()]},
        "Comment": f"Audi {env} GitHub run {os.environ['GITHUB_RUN_ID']}",
    }
    output.mkdir(exist_ok=True)
    # A transport failure can occur after AWS accepts the request; do not retry SendCommand.
    os.environ["AWS_MAX_ATTEMPTS"] = "1"
    response = aws("send-command", "--cli-input-json", json.dumps(request))["Command"]
    command_id = response["CommandId"]
    require(str(uuid.UUID(command_id)) == command_id, "invalid command ID")
    print(f"SSM command {command_id} targeting {instance}", flush=True)
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
        (output / "deployment.json").write_bytes(canonical(result))
        return
    raise ValueError("SSM observation timed out; inspect command and shared host state before retrying")


if __name__ == "__main__":
    try:
        verb, *args = sys.argv[1:]
        if verb == "create" and len(args) == 2:
            create(args[0], Path(args[1]))
        elif verb == "select" and len(args) == 4:
            select(positive(args[0]), positive(args[1]), args[2], Path(args[3]))
        elif verb == "dispatch" and len(args) == 3 and args[0] in ROUTES:
            dispatch(args[0], Path(args[1]).read_bytes(), Path(args[2]))
        else:
            raise ValueError("invalid release command")
    except subprocess.CalledProcessError as error:
        # CLI output may include other command invocations. Publish only the command category.
        sys.exit(f"Audi release failed during {error.cmd[0]} (exit {error.returncode})")
    except (ValueError, OSError, KeyError, TypeError, subprocess.TimeoutExpired, zipfile.BadZipFile) as error:
        sys.exit(f"Audi release failed: {error}")
