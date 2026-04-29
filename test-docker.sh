#!/usr/bin/env bash
# Local Docker stack test: regenerates lockfiles, builds images, brings up the
# stack, prints status and endpoint checks. Run from the repo root.

set -euo pipefail
cd "$(dirname "$0")"

echo "==> Ensuring .env exists"
if [ ! -f .env ]; then
  cat > .env <<'EOF'
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=byte_your_fork
IMAGE_REPO=local
EOF
  echo "Created .env"
else
  grep -q '^IMAGE_REPO=' .env || echo 'IMAGE_REPO=local' >> .env
fi

echo "==> Regenerating frontend lockfile"
( cd frontend && npm install --silent )

echo "==> Regenerating backend lockfile"
( cd backend && npm install --silent )

echo "==> Stopping host postgres (so :5432 is free for the container)"
sudo systemctl stop postgresql 2>/dev/null || true

echo "==> Tearing down any prior stack"
docker compose down --remove-orphans 2>/dev/null || true

echo "==> Building images"
docker compose build

echo "==> Starting stack"
docker compose up -d

echo "==> Waiting 5s for services to settle"
sleep 5

echo
echo "==> docker compose ps"
docker compose ps

echo
echo "==> backend logs (last 30)"
docker compose logs backend --tail 30 || true

echo
echo "==> postgres logs (last 10)"
docker compose logs postgres --tail 10 || true

echo
echo "==> curl frontend (http://localhost:8080)"
curl -sI http://localhost:8080 | head -n 3 || echo "frontend not reachable"

echo
echo "==> curl backend (http://localhost:5000/api/recipes)"
curl -s http://localhost:5000/api/recipes | head -c 500 || echo "backend not reachable"
echo

echo
echo "==> Done. To stop the stack: docker compose down"
