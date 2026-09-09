#!/usr/bin/env bash
set -euo pipefail
revision=e7fd535d73bd58d83fd9449accffd4dac43e1ba9
destination=${1:-/opt/deepnec-downloads}
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
git clone --no-checkout https://github.com/usubioinfo/deepnec-2.0.git "$work/repo"
git -C "$work/repo" checkout --detach "$revision"
mkdir -p "$destination"
git -C "$work/repo" archive --format=tar.gz --prefix=deepnec-2.0/ --output="$destination/deepnec-2.0-standalone.tar.gz" "$revision"
printf '%s\n' "$revision" > "$destination/REVISION.txt"
(cd "$destination" && sha256sum deepnec-2.0-standalone.tar.gz > SHA256SUMS)
