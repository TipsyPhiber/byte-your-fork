# Engineering Notes — Mobile Redesign & Local Stack (2026-06-11)

What was done, why, and how to run it. Scope: make login, recipe browsing, and
Cook Mode voice work against a **local** database, and rework the frontend like
a professional mobile app. The VPS deployment was **not touched** — everything
here runs on this machine; prod keeps running until you choose to deploy.

---

## 1. Local stack (instead of the VPS)

| Piece | Where | Why |
|---|---|---|
| Postgres 16 | Docker container `byteyourfork-postgres` (repo's own `docker-compose.yml`, postgres service only) | Same engine/version as prod; data survives restarts in the `postgres_data` volume |
| Backend | Host process on **port 5001** (`cd backend && npm run dev`) | Port 5000 is already taken by the `kavita` container on this machine. Host process = instant restart while iterating |
| Frontend | Vite dev server on 5173 (`cd frontend && npm run dev`) | The dev proxy now reads `BACKEND_PORT` (defaults to 5001) — see `frontend/vite.config.js` |

Secrets live in `./.env` (compose) and `backend/.env` (backend) — both
generated with fresh random values (`openssl rand -hex …`), both gitignored,
both `chmod 600`. `backend/.env` sets `JWT_EXPIRES_IN=12h` so local sessions
don't die every 30 minutes (prod default stays 30m — see §4).

### Run it

```bash
docker compose up -d postgres        # database
cd backend && npm run dev            # API on :5001
cd frontend && npm run dev           # app on http://localhost:5173
```

**Local login: username `brad`, password `TastyTest123`** (admin, verified).
Demo users `demo_carla` / `demo_marco` (same password) exist so ratings,
comments, and recommendations have data.

---

## 2. The database schema didn't exist in the repo — now it does

The production DB was created by hand before the migration runner existed;
`backend/migrations/` only contained ALTERs (001-005) that assume the base
tables. A fresh database could never be bootstrapped from the repo.

**Fix:** `backend/migrations/000_base_schema.sql` — the full 20-table base
schema reconstructed from every query in `backend/routes/`. Notes:

- Every statement is `IF NOT EXISTS`, so running it against the **prod** DB is
  a no-op (it will simply be recorded in `schema_migrations`).
- The UNIQUE constraints keep Postgres' default names
  (`users_username_key`, `users_email_key`, `email_hashes_email_hmac_key`)
  because `routes/auth.js` string-matches `err.constraint` on those exact
  names for duplicate-signup errors.
- Child tables (`ratings`, `comments`, `favorites`, `views`, …) got
  `ON DELETE CASCADE` — previously, deleting a recipe with ratings would have
  failed on FK errors because `DELETE /api/recipes/:id` only cleans 5 of the
  10 child tables.

`npm run migrate` on an empty database now brings up the entire schema.

---

## 3. Seed data — and the legal line it respects

`backend/seed.js` (`npm run seed`) fills the local DB with ~80-110 recipes.

**It only uses TheMealDB's free JSON API.** The existing `scraper.js` also
scrapes BudgetBytes and SimplyRecipes — copyrighted photos and prose from
commercial food blogs, against their ToS. That content must never ship in a
monetized product, so the seeder doesn't touch those code paths and you
shouldn't run `npm run scrape` as-is. (Long-term: licensed API or commissioned
recipes for the paid tier.)

Seeder details:

- Images are downloaded into the DB (`images.data` BYTEA) and exposed at the
  **relative** URL `/api/images/<id>` — works through the Vite proxy, nginx in
  prod, and the Capacitor app's API-base prefix. (The old scraper baked
  absolute `APP_URL`-based URLs into the DB, which break across environments.)
- Cook times are estimated from step/ingredient counts (TheMealDB has none) so
  cards don't all show a fake uniform "30 min".
- `creation_date` is spread over the last 45 days so the Notifications screen
  has content; dietary flags run through the existing `inferDietaryFlags`.
- Demo users add ratings/favorites/comments/`events` rows so Top Rated,
  analytics, and recommendations aren't empty.
- Idempotent: recipes dedupe by title, users upsert by username.

---

## 4. Backend changes (deliberately minimal)

- `routes/auth.js`: token lifetime is now `process.env.JWT_EXPIRES_IN || '30m'`
  (two call sites). Prod behavior unchanged unless you set the variable.
  Rationale: a 30-minute hard expiry with no refresh endpoint kills mobile
  sessions mid-cooking; a proper refresh-token flow is the real fix and is
  listed under next steps.
- `.env.example` documents the new variable.
- Nothing else server-side was modified.

---

## 5. Frontend: what "redo like a professional engineer" meant in practice

### Architecture (new files)

- **`src/api.js`** — one shared axios instance. Base URL handling (web
  same-origin vs Capacitor `VITE_API_BASE`), bearer-token injection, and
  global session-expiry detection live in one place. Previously 9+ files
  hand-built `Authorization` headers and a dead token failed silently
  everywhere; now any 401/expired-token response triggers one clean logout
  with a "Session expired" toast (`hooks/useAuth.js`).
- **`src/utils/session.js`** — a keep-alive flag. Cook Mode is hands-free, so
  the 15-minute *inactivity* auto-logout used to fire mid-recipe (no touch
  events while cooking ≠ walked away). Cook Mode raises the flag; useAuth
  re-arms instead of logging out.
- **`src/hooks/useWakeLock.js`** — Screen Wake Lock while Cook Mode is open
  (messy hands, long steps); re-acquires on visibility change, silent no-op
  where unsupported.

### Design system (`src/App.css` rewrite)

- Touch targets ≥44px across the app (`--tap-min`), including invisible
  hit-area extensions on small visual buttons (heart, dismiss ✕, trash).
- All hover effects gated behind `@media (hover: hover)` with `:active`
  feedback for touch (previously cards looked dead on phones / got sticky
  hover); tap-highlight flash removed; `touch-action: manipulation`.
- Filter pills are horizontally scrollable strips with an edge fade on mobile
  (was: wrapping walls of chrome), wrapping again ≥768px.
- 16px input font floor (stops iOS Safari's zoom-on-focus), `dvh` viewport
  units and `env(safe-area-inset-*)` everywhere fixed bars exist.
- Bottom nav is a native-style labeled tab bar (labels now visible on mobile),
  badge clamps at 9+, keyboard still hides it via `body.keyboard-open`.
- `prefers-reduced-motion` honored; focus-visible rings for keyboard users.

### Screens

- **Recipe detail** is a full-screen sheet on mobile with a **sticky action
  bar** — ♥ / add-to-list / **Start Cooking** — pinned in the thumb zone.
- **Cook Mode** rebuilt: fixed header (title, step counter, timer, progress
  bar), big readable step card, and a fixed bottom control cluster — 78px mic
  button with a pulsing ring while listening, round prev/next on either side.
  Ingredients / commands / voice settings collapsed into accordions.
- **Auth**: OTP autofill (`autocomplete="one-time-code"`, numeric keypad),
  proper autocomplete on all fields, show/hide password, loading states.
- **Landing/About**: shared safe-area-aware nav (`.preauth-nav`), hover-state
  JS replaced with CSS, `100vh→100dvh`, full-width CTAs on small screens.
- Dead components removed: `Sidebar.jsx`, `MobileNav.jsx` (unimported legacy).

### Cook Mode voice — reliability fixes (`src/utils/speech.js`)

The web/native abstraction is preserved (native Capacitor plugins on device,
Web Speech in browsers). Three real bugs fixed:

1. **Mic going silently deaf (web):** Chrome ends "continuous" recognition
   sessions after silence; there was no restart, so the mic just turned off.
   The web path now mirrors the native re-arm loop — it restarts the session
   in `onend` while the user still wants to listen.
2. **The app triggering itself:** nothing stopped recognition results that
   were actually the app's own TTS voice ("Try saying next…" contains "next").
   `speak()` now tracks audibility (`isTtsAudible()`, with an 800ms grace for
   recognizer latency and a watchdog for Chrome's missing-`onend` flake) and
   Cook Mode drops results captured during that window.
3. **Swallowed errors:** mic-permission-denied / unsupported-browser /
   network failures were invisible (the button just flipped back). They now
   surface as a message under the mic button.

---

## 6. What was verified, and how

Headless Chrome (390×844 mobile viewport, mic permission granted, speech APIs
instrumented) against the live local stack:

- Landing → login (`brad`) → dashboard with 24-card grid, all images loading
- Wrong-password shows the error message (and the API's 401 is handled)
- Recipe sheet: ingredients, instructions, servings stepper, sticky CTA
- Cook Mode: TTS invoked on open and on next/prev (`speechSynthesis.speak`
  observed with "Step 1. …"), step navigation, prev disabled on step 1,
  mic tap → recognizer session started + listening UI, tap again → off
- All five tabs navigate; Explore cuisine pill filters 80 → 9 recipes
- Touch-target audit: no visible button under 36px on the audited screens
- `npm run build` and `npm run build:mobile` (Capacitor mode) compile

**Not verifiable on this machine:** real spoken-command round trips (no
physical mic) and the native Android voice path (no JDK/Android Studio here —
see `frontend/MOBILE.md`). The native re-arm loop remains untested on device.

## 7. Testing the Android app against this local backend

The packaged APK calls `https://byteyourfork.com` (from
`frontend/.env.capacitor`) — local changes are invisible to it. To point a
phone at this machine instead: set `VITE_API_BASE` to your LAN IP
(`http://192.168.x.x:5001`), add that origin to `allowedOrigins` in
`backend/server.js`, allow cleartext in the Android manifest, and rebuild
(`npm run sync:mobile`). Budget real time for this; it is not a one-liner.

## 8. Suggested next steps

- A refresh-token endpoint (then drop `JWT_EXPIRES_IN=12h` locally).
- Try the redesign on a real device — especially Cook Mode voice (native
  recognizer re-arm loop, TTS voice-index mapping).
- Recipe deep links (the modal is overlay state, not a route — back/forward
  and sharing can't reach a specific recipe).
- Licensed recipe content before monetizing (see §3).
