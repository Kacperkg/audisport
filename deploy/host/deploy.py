"""Run only via the fixed-purpose SSM document with protected installed assets."""
import base64
import hashlib
import os
import stat
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

ASSETS = Path("/usr/local/lib/audi-cd")
STATE = Path("/var/lib/audi-cd")
SHARED_STATE = Path("/var/lib/vellum-cd")
COORDINATOR = Path("/usr/local/lib/vellum-cd/cd/coordination.py")
COORDINATOR_SHA = "1f680d00faf1a02ddb25f3810a07892595c073aa5afaa61329f6efe0af52d101"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def protected(path, directory=False, private=False):
    for parent in reversed(path.parents):
        info = parent.lstat()
        require(stat.S_ISDIR(info.st_mode) and info.st_uid == 0 and not info.st_mode & 0o022,
                "unsafe installed parent")
    info = path.lstat()
    require(info.st_uid == 0 and not info.st_mode & (0o077 if private else 0o022)
            and (stat.S_ISDIR(info.st_mode) if directory
                 else stat.S_ISREG(info.st_mode) and info.st_nlink == 1), "unsafe installed asset")
    return path


def module(name, source):
    result = ModuleType(name)
    exec(compile(source, name, "exec"), result.__dict__)
    return result


def persist(path, data):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as output:
        output.write(data)
        output.flush()
        os.fsync(output.fileno())
    os.replace(output.name, path)
    fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def command(argv, env, phase, timeout=45):
    try:
        return subprocess.run(argv, env=env, cwd=ASSETS, timeout=timeout, check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    except (subprocess.SubprocessError, OSError):
        raise ValueError(phase + " failed; inspect target privately under the shared locks") from None


@contextmanager
def guarded_operation(coordinator, target):
    # Benign preflight failures can release the marker cleanly. Cancellation and
    # anything after a durable attempt record keep it for operator recovery.
    safe_error = None
    mutation = False

    def start():
        nonlocal mutation
        mutation = True

    with coordinator.operation(SHARED_STATE, "deployment", target):
        try:
            yield start
        except (ValueError, OSError) as error:
            if mutation:
                raise
            safe_error = error
    if safe_error is not None:
        raise safe_error


def deploy(target, encoded):
    require(os.geteuid() == 0 and target in ("staging", "production"), "invalid host or target")
    require(0 < len(encoded) <= 4096, "missing or oversized SSM manifest")
    protected(ASSETS, directory=True)
    protected(STATE, directory=True, private=True)
    docker_config = protected(STATE / "docker-config", directory=True, private=True)
    require(not any(docker_config.iterdir()), "Docker config directory must be empty")
    files = {name: protected(ASSETS / name).read_bytes()
             for name in ("deploy.py", "manifest.py", "compose.yml")}
    wire = module("audi_manifest", files["manifest.py"])
    raw = base64.b64decode(encoded, validate=True)
    manifest = wire.read_manifest(raw)
    require(manifest["bundle"] == {name: wire.digest(data) for name, data in files.items()},
            "installed bundle does not match the release")
    coordinator = protected(COORDINATOR).read_bytes()
    require(hashlib.sha256(coordinator).hexdigest() == COORDINATOR_SHA,
            "unreviewed shared coordination version")
    coordination = module("vellum_coordination", coordinator)
    project = "audi-" + target
    image = manifest["image"]
    source = manifest["source_sha"]
    env = {
        "PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "HOME": str(STATE),
        "DOCKER_CONFIG": str(docker_config), "AUDI_PROJECT": project, "AUDI_IMAGE": image,
    }
    docker = ["/usr/bin/docker", "--host", "unix:///var/run/docker.sock"]
    compose = docker + ["compose", "--env-file", "/dev/null", "-f", str(ASSETS / "compose.yml"),
                        "--project-name", project]
    name = project + "-frontend-1"
    stem = f'{target}-{manifest["run_id"]}-{manifest["run_attempt"]}'
    pending, receipt = (STATE / (stem + suffix) for suffix in (".attempt.json", ".receipt.json"))

    with guarded_operation(coordination, target) as start:
        require(not os.path.lexists(pending) and not os.path.lexists(receipt),
                "release already attempted for this environment")
        command(compose + ["config", "--quiet"], env, "Compose validation")
        command(docker + ["network", "inspect", "web", "--format", "{{.Name}}"], env, "network lookup")
        # This migration expects the known existing Audi project and container.
        labels = '{{index .Config.Labels "com.docker.compose.project"}} {{index .Config.Labels "com.docker.compose.service"}} {{.Image}}'
        previous = command(docker + ["inspect", "--type", "container", "--format", labels, name],
                           env, "existing container lookup").decode().split()
        require(len(previous) == 3 and previous[:2] == [project, "frontend"]
                and wire.matches("sha256:" + wire.HASH, previous[2]), "unexpected container ownership")
        attempt = {
            "environment": target, "manifest_sha256": wire.digest(raw),
            "previous_image_id": previous[2], "image": image, "source_sha": source,
        }
        start()
        persist(pending, wire.canonical(attempt))
        command(docker + ["pull", "--platform", "linux/amd64", image], env, "digest pull", 120)
        fmt = '{{.Id}} {{index .Config.Labels "org.opencontainers.image.revision"}} {{.Os}}/{{.Architecture}}'
        pulled = command(docker + ["image", "inspect", "--format", fmt, image],
                         env, "image identity").decode().split()
        require(len(pulled) == 3 and wire.matches("sha256:" + wire.HASH, pulled[0])
                and pulled[1:] == [source, "linux/amd64"], "image provenance label or platform mismatch")
        command(compose + ["up", "-d", "--no-deps", "--no-build", "--pull", "never",
                           "--wait", "--wait-timeout", "100", "frontend"], env, "target replacement", 130)
        actual = command(docker + ["inspect", "--type", "container", "--format",
                                   "{{.Image}} {{.State.Health.Status}}", name], env, "container health")
        require(actual.decode().split() == [pulled[0], "healthy"], "target image or health mismatch")
        origin = "https://" + wire.ROUTES[target]
        curl = ["/usr/bin/curl", "--disable", "--fail", "--silent", "--show-error",
                "--proto", "=https", "--noproxy", "*", "--max-time", "12",
                "--max-filesize", "128", "--write-out", "\n%{http_code}"]
        for path, expected in (
            ("/healthz", b"ok"), ("/release-sha.txt", source.encode()),
            ("/deployment-target", (project + "-frontend").encode()),
        ):
            response = command(curl + [origin + path], env, "public HTTPS smoke")
            body, _, status = response.rpartition(b"\n")
            require(status == b"200" and body.strip() == expected, "public HTTPS release mismatch")
        result = dict(attempt, image_id=pulled[0], status="healthy", public_origin=origin,
                      completed_at=datetime.now(timezone.utc).isoformat())
        persist(receipt, wire.canonical(result))
    print(wire.canonical(result).decode(), end="", flush=True)


if __name__ == "__main__":
    try:
        require(len(sys.argv) == 2, "missing fixed environment")
        deploy(sys.argv[1], os.environ.get("SSM_Manifest", ""))
    except (ValueError, OSError, KeyError) as error:
        # OS errors can include deployment paths but no resolved configuration.
        print(f"Audi deployment failed: {error}", file=sys.stderr)
        sys.exit(1)
