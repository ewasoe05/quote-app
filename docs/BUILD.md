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

## Pending setup

Two integrations are scaffolded in the repo but not yet active. Both need
credentials that can't live in source control.

### Over-the-air updates (EAS Update)

`app.json` sets `runtimeVersion` to the `fingerprint` policy, which derives
compatibility automatically — including across SDK upgrades and native changes.
`expo-updates` is listed as a dependency but still needs installing and linking:

```bash
npx expo install expo-updates
npx eas update:configure   # writes updates.url into app.json
```

After that, ship a JS-only fix without an App Store review:

```bash
eas update --branch production --message "Fix totals rounding"
```

Native changes (new modules, permission strings, SDK bumps) still require a new
binary — the fingerprint policy will change, and old binaries correctly stop
accepting the update.

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
