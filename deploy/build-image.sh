#!/bin/sh
# Run with: sh deploy/build-image.sh audi/frontend
set -eu

if [ "$#" -ne 1 ]; then
    echo "Usage: sh deploy/build-image.sh IMAGE_PREFIX" >&2
    exit 1
fi
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
    echo "Refusing a release build from a dirty checkout. Commit the intended changes first." >&2
    exit 1
fi
revision=$(git rev-parse --verify HEAD)
if [ "${#revision}" -ne 40 ]; then
    echo "Expected a full 40-character Git SHA." >&2
    exit 1
fi
image="$1:$revision"
docker info >/dev/null
if docker image inspect "$image" >/dev/null 2>&1; then
    recorded=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")
    if [ "$recorded" != "$revision" ]; then
        echo "Existing image has the wrong revision label: $image" >&2
        exit 1
    fi
    echo "Reusing existing image; no rebuild: $image"
    exit 0
fi
# Build only committed files, even if ignored local files exist in src/public.
context=$(mktemp "${TMPDIR:-/tmp}/audi-build-context.XXXXXX")
trap 'rm -f "$context"' EXIT
trap 'exit 1' HUP INT TERM
git archive --format=tar --output="$context" "$revision"
docker build --build-arg "VCS_REF=$revision" --tag "$image" - < "$context"
docker image inspect --format '{{.Id}}' "$image"
