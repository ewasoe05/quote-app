/**
 * Crash reporting seam.
 *
 * This module intentionally has no dependency on Sentry yet, so the project
 * typechecks and builds before the SDK is installed. Every call site in the app
 * already routes through here — turning reporting on is a local change to this
 * one file.
 *
 * ---------------------------------------------------------------------------
 * TO ENABLE (see https://docs.expo.dev/guides/using-sentry/):
 *
 *   1. Create a Sentry project and grab the DSN.
 *   2. Run the wizard, which installs the SDK and wires up Metro + source maps:
 *
 *        npx @sentry/wizard@latest -i reactNative
 *
 *   3. Put the DSN in .env as EXPO_PUBLIC_SENTRY_DSN (it is a public value —
 *      safe to ship in the bundle — but keep SENTRY_AUTH_TOKEN out of the repo
 *      and set it as a sensitive EAS environment variable instead).
 *   4. Replace the no-op bodies below with the commented-out implementations.
 *   5. Wrap the root layout export: `export default Sentry.wrap(RootLayout)`.
 * ---------------------------------------------------------------------------
 */

// import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** True once a DSN is configured; used to avoid noisy no-op work in dev. */
export const isMonitoringEnabled = DSN.length > 0;

/**
 * Call once, as early in app startup as possible.
 * Safe to call when no DSN is configured — it does nothing.
 */
export function initMonitoring(): void {
  if (!isMonitoringEnabled) return;

  // Sentry.init({
  //   dsn: DSN,
  //   // Quotes contain customer names, addresses, and phone numbers. Leave this
  //   // off so that PII never leaves the device with a crash report.
  //   sendDefaultPii: false,
  //   // Sample aggressively at first; dial down if the event quota gets tight.
  //   tracesSampleRate: 1.0,
  // });
}

/**
 * Report a handled error that the user recovered from, so failures that are
 * caught and shown as an alert still reach the dashboard.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!isMonitoringEnabled) {
    if (__DEV__) {
      console.warn('[monitoring]', error, context);
    }
    return;
  }

  // Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Leave a trail of what the user did before a crash. Breadcrumbs are far more
 * useful than the stack trace alone for reproducing a bug in the field.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!isMonitoringEnabled) return;

  // Sentry.addBreadcrumb({ message, data, level: 'info' });
}
