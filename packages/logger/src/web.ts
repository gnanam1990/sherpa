/**
 * Browser-side Sentry helpers for apps/web (M2 domain).
 *
 * Deliberately decoupled from `./sentry.ts` (which targets `@sentry/node`).
 * apps/web is M2's domain and currently has no error reporting; this
 * module is the agreed integration point when M2 wants to opt in.
 *
 * Usage from M2:
 *
 *   import * as Sentry from '@sentry/browser';
 *   import { initWebSentry } from '@sherpa/logger/web';
 *
 *   initWebSentry({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN }, Sentry);
 *
 * The DSN is read from `NEXT_PUBLIC_SENTRY_DSN` (separate from
 * server-side `SENTRY_DSN`) — DSNs are scoped per platform on Sentry's
 * side, so reusing the server DSN in the browser would mis-classify
 * events.
 */

export type WebSentryConfig = {
  dsn?: string;
  environment?: string;
  release?: string;
  /**
   * Sample rate for browser performance traces. Default 0 = errors-only.
   * M2 may bump this once we want client-side perf insights; until then
   * it would just spend our quota.
   */
  tracesSampleRate?: number;
};

/**
 * Structural type — kept hand-rolled so this package never takes a
 * type-only dep on `@sentry/browser`. M2 passes `Sentry` from the
 * actual SDK; the structural match validates the call shape.
 */
export type SentryBrowserLike = {
  init(opts: {
    dsn?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
  }): void;
};

/**
 * Initialize the browser SDK. No-op when DSN is unset. Safe to call on
 * every page load — Sentry's `init` is idempotent.
 *
 * Caller passes the SDK so `@sherpa/logger` itself doesn't take a
 * runtime dep on `@sentry/browser` (which would force the bundle
 * cost on apps that don't use it).
 */
export function initWebSentry(
  config: WebSentryConfig,
  sdk: SentryBrowserLike,
): void {
  if (!config.dsn) return;
  sdk.init({
    dsn: config.dsn,
    environment: config.environment ?? 'development',
    release: config.release,
    tracesSampleRate: config.tracesSampleRate ?? 0,
  });
}
