# Ship builds (EAS)

Quote App is configured for [EAS Build](https://docs.expo.dev/build/introduction/). All product/quote data is local SQLite — builds do not need a backend.

## Prerequisites

1. Expo account (`npx eas login`)
2. Apple Developer account (iOS TestFlight) and/or Google Play Console (Android)
3. Node 20+ and project deps (`npm install`)

## One-time project link

From the repo root:

```bash
npx eas login
npx eas init
```

`eas init` writes a real `extra.eas.projectId` into `app.json`. Do not commit a placeholder ID.

## Profiles (`eas.json`)

| Profile | Use | Artifacts |
|---|---|---|
| `development` | Dev client / simulator | iOS simulator + Android APK |
| `preview` | Internal / field testing | iOS device + Android APK |
| `production` | Store / TestFlight | iOS IPA + Android AAB (`app-bundle`) |

## Build commands

```bash
# Android installable APK (sideload / internal)
npm run build:android:preview

# Android Play upload bundle
npm run build:android:production

# iOS (credentials prompted; use for TestFlight)
npm run build:ios:preview
npm run build:ios:production

# Submit production iOS to App Store Connect / TestFlight
npm run submit:ios
```

Equivalent CLI:

```bash
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
npx eas build --platform ios --profile preview
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

### iOS TestFlight

1. Ensure `ios.bundleIdentifier` (`com.ewasoe05.quoteapp`) matches App Store Connect.
2. Run a production (or preview) iOS build; complete Apple credential setup when prompted.
3. Set `submit.production.ios.ascAppId` in `eas.json` to the App Store Connect numeric app ID.
4. `npm run submit:ios` — then enable the build in TestFlight.

### Android APK / AAB

- **APK:** `preview` profile (`buildType: apk`) — install on devices without Play.
- **AAB:** `production` profile (`buildType: app-bundle`) — upload to Play Console (internal track is preconfigured under `submit.production.android`).

## Over-the-air updates (EAS Update)

JS/CSS/asset fixes can ship to installed phones **without** rebuilding or
reinstalling. Native changes still need a new binary.

### One-time setup (done in repo)

- `expo-updates` is a dependency
- `app.json` has `runtimeVersion.policy: "fingerprint"` and
  `updates.url: https://u.expo.dev/<projectId>`
- `eas.json` build profiles set matching channels:
  - `preview` → channel `preview`
  - `production` → channel `production`
  - `development` → channel `development`

**Expo Go is not enough** for this app’s native modules. Install a real
**preview** (internal) or **TestFlight / production** build that was created
*after* Update was configured. Only that binary will check for OTA updates.

### First install (required once per native binary)

```bash
# Internal device build (ad hoc / preview)
npm run build:ios:preview

# Or TestFlight
npm run build:ios:production
npm run submit:ios
```

Install that build on your iPhone. After that, most day-to-day app changes can
go out with `eas update` instead of a new install.

### Publish a JS-only update

```bash
# Preview / internal builds
npm run update:preview -- --message "Tighten quote PDF layout"

# TestFlight / production builds
npm run update:production -- --message "Tighten quote PDF layout"
```

Equivalent CLI:

```bash
npx eas-cli update --channel preview --environment preview --message "…"
npx eas-cli update --channel production --environment production --message "…"
```

On the phone: force-quit and reopen the app (sometimes twice) so it can download
and apply the update.

### When to use `eas update` vs a new build

| Change | Ship with |
|---|---|
| Screens, styles, PDF HTML, calculations, copy | `npm run update:preview` / `update:production` |
| Quote preview, share message, valid-until / deposit / terms fields | OTA (`eas update`) — uses existing Print / Share / Linking |
| Quote + selected product literature (zipped with `fflate`) | OTA — pure JS zip, existing Share APIs |
| New native module (`expo-*` that needs native code) | New EAS build + reinstall |
| New iOS/Android permissions in `app.json` | New EAS build + reinstall |
| Expo SDK / React Native upgrade | New EAS build + reinstall |

`runtimeVersion` uses the **fingerprint** policy: when native code changes, the
fingerprint changes and old binaries correctly refuse incompatible updates.
Always ship a new binary after native changes, then resume OTA from that build.

---

## Pending setup

### Crash reporting (Sentry)

`lib/monitoring.ts` is the seam: `initMonitoring()` runs at app startup and
`captureException()` is already called from the DB init path, PDF sharing, and
every quote create/duplicate/delete handler. All of it no-ops until a DSN is
present, so the app builds and runs unchanged today.

To turn it on:

```bash
npx @sentry/wizard@latest -i reactNative
```

Then set `EXPO_PUBLIC_SENTRY_DSN` in `.env`, uncomment the marked blocks in
`lib/monitoring.ts`, and wrap the root layout export with `Sentry.wrap()`.
`SENTRY_AUTH_TOKEN` (used for source map upload) must be set as a **sensitive**
EAS environment variable — never committed.

Note that `sendDefaultPii` is deliberately off in the scaffold: quotes contain
customer names, addresses, and phone numbers, and none of that should leave the
device attached to a crash report.

## Field / offline checklist

On a physical device with airplane mode on:

1. Open app (no crash; catalog + quotes load from SQLite).
2. Create or edit a product.
3. Create a quote → add line items → adjust discount/tax → add notes.
4. Confirm the quote number (`#1001`+) shows on the list card, the builder
   screen, and the PDF header, and that it never repeats after deleting a quote.
4. Share PDF — generation is local; the share sheet may still open for Files/Messages. If sharing is unavailable, the alert explains that catalog/quotes remain usable offline.

## Branding assets

| File | Role |
|---|---|
| `assets/images/icon.png` | App icon (1024²) |
| `assets/images/android-icon-*.png` | Adaptive icon layers |
| `assets/images/splash-icon.png` | Splash mark on `#0B3A5B` |
| `assets/images/splash.png` | Full-bleed splash reference |
| `assets/images/icon-source.png` | Master artwork for regenerating sizes |

App display name: **Quote App** (`app.json` → `expo.name`).
