# Byte Your Fork

A full-stack recipe discovery and cooking app with hands-free, AI-guided "Cook Mode." Built end-to-end by one developer — frontend, backend, database, infra, and deployment.

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
| Infra       | Docker Compose, Nginx reverse proxy, Let's Encrypt |
| Hardening   | Helmet, express-rate-limit, CORS, parameterized queries |

---

## Architecture

```
Browser ──▶ Nginx (TLS, static assets, /api proxy)
              │
              ├──▶ Frontend container (Vite-built React SPA)
              │
              └──▶ Backend container (Express API)
                       │
                       ├──▶ PostgreSQL (recipes, users, ratings, …)
                       ├──▶ Gemini API (Cook Mode, dietary tagging)
                       └──▶ SMTP (verification, password reset)
```

Each service is its own container, orchestrated by `docker-compose.yml`. The full stack runs locally with one command and deploys to a `$6/mo` VPS with the same compose file.

---

## What this project demonstrates

- **End-to-end ownership** — product design, schema design, API design, UI, deployment, and ops.
- **Production deployment** — real domain, real TLS, real users. See [`DEPLOY.md`](./DEPLOY.md) for the full runbook.
- **Security awareness** — encrypted PII, hashed passwords, rate-limited auth endpoints, parameterized SQL, secrets rotated out of source.
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
DEPLOY.md         Step-by-step production deployment guide
```

---

## Running locally

```sh
git clone <this repo>
cd ByteYourFork
cp backend/.env.example backend/.env   # fill in secrets
docker compose up --build
```

Then open http://localhost.

---
