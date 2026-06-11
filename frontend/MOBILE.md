# Mobile App (Android, Capacitor)

The web app is wrapped as a native Android app with [Capacitor](https://capacitorjs.com).
Same React codebase — the only differences are how it reaches the API and how
Cook Mode's voice works.

## How it differs from the web build

| Concern | Web | Mobile (Capacitor) |
|---|---|---|
| API base URL | `''` — same-origin via nginx/Vite proxy | `https://byteyourfork.com` (set in `.env.capacitor`) |
| Cook Mode voice | Browser Web Speech API | Native plugins (`@capacitor-community/speech-recognition` + `text-to-speech`), with web fallback — see `src/utils/speech.js` |
| Images | Same-origin paths | Prefixed with the API base (`src/config.js` → `normalizeImageUrl`) |

The mobile app talks to the **live production API**, so the backend must be
deployed with the updated CORS allow-list (it now permits the app's
`https://localhost` webview origin). Local-only API changes won't be visible to
the app until deployed.

## Prerequisites (not on this Linux box yet)

- **JDK 17** and **Android Studio** (bundles the Android SDK).
- Set `ANDROID_HOME` / accept SDK licenses (Android Studio does this on first run).

## Build & run

```bash
cd frontend

# Build the web assets in mobile mode + copy them into the native project
npm run sync:mobile        # = vite build --mode capacitor && cap sync android

# Open in Android Studio, then press Run (or build an APK/AAB from there)
npm run open:android
```

Re-run `npm run sync:mobile` after any frontend change to push it into the app.

## Voice permissions

`AndroidManifest.xml` declares `RECORD_AUDIO` plus the speech/TTS `<queries>`.
The mic permission is requested at runtime the first time the user taps the Cook
Mode mic button.

## Not done yet (follow-ups)

- App icon & splash screen (currently Capacitor defaults).
- Android hardware back-button handling (`@capacitor/app` is installed but not wired).
- Play Store signing config for release builds.
- iOS (would need a Mac; `cap add ios` + the same plugins).
