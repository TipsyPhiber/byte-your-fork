# Android Release Runbook

Everything needed to go from this repo to an app on a device / in the Play
Store. Steps marked **(once)** are one-time setup; the rest you repeat per
release. See `MOBILE.md` for how the mobile build differs from web.

> This repo has the code wired up (Capacitor project, signing hook, native
> plugins). What's left is environment + a real device — none of it has run on a
> machine yet, so treat the first pass as a shakeout.

## 0. Prerequisites (once)

- **JDK 17** (Capacitor 8 / AGP needs 17, not 21).
- **Android Studio** (bundles the Android SDK + emulator). On first launch it
  installs the SDK and accepts licenses.
- Confirm `npm install` has run in `frontend/`.

## 1. Backend must be deployed first

The packaged app talks to the **live** API at `https://byteyourfork.com`, not
localhost. Before testing the app, confirm production is up and serving the
build with the CORS allow-list that includes the webview origins:

```bash
# Should return 200 with: access-control-allow-origin: https://localhost
curl -s -D - -o /dev/null -H "Origin: https://localhost" https://byteyourfork.com/api/recipes
```

If that 502s or the header is missing, the app will load but every API call
will fail — fix the backend before blaming the app. (`backend/server.js`
already allows `https://localhost` + `capacitor://localhost`; it just has to be
the deployed copy.)

> Note: there's no `/health` route — probe a real endpoint like `/api/recipes`.

## 2. Build the web assets into the native project

```bash
cd frontend
npm run sync:mobile     # vite build --mode capacitor  +  cap sync android
```

Re-run this after **any** frontend change — the native app serves the copied
`dist/`, not your dev server.

## 3. First run on a device / emulator (debug)

```bash
npm run open:android    # opens Android Studio on the android/ project
```

In Android Studio: pick an emulator (or a USB device with developer mode on) and
press **Run** ▶. This builds a debug APK — no keystore needed.

### Smoke test (the things that can't be verified without a device)

- [ ] App loads past the splash, lists recipes (confirms API + CORS).
- [ ] Recipe images render (confirms `normalizeImageUrl` + API base).
- [ ] Dark-mode toggle also recolors the status bar.
- [ ] Hardware **back**: closes an open recipe → walks history → minimizes at root
      (doesn't hard-kill the app).
- [ ] Keyboard: focusing an input pushes content up and hides the bottom nav.
- [ ] **Cook Mode voice** — the riskiest piece:
  - First mic tap shows the OS permission prompt; granting starts listening.
  - Say "next" / "back" / "repeat" / "step 3" / "ingredients" — each acts and
    speaks. The recognizer should re-arm and keep listening between commands.
  - **Deny** the mic permission once: it should stop cleanly with an error
    message, not spin (this path was hardened in `utils/speech.js`).
  - Tap the mic to mute mid-session: listening stops, no lingering recognizer.

## 4. Generate the release keystore (once)

The keystore signs every release; **if you lose it you can't update the app on
the Play Store**. Back it up somewhere safe (password manager / encrypted drive).

```bash
cd frontend/android
keytool -genkey -v -keystore byteyourfork-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias byteyourfork
```

Then create `frontend/android/keystore.properties` from the template:

```bash
cp keystore.properties.example keystore.properties
# edit it with the real passwords/alias you just chose
```

Both `byteyourfork-release.jks` and `keystore.properties` are **gitignored** —
they must never be committed. `app/build.gradle` auto-detects
`keystore.properties`: present → release builds are signed; absent → debug
builds still work untouched.

## 5. Build a signed release bundle

Bump the version in `android/app/build.gradle` first (`versionCode` must
increase every Play Store upload; `versionName` is the human label):

```gradle
versionCode 2
versionName "1.1"
```

Then:

```bash
cd frontend
npm run sync:mobile
cd android
./gradlew bundleRelease      # -> app/build/outputs/bundle/release/app-release.aab
```

(Use `assembleRelease` for an APK if you want to sideload one for testing; the
Play Store wants the `.aab`.)

Verify it's signed with your key:

```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | head
```

## 6. Play Store (once for setup, then per release)

1. **(once)** Create a Google Play Console account — $25 one-time fee.
2. **(once)** Create the app, fill the store listing: title, short/full
   description, screenshots (phone + optional tablet), 512×512 icon, feature
   graphic, privacy policy URL, content rating questionnaire, data-safety form.
   - **Data safety / permissions:** the app records audio for Cook Mode voice
     commands — declare microphone use and that audio isn't stored or sent
     anywhere (it's transcribed on-device by the OS recognizer).
3. Start with an **internal testing** track — upload the `.aab`, add your own
   email as a tester, install via the opt-in link. Fastest feedback loop.
4. Promote to **closed/open testing**, then **production** when happy.
5. Google re-signs with an app-signing key (Play App Signing) by default; your
   upload key (the keystore above) stays constant. Keep it safe regardless.

## Outstanding / not done

- **iOS** — needs a Mac: `cap add ios` + the same speech/TTS plugins, then an
  Xcode signing + App Store Connect flow.
- **Push notifications** — `build.gradle` is ready for `google-services.json`
  but it isn't wired up; the in-app Notifications page is API-polled, not push.
- `minifyEnabled false` on release — fine to ship, but enabling R8 later shrinks
  the APK (test Capacitor/plugin proguard rules if you do).
- Deep links (e.g. password-reset email links opening in-app) aren't configured;
  those links open the website, not the app.
