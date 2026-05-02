# Byte Your Fork

A full-stack recipe discovery and cooking app with hands-free, AI-guided "Cook Mode." 
**Live:** https://byteyourfork.com

---

## What it does

- **Discover recipes** by dish, ingredient, cuisine, or dietary tag, with results tuned to user preferences.
- **AI Cook Mode** — voice-guided, hands-free cooking powered by Google Gemini Live. Talk to it while your hands are covered in flour.
- **Personal cookbook** — save favorites, filter by cuisine, sort by rating / name / cook time.
- **Community ratings & comments** on every recipe.
- **Shopping list** built from saved recipes, with multi-recipe ingredient merging.
- **Account & profile** management — auth, email verification, password reset, profile pictures, dietary restrictions, cuisine preferences.
- **Admin panel** for moderation, analytics, and user management.

---

## Tech stack

| Layer       | Tech |
|-------------|------|
| Frontend    | React 19, Vite 8, React Router 7, Lucide icons |
| Backend     | Node.js, Express 5, REST API |
| Database    | PostgreSQL 16 (raw SQL migrations, no ORM) |
| Auth        | JWT, bcrypt, AES-encrypted PII at rest |
| AI          | Google Gemini (text + Live voice API) |
| Email       | Nodemailer (transactional) |
| Infra       | Docker Compose, Nginx reverse proxy |
| Hardening   | Helmet, express-rate-limit, CORS, parameterized queries |

---

## Architecture

```
Browser ──▶ Frontend container (Nginx + Vite-built React SPA)
              │
              └──▶ Backend container (Express API)
                       │
                       ├──▶ PostgreSQL (recipes, users, ratings, …)
                       ├──▶ Gemini API (Cook Mode, dietary tagging)
                       └──▶ SMTP (verification, password reset)
```

Each service is its own container, orchestrated by `docker-compose.yml`. The full stack runs locally with one command.

---

## What this project demonstrates

- **End-to-end ownership** — product design, schema design, API design, UI, and ops.
- **Security awareness** — encrypted PII, hashed passwords, rate-limited auth endpoints, parameterized SQL, secrets kept out of source.
- **Real-time AI integration** — bidirectional audio streaming with Gemini Live for the voice cook mode.
- **Schema evolution** — incremental SQL migrations checked into the repo, applied via a small Node runner.
- **Pragmatism** — no ORM, no Redux, no microservices. Right-sized for the problem.

---

## Repo layout

```
backend/          Express API, migrations, scraper, mailer
  routes/         auth, recipes, ratings, comments, favorites,
                  shopping list, admin, analytics, recommendations…
  migrations/     Versioned SQL schema changes
frontend/         React + Vite SPA
  src/pages/      Dashboard, Explore, Favorites, Notifications, ShoppingList
  src/components/ Recipe modal, search, ratings, comments, settings cards…
docker-compose.yml
nginx.conf
```

---

## Running it locally (5 minutes)

You only need **Docker Desktop** installed — nothing else. No Node, no Postgres, no manual setup.
Download: https://www.docker.com/products/docker-desktop/

### 1. Clone the repo

```sh
git clone <this repo>
cd ByteYourFork
```

### 2. Create the backend env file

```sh
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in these **three required** values. You can paste the commands below into a terminal to generate them, or just use the throwaway values shown — it's fine for a local demo:

| Variable       | What to use locally |
|----------------|---------------------|
| `DB_PASSWORD`  | `password` (matches the root `.env`) |
| `JWT_SECRET`   | any long random string — e.g. `openssl rand -hex 64` |
| `AES_KEY`      | exactly 64 hex chars — e.g. `openssl rand -hex 32` |

The other variables (SMTP, Gemini, Instacart) are **optional** — the app runs without them. Only the features that depend on them will be inactive (e.g. password-reset emails, voice Cook Mode).

### 3. Start everything

```sh
docker compose up --build -d
```

First run takes a few minutes (pulling images, building containers). Subsequent runs are seconds.

### 4. Apply database migrations (first run only)

```sh
docker compose exec backend npm run migrate
```

### 5. Open the app

http://localhost:8080

That's it. Create an account and start exploring.

### Stopping / cleaning up

```sh
docker compose down          # stop containers (keeps your data)
docker compose down -v       # stop + wipe the database volume
```

### Troubleshooting

- **Port 8080 or 5432 already in use** — stop the conflicting service or change the host port in `docker-compose.yml`.
- **Backend keeps restarting** — usually a missing/short `JWT_SECRET` or `AES_KEY`. Check with `docker compose logs backend`.
- **Empty recipe catalog** — the scraper is optional. Run `docker compose exec backend npm run scrape` to populate sample recipes.

---
