#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/build/agent"

GO_BIN="${GO_BIN:-go}"
GOOS="${GOOS:-linux}"
GOARCH="${GOARCH:-amd64}"
OUTPUT="${OUT_DIR}/vm-agent-${GOOS}-${GOARCH}"

mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}/agent"
CGO_ENABLED=0 GOOS="${GOOS}" GOARCH="${GOARCH}" "${GO_BIN}" build -trimpath -ldflags="-s -w" -o "${OUTPUT}" ./cmd/vm-agent

chmod +x "${OUTPUT}"
echo "${OUTPUT}"
