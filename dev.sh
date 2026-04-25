#!/usr/bin/env bash
# Starts backend (node server.js) and frontend (vite dev) together.
# Streams both logs with [backend]/[frontend] prefixes. Ctrl+C stops both.

set -euo pipefail
cd "$(dirname "$0")"

cleanup() {
  echo
  echo "Shutting down..."
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd backend  && node server.js   2>&1 | sed -u 's/^/[backend]  /') &
(cd frontend && npm run dev      2>&1 | sed -u 's/^/[frontend] /') &

wait
