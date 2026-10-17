#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/dexter1/player mousic ss"
cd "$PROJECT_DIR"

cleanup() {
  if [[ -n "${VITE_PID:-}" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  if [[ -n "${ELECTRON_PID:-}" ]]; then
    kill "$ELECTRON_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

npm run dev -- --host 127.0.0.1 &
VITE_PID=$!

npm run dev:electron &
ELECTRON_PID=$!

wait "$ELECTRON_PID"
cleanup
