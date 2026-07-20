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
