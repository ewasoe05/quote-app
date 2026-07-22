/**
 * Crash reporting seam — optional Sentry when EXPO_PUBLIC_SENTRY_DSN is set.
 *
 * Quotes contain customer PII. Never attach quote/customer payloads to events;
 * call sites should only pass operational context (e.g. { stage: 'pdf-share' }).
 *
 * ---------------------------------------------------------------------------
 * TO ENABLE:
 *   1. Create a Sentry project and copy the DSN.
 *   2. Set EXPO_PUBLIC_SENTRY_DSN in EAS env / local .env.
 *   3. Set SENTRY_AUTH_TOKEN as a sensitive EAS secret for source maps.
 *   4. Ship a new EAS build (native @sentry/react-native module).
 * ---------------------------------------------------------------------------
 */

import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

import { resolveMonitoringEnabled } from './monitoringConfig';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** True once a DSN is configured; used to avoid noisy no-op work in dev. */
export const isMonitoringEnabled = resolveMonitoringEnabled(DSN);

/**
 * Call once, as early in app startup as possible.
 * Safe to call when no DSN is configured — it does nothing.
 */
export function initMonitoring(): void {
  if (!isMonitoringEnabled) return;

  Sentry.init({
    dsn: DSN,
    // Quotes contain customer names, addresses, and phone numbers. Leave this
    // off so that PII never leaves the device with a crash report.
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
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

  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Leave a trail of what the user did before a crash. Breadcrumbs are far more
 * useful than the stack trace alone for reproducing a bug in the field.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!isMonitoringEnabled) return;

  Sentry.addBreadcrumb({ message, data, level: 'info' });
}

/** Wrap the root component so native crashes / JS errors are captured. */
export function wrapRoot(Root: ComponentType<object>): ComponentType<object> {
  // Sentry.wrap's props generic is stricter than Expo Router's root layout type.
  return Sentry.wrap(Root as ComponentType<Record<string, unknown>>) as ComponentType<object>;
}
