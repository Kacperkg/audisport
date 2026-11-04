#!/usr/bin/env bash
set -euo pipefail

image=$1
revision=$2
[[ $revision =~ ^[a-f0-9]{40}$ ]]
test "$(docker image inspect --format '{{.Config.User}} {{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")" = "101:101 $revision"
container=$(docker run --detach --rm --network none --hostname audi-ci-frontend --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,uid=101,gid=101,mode=1770 "$image")
trap 'docker rm -f "$container" >/dev/null' EXIT

for ((attempt = 0; attempt < 30; attempt++)); do
  if docker exec "$container" wget -qO /dev/null http://127.0.0.1:8080/healthz; then
    break
  fi
  sleep 1
done

test "$(docker exec "$container" wget -qO- http://127.0.0.1:8080/healthz)" = ok
test "$(docker exec "$container" wget -qO- http://127.0.0.1:8080/release-sha.txt)" = "$revision"
test "$(docker exec "$container" wget -qO- http://127.0.0.1:8080/deployment-target)" = audi-ci-frontend
docker exec "$container" wget -qO /dev/null http://127.0.0.1:8080/story/quattro
