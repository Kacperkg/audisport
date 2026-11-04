"""Audi release wire format shared by CI and the host."""
import hashlib
import json
import re
from pathlib import Path

REPOSITORY = "Kacperkg/audisport"
IMAGE = "ghcr.io/" + REPOSITORY.lower() + "-frontend"
SHA = r"[0-9a-f]{40}"
HASH = r"[0-9a-f]{64}"
# SSM gives the command 90 seconds to arrive and its step 420 seconds to run.
SSM_DELIVERY_SECONDS = 90
SSM_EXECUTION_SECONDS = 420
PRODUCTION_VALIDITY_SECONDS = SSM_DELIVERY_SECONDS + SSM_EXECUTION_SECONDS
BUNDLE = ("deploy.py", "manifest.py", "compose.yml")
ROUTES = {
    "staging": "staging.audisport.kacpergajdarski.com",
    "production": "audisport.kacpergajdarski.com",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def matches(pattern, value):
    return isinstance(value, str) and re.fullmatch(pattern, value) is not None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def read_manifest(data):
    value = json.loads(data)
    require(isinstance(value, dict) and set(value) == {
        "schema", "repository", "source_sha", "run_id", "run_attempt", "image", "bundle",
    }, "invalid manifest fields")
    require(canonical(value) == data, "manifest must be canonical JSON")
    require(type(value["schema"]) is int and value["schema"] == 1, "invalid manifest schema")
    require(value["repository"] == REPOSITORY, "unexpected repository")
    require(matches(SHA, value["source_sha"]), "invalid source SHA")
    require(all(type(value[key]) is int and 0 < value[key] < 10**18
                for key in ("run_id", "run_attempt")), "invalid run identity")
    require(matches(re.escape(IMAGE) + "@sha256:" + HASH, value["image"]), "unexpected image")
    require(isinstance(value["bundle"], dict) and set(value["bundle"]) == set(BUNDLE)
            and all(matches(HASH, value["bundle"][name]) for name in BUNDLE), "invalid bundle")
    return value


def source_bundle(checkout):
    deploy = Path(checkout) / "deploy"
    files = (deploy / "host/deploy.py", deploy / "manifest.py", deploy / "host/compose.yml")
    return {name: digest(path.read_bytes()) for name, path in zip(BUNDLE, files)}


def production_request(raw, issued_at):
    return canonical({
        "manifest": read_manifest(raw),
        "issued_at": issued_at,
        "expires_at": issued_at + PRODUCTION_VALIDITY_SECONDS,
    })


def require_production_time(issued_at, expires_at, now):
    require(type(issued_at) is int and type(expires_at) is int
            and expires_at - issued_at == PRODUCTION_VALIDITY_SECONDS,
            "invalid production validity interval")
    require(issued_at <= now and now + SSM_EXECUTION_SECONDS <= expires_at,
            "production request is early or expired for safe execution")


def read_production_request(data, now):
    value = json.loads(data)
    require(isinstance(value, dict) and set(value) == {"manifest", "issued_at", "expires_at"}
            and canonical(value) == data, "invalid production request")
    issued_at, expires_at = value["issued_at"], value["expires_at"]
    require_production_time(issued_at, expires_at, now)
    return canonical(value["manifest"]), issued_at, expires_at
