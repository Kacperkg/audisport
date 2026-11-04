#!/usr/bin/env bash
set -euo pipefail

version=0.76.1
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    platform=Linux-64bit
    checksum=c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0
    ;;
  Darwin-arm64)
    platform=macOS-ARM64
    checksum=11a9b6cd2752011b54f01ea4bd0dbfa9f0c41dc6538d5a3f9d23955f471bf4e5
    ;;
  *)
    echo 'Run the pinned Trivy scanner on Linux x86_64 or macOS ARM64.' >&2
    exit 1
    ;;
esac

directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT
archive="trivy_${version}_${platform}.tar.gz"
curl --fail --silent --show-error --location --max-time 120 \
  "https://github.com/aquasecurity/trivy/releases/download/v${version}/${archive}" \
  --output "$directory/$archive"
printf '%s  %s\n' "$checksum" "$directory/$archive" | shasum -a 256 --check
tar -xzf "$directory/$archive" -C "$directory" trivy
"$directory/trivy" "$@"
