#!/usr/bin/env bash
# Dump the host postgres (byte_your_fork), then run migrations against the
# containerized postgres and restore the data into it.
#
# Handles the port :5432 conflict by toggling between host pg and the
# containerized pg.

set -euo pipefail
cd "$(dirname "$0")"

BACKUP="$HOME/byteyourfork-backup.sql"
HOST_DB_NAME="byte_your_fork"

echo "==> Stopping containerized postgres (frees :5432 for host pg)"
docker compose stop postgres backend

echo "==> Starting host postgres"
sudo systemctl start postgresql

echo "==> Waiting for host postgres to accept connections"
for i in {1..15}; do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Dumping host database '$HOST_DB_NAME' to $BACKUP"
sudo -u postgres pg_dump "$HOST_DB_NAME" > "$BACKUP"
echo "    Wrote $(wc -c < "$BACKUP") bytes"

echo "==> Stopping host postgres (frees :5432 for the container)"
sudo systemctl stop postgresql

echo "==> Bringing the stack back up"
docker compose up -d
echo "==> Waiting 5s for postgres healthcheck"
sleep 5

echo "==> Running migrations + restoring data"
./migrate-db.sh "$BACKUP"

echo
echo "==> Done. Open http://localhost:8080 to verify."
