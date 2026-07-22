// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Required for expo-sqlite web support: let Metro treat .wasm as an asset and
// keep package exports enabled so the wa-sqlite conditional exports resolve.
// See https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#web-setup
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
config.resolver.unstable_enablePackageExports = true;

module.exports = withSentryConfig(config);
