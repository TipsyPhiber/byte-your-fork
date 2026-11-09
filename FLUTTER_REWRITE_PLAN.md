# Byte Your Fork — Flutter Rewrite Plan

## Decisions locked
- **Framework:** Flutter (Dart), replacing the React + Capacitor frontend.
- **Backend:** Keep the existing Express + PostgreSQL API as-is. Flutter is a new REST client. No backend rewrite.
- **Voice (all free / open-source, offline-capable):**
  - STT: **Vosk** (`vosk_flutter`, Apache-2.0) — bundled ~50MB model, keyword grammar for commands + "Hey Chef" wake word.
  - TTS: **flutter_tts** — native Android/iOS voices.
  - Native OS `speech_to_text` plugin as fallback only.
- **Local data:** **Isar** (or Drift/SQLite) as an offline cache of recipes synced from the backend.
- **Rejected:** Picovoice (paid), on-device LLM/Gemma (overkill, heavy, not on all phones).

## Known tradeoff
App-logic updates ship through Play Store / App Store review (slower than the current Capacitor web-bundle push). Recipe content stays instantly updatable via the backend.

---

## Feature inventory the rewrite must replicate
1. Auth: login, signup, email verification, password reset, JWT handling, session/inactivity timeout.
2. Recipe browsing: dashboard feed, explore catalog, full-text search, cuisine + dietary filters, ratings.
3. Cook Mode: step-by-step, voice commands (next/back/repeat/jump-to-step/ingredients/how-many-steps/stop), TTS readout, ingredient scaler, elapsed timer, screen wakelock.
4. Favorites: save/unsave, synced list.
5. Shopping list: add/remove, bulk-add from recipe, dedup/merge amounts, check-off, email, Instacart hand-off.
6. Settings: profile (name, avatar), email/password change, cuisine preferences, dietary restrictions, dark mode.
7. Notifications: new recipes (30 days), dismiss.
8. Comments & ratings: view/post/delete.
9. Admin (lower priority): recipe CRUD, role management, analytics.

Off-scope for v1: scraper, analytics dashboard, Instacart (keep as backend-only / later).

---

## Phased build plan

### Phase 0 — Scaffolding (foundation)
- Create Flutter project; set package id to match current Android app.
- State management: **Riverpod** (per PDF — good fit).
- Routing: **go_router** with auth-guarded routes mirroring current routes.
- HTTP: **dio** + interceptor for JWT, base-URL config per build flavor (dev/prod), mirroring current `.env.capacitor` / `.env.production`.
- Secure token storage: **flutter_secure_storage** (replaces localStorage token).
- Theme + dark mode toggle.
- **Exit criteria:** app builds on Android, can hit `/api/auth/me` with a pasted token.

### Phase 1 — Auth
- Login, signup, email verification, forgot/reset password screens.
- JWT persistence, auto-attach, 401 → logout, inactivity timeout.
- **Exit:** full account lifecycle works against the live backend.

### Phase 2 — Recipe browse (read-only)
- Models for recipe/ingredient/step/tag matching backend JSON.
- Dashboard feed, Explore catalog with cuisine + dietary filters, search, recipe detail modal/screen, images via `/api/images/:id`.
- **Exit:** can browse, filter, search, open any recipe.

### Phase 3 — Local cache (Isar)
- Define Isar schema for recipes/steps/ingredients.
- Sync-on-fetch: write recipes to Isar; read from Isar first, refresh from API.
- Bundle a seed recipe DB asset so the app opens offline on first launch.
- **Exit:** browse previously-loaded recipes with no network.

### Phase 4 — Cook Mode + voice (the core differentiator)
- Cook Mode UI: current step, ingredient highlight, step nav, scaler, elapsed timer.
- **flutter_tts** init with rate ~0.88, voice selection persisted, echo-guard window.
- **Vosk** integration: bundle model, build keyword grammar from command set, continuous listen loop, map transcripts → intents (reuse current command vocabulary).
- "Hey Chef" wake word via Vosk keyword spotting; active-window listening after wake.
- **wakelock_plus**: keep screen on in Cook Mode.
- **audio_session**: duck background audio (Spotify) ~80% while TTS speaks.
- Local timers: **flutter_local_notifications** + WorkManager/BackgroundTasks for step durations that fire when backgrounded.
- **Exit:** fully hands-free cook-through of a recipe, offline.

### Phase 5 — Personalization & social
- Favorites (save/unsave, synced).
- Ratings + comments (view/post/delete).
- Shopping list (add, bulk-add from recipe, merge/dedup, check-off, email).
- Notifications (list + dismiss).
- **Exit:** logged-in users get full feature parity minus admin.

### Phase 6 — Settings & profile
- Profile edit, avatar upload/fetch, email/password change, cuisine preferences, dietary restrictions, dark mode.

### Phase 7 — Admin (optional)
- Recipe create/edit/delete, role management, analytics view.

### Phase 8 — Release hardening
- Android signing/keystore, Play Store listing, version flavors.
- Permissions: microphone (RECORD_AUDIO), notifications.
- Offline + noisy-kitchen QA; battery profiling of always-on Vosk.
- iOS target if desired (new effort: certs, AVSpeech, BackgroundTasks).

---

## Key package list
| Concern | Package |
|---|---|
| State | flutter_riverpod |
| Routing | go_router |
| HTTP | dio |
| Token storage | flutter_secure_storage |
| Local DB | isar / isar_flutter_libs |
| STT (offline) | vosk_flutter |
| TTS | flutter_tts |
| Audio ducking | audio_session |
| Keep screen on | wakelock_plus |
| Timers/notifications | flutter_local_notifications |
| Background tasks | workmanager |

## Biggest risks
1. **Vosk accuracy in kitchen noise** — mitigate with tight keyword grammar; prototype Phase 4 early.
2. **Always-on listening battery cost** — profile; consider tap-to-talk fallback.
3. **Backend JSON ↔ Dart model drift** — generate models carefully; add contract tests.
4. **Update latency** — app-store review lag; keep logic stable, push content via backend.
