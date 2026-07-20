# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Cursor Cloud specific instructions

This is an Expo SDK 57 (React Native + TypeScript) app. All data is local SQLite; there is no backend/services to run.

- Lint/tests: `npm run check` (runs `tsc --noEmit` plus the `scripts/check-*.ts` validation scripts via `tsx`). This is the full automated check suite.
- Run the app: the cloud VM is headless with no iOS/Android simulator or Expo Go, so the only runnable target here is web. Start it with `npx expo start --web --port 8081` and open `http://localhost:8081/`. Standard start/build commands are in `package.json` scripts and `docs/BUILD.md` (EAS).
- Web + expo-sqlite gotcha: web bundling requires `metro.config.js` to add `wasm` to `assetExts` and enable `unstable_enablePackageExports` (per the Expo SQLite web-setup docs). Without it, Metro fails with "Unable to resolve module ./wa-sqlite/wa-sqlite.wasm". If you see stale bundling/resolution errors after changing deps or config, restart with `npx expo start --web --clear` to reset the Metro cache.
- On web the SQLite DB is stored in the browser's OPFS, so a hard refresh does not wipe seeded catalog/quotes.
