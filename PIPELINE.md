# CI/CD Pipeline

This document describes how code gets from a pull request to the production VM.

## Overview

```
PR opened ──► CI workflow (lint, build, docker build)
                        │
                        ▼
Merge to main ──► Deploy workflow
                        │
                        ├── 1. CI re-run (reused via workflow_call)
                        ├── 2. Build & push images to GHCR
                        └── 3. SSH to VM, pull, restart compose stack
```

Two GitHub Actions workflows drive the pipeline:

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | Pull requests, or called by deploy | Verify the change builds cleanly |
| `.github/workflows/deploy.yml` | Push to `main` | Build production images and deploy to the VM |

---

## 1. CI workflow (`ci.yml`)

Runs on every pull request and is reused as the first stage of the deploy workflow.

It has two parallel jobs:

**`lint-frontend`**
1. Checkout the repo.
2. Set up Node 20 with npm cache keyed on `frontend/package-lock.json`.
3. `npm install` in `frontend/`.
4. `npm run lint`.
5. `npm run build` (Vite build) — proves the frontend compiles.

**`docker-build`**
1. Checkout the repo.
2. Set up Docker Buildx.
3. Build the backend image from `./backend` (no push).
4. Build the frontend image from `./frontend` (no push).

Both Docker builds use GitHub Actions cache (`type=gha`) with separate scopes (`backend`, `frontend`) so layers carry over between runs.

**Goal:** fast feedback that linting passes, the frontend bundles, and both Docker images build. Nothing is pushed or deployed at this stage.

---

## 2. Deploy workflow (`deploy.yml`)

Triggered by a push to `main`. Three jobs run in sequence:

### Job 1 — `ci`
Calls `ci.yml` via `workflow_call`. The deploy is gated on CI passing — if lint or the Docker builds fail, deploy stops here.

### Job 2 — `build-and-push`
Needs: `ci`.

1. Checkout, set up QEMU and Buildx (QEMU enables the arm64 cross-build).
2. Compute the image repo name: `ghcr.io/<owner-lowercased>/byteyourfork`.
3. Log in to GitHub Container Registry (GHCR) using the workflow's built-in `GITHUB_TOKEN`.
4. Build and push the **backend** image for `linux/amd64` and `linux/arm64`, tagged:
   - `…-backend:latest`
   - `…-backend:<commit-sha>`
5. Build and push the **frontend** image with the same two tags.

Both builds reuse the GHA cache scopes from CI, so the production build doesn't redo work the CI build already did.

The job exposes `image_repo` as an output for the next job.

### Job 3 — `deploy`
Needs: `build-and-push`.

SSHes into the production VM (host, user, and key come from repo secrets `VM_HOST`, `VM_USER`, `VM_SSH_KEY`) and runs:

```bash
cd ~/ByteYourFork
git pull origin main
export IMAGE_REPO IMAGE_TAG                          # IMAGE_TAG = commit SHA
docker compose pull                                   # fetch the new images from GHCR
docker compose run --rm backend node migrate.js      # apply any new SQL migrations
docker compose up -d --remove-orphans
docker image prune -f                                 # reclaim disk
```

The migration step uses `backend/migrate.js`, which records applied files in a `schema_migrations` table — it's idempotent, so running on every deploy is safe. `compose run` respects `depends_on`, so it brings postgres up (waiting on its healthcheck) before executing the script. Because `set -e` is in effect, a failed migration halts the deploy *before* the new backend container starts, so prod stays on the old version rather than booting against a half-migrated schema.

> **Note on migration safety:** the previous backend container is still serving traffic during this step. Write migrations to be backwards-compatible with the currently-running version (additive changes; defer destructive drops to a follow-up deploy). The pipeline doesn't enforce this — it's an authoring discipline.

The compose file uses `${IMAGE_REPO}-backend:${IMAGE_TAG:-latest}` and the same for frontend, so the SHA-pinned tag is what actually gets deployed. Pinning to the SHA makes rollbacks deterministic — re-running the deploy with an older SHA pulls the exact prior image.

---

## Runtime layout (on the VM)

`docker-compose.yml` defines three services on a private bridge network:

| Service | Image | Host port | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `127.0.0.1:5432` | Healthcheck via `pg_isready`; data in named volume `postgres_data` |
| `backend` | `${IMAGE_REPO}-backend` | `127.0.0.1:5000` | Waits for postgres healthcheck; mounts `./backend/uploads` for user uploads |
| `frontend` | `${IMAGE_REPO}-frontend` | `127.0.0.1:8080` | Nginx serving the built Vite bundle |

All ports bind to `127.0.0.1` only — public traffic is fronted by the host's nginx (`nginx.conf` in the repo root), which terminates TLS and reverse-proxies to those local ports.

### Image build details

- **Backend** (`backend/Dockerfile`): single-stage `node:20-bookworm-slim`, installs production deps only (`npm install --omit=dev`), runs `node server.js`.
- **Frontend** (`frontend/Dockerfile`): multi-stage — Node builds the Vite bundle, then `nginx:alpine` serves the static `dist/` with the project's `nginx.conf`.

### Dev overlay
`docker-compose.dev.yml` is a separate overlay used locally to run the backend under `node --watch` with the source mounted. It is not used by the deploy pipeline.

---

## Secrets and configuration

| Secret | Used by | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | `build-and-push` | Auto-provided; pushes images to GHCR |
| `VM_HOST` | `deploy` | SSH target |
| `VM_USER` | `deploy` | SSH user |
| `VM_SSH_KEY` | `deploy` | SSH private key |

Application config (DB credentials, JWT secret, mail creds, etc.) lives in `backend/.env` on the VM and is loaded via `env_file` in compose. It is not managed by the pipeline.

---

## Common operations

**Roll back to a previous commit**
On the VM:
```bash
cd ~/ByteYourFork
export IMAGE_REPO=ghcr.io/<owner>/byteyourfork
export IMAGE_TAG=<old-sha>
docker compose pull
docker compose up -d
```

**Trigger a deploy without code changes**
Push an empty commit to `main`:
```bash
git commit --allow-empty -m "redeploy"
git push origin main
```

**Run CI locally before pushing**
```bash
# frontend
cd frontend && npm install && npm run lint && npm run build
# images
docker build ./backend
docker build ./frontend
```

---

## Suggestions to make it more "professional"

These are optional improvements, not required for the current pipeline to work:

1. **Add backend tests to CI.** There is no `lint-backend` or test job. A `npm test` step (even a smoke test that boots the server and hits `/health`) would catch backend regressions before they reach prod.
2. **Add a health gate after `compose up`.** Curl `http://127.0.0.1:5000/health` (or similar) and fail the SSH script if it doesn't return 200 within N seconds. Today a broken backend will silently stay "deployed".
4. **Pin action versions to SHAs**, not floating major tags (`@v4`), for supply-chain safety.
5. **Use a deploy environment** (`environment: production` on the deploy job) to gate it behind GitHub's environment protections — required reviewers, wait timers, and environment-scoped secrets.
6. **Tag releases.** Instead of (or alongside) the SHA tag, push images tagged with a semver release on `git tag` events. Makes rollback targets human-readable.
7. **Notify on failure.** Add a Slack/Discord/email step on `if: failure()` so a broken deploy is visible immediately.
