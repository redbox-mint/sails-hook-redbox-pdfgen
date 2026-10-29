#!/usr/bin/env bash
set -euo pipefail
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo=$(cd -- "$here/../.." && pwd)
mode=${1:-all}
case "$mode" in unit|browser|all|pack) ;; *) echo 'Usage: run-uts.sh [unit|browser|all|pack]' >&2; exit 2 ;; esac
image='nexus-prod.redboxresearchdata.com.au:25443/uts-redbox-portal@sha256:7ad9046248bdb16ec54d473a60a4a6a96ed7ee7f1d384c2890df1a1f89b784b0'
artifacts="$repo/support/.tmp/pdf-hotfix"
mkdir -p "$artifacts"
name="pdfgen-hotfix-${UID}-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
# Compile and test local source using UTS's packaged dependencies. Never lift Sails.
timeout --signal=TERM --kill-after=5s 90s docker run --rm --init --name "$name" \
  --network none --memory 1200m --memory-swap 1200m --cpus 1 --pids-limit 256 \
  --cap-drop ALL --read-only --user "$(id -u):$(id -g)" \
  --tmpfs /tmp:rw,nosuid,size=256m,mode=1777 \
  --env HOME=/tmp --env XDG_CONFIG_HOME=/tmp/config --env XDG_CACHE_HOME=/tmp/cache \
  --env NODE_PATH=/opt/redbox-portal/node_modules \
  --env "PDFGEN_LAUNCH_TIMEOUT_MS=${PDFGEN_LAUNCH_TIMEOUT_MS:-100}" \
  --env "PDFGEN_LAUNCH_REPEATS=${PDFGEN_LAUNCH_REPEATS:-20}" \
  --entrypoint node \
  --mount "type=bind,src=$repo,dst=/source,readonly" \
  --mount "type=bind,src=$artifacts,dst=/artifacts" \
  "$image" /source/support/testing/run-in-container.cjs "$mode"
