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

## Field / offline checklist

On a physical device with airplane mode on:

1. Open app (no crash; catalog + quotes load from SQLite).
2. Create or edit a product.
3. Create a quote → add line items → adjust discount/tax.
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
