// Learn more https://docs.expo.io/guides/customizing-metro
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Use getSentryExpoConfig (not withSentryConfig): Expo's embed export returns a
// serializer shape that withSentryConfig's custom serializer mishandles, which
// crashes with "Cannot read properties of undefined (reading 'match')".
// See https://github.com/getsentry/sentry-react-native/issues/5315
/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// Required for expo-sqlite web support: let Metro treat .wasm as an asset and
// keep package exports enabled so the wa-sqlite conditional exports resolve.
// See https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#web-setup
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
