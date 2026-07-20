# Quote App

Cross-platform (iOS + Android) quoting app built with Expo (React Native + TypeScript). Maintain a product catalog, build quotes, and export branded PDFs — all data stored locally with SQLite.

## Stack

- Expo SDK 57
- expo-router (tabs)
- expo-sqlite
- expo-print / expo-sharing
- Zustand

## Getting started

```bash
npm install
npx expo start
```

Then open on a device/simulator via Expo Go, or press `i` / `a` for iOS / Android.

## App structure

- **Quotes** — build and manage customer quotes
- **Products** — catalog of softeners, RO systems, iron filters, add-ons
- **Settings** — company branding and defaults

## Data layer

SQLite schema and CRUD helpers live in `lib/db.ts` with types in `lib/types.ts`:

- `Product` — catalog items
- `Quote` — customer quotes
- `QuoteItem` — line items with price snapshots

All catalog and quote data stays on-device. The app is usable in airplane mode; PDF share uses the native share sheet after a local `expo-print` render.

## Ship builds

Branding, splash, and EAS profiles are in `app.json` / `eas.json`. See **[docs/BUILD.md](docs/BUILD.md)** for:

- Linking an EAS project (`eas init`)
- Android APK (`preview`) and AAB (`production`)
- iOS TestFlight production build + submit
- Offline / field checklist
