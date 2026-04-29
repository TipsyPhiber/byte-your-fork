#!/usr/bin/env bash
# Run schema migrations against the containerized postgres.
# Optional: pass a path to a pg_dump .sql file as $1 to restore data first.
#
# When a backup is given, drops & recreates the target database to ensure a
# clean slate, restores the dump, then runs migrations (which become a no-op
# if the dump already has all of them applied).

set -euo pipefail
cd "$(dirname "$0")"

if ! docker compose ps --status running --services | grep -q '^backend$'; then
  echo "Backend container is not running. Run ./test-docker.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [ "${1:-}" != "" ]; then
  BACKUP="$1"
  if [ ! -f "$BACKUP" ]; then
    echo "Backup file not found: $BACKUP" >&2
    exit 1
  fi

  echo "==> Stopping backend so it doesn't hold connections during DB recreate"
  docker compose stop backend

  echo "==> Dropping and recreating database '$DB_NAME'"
  docker compose exec -T postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE);"
  docker compose exec -T postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

  echo "==> Restoring data from $BACKUP"
  docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP" > /tmp/restore.log 2>&1 || true
  echo "    Restore log tail:"
  tail -n 10 /tmp/restore.log

  echo "==> Restarting backend"
  docker compose up -d backend
  sleep 4
fi

echo "==> Running migrations (npm run migrate inside backend container)"
docker compose exec backend npm run migrate

echo
echo "==> Verifying with curl"
curl -s http://localhost:5000/api/recipes | head -c 500
echo
