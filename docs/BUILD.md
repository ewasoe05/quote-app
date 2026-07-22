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
| Product packages/kits + cost/margin pricing helper | OTA — SQLite columns + JS expand on add |
| Customer/tech signature (gesture pad → SVG), won/lost reason, job-site photo from library | OTA — no new native modules |
| Follow-up dates, Due today badges/filters, activity timeline, quote templates | OTA — badge-only (no notifications) |
| Local SQLite **backup export/import** (zip via Files / iCloud) | OTA — uses existing Share + DocumentPicker + `fflate` |
| Optional **Sentry** (`@sentry/react-native`, DSN via `EXPO_PUBLIC_SENTRY_DSN`) | **New EAS build** (native module) then set DSN; OTA can toggle DSN only after that binary |
| Local follow-up **notifications** (`expo-notifications`) | **New EAS build** if/when added |
| Job-site photo **from camera** + updated photo/camera permission strings | **New EAS build** (`app.json` camera + Info.plist) then resume OTA |
| New native module (`expo-*` that needs native code) | New EAS build + reinstall |
| New iOS/Android permissions in `app.json` | New EAS build + reinstall |
| Expo SDK / React Native upgrade | New EAS build + reinstall |

`runtimeVersion` uses the **fingerprint** policy: when native code changes, the
fingerprint changes and old binaries correctly refuse incompatible updates.
Always ship a new binary after native changes, then resume OTA from that build.

---

## Pending setup

### Crash reporting (Sentry)

`@sentry/react-native` is installed and wired through `lib/monitoring.ts`.
`initMonitoring()` runs at startup and `wrapRoot()` wraps the root layout.
`captureException()` / `addBreadcrumb()` no-op until a DSN is present, so builds
without Sentry credentials stay quiet.

**Requires a new EAS build** once (native Sentry module + Metro Debug IDs). After
that binary is installed:

1. Create a Sentry project and copy the DSN.
2. Set `EXPO_PUBLIC_SENTRY_DSN` in EAS environment variables (and local `.env` for
   dev). The DSN is a public client value — safe in the bundle.
3. Set `SENTRY_AUTH_TOKEN` as a **sensitive** EAS secret for source map upload —
   never commit it.
4. Rebuild (or OTA if only the DSN env changed on an already-Sentry-capable
   binary).

`sendDefaultPii` is off. Do not put customer names, phones, addresses, or quote
bodies in `captureException` extras — use operational stages only
(e.g. `{ stage: 'backup-import' }`).

### Backup (Files / iCloud)

Settings → **Export backup** / **Import backup** writes or restores a zip of
`quote-app.db` plus document media (logo, product PDFs, signatures, job-site
photos). Use the share sheet to save to Files or iCloud Drive. Import replaces
all local data. Multi-device live sync is intentionally not included.

Backup export/import is JS-only and can ship via OTA on builds that already have
Share + DocumentPicker (this app does).

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
