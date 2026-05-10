/**
 * Sentry initialization + capture helpers.
 *
 * Thin wrapper over `@sentry/node` so the rest of the codebase imports
 * a stable surface from `@sherpa/logger` (no `@sentry/*` imports outside
 * apps that bundle the SDK). When `SENTRY_DSN` is unset, every helper
 * is a no-op — dev / CI / unit tests never need to set up an SDK they
 * don't have.
 *
 * Why @sentry/node, not @sentry/serverless: Sentry deprecated the
 * serverless package in 2024; @sentry/node is the supported path on
 * Vercel functions and any other Node runtime.
 *
 * Init must be passed the SDK (`import * as Sentry from '@sentry/node'`)
 * so this package itself doesn't take a hard runtime dep on
 * `@sentry/node` — packages that never call `initSentry()` (every M2/M3
 * unit test runner, every cron-only deployment if we ever split them)
 * pay zero bundle cost.
 */

export type SentryConfig = {
  dsn?: string;
  environment?: string;
  /** Commit SHA. Defaults to VERCEL_GIT_COMMIT_SHA at runtime when unset. */
  release?: string;
};

/**
 * Structural type matching the slice of `@sentry/node` we actually call.
 * Hand-rolled so this package never takes a type-only dep on the SDK —
 * only apps that pass the real `Sentry` namespace pay that cost.
 */
export type SentryScope = {
  setTag(key: string, value: string): void;
  setExtra(key: string, value: unknown): void;
};

export type SentryLike = {
  init(opts: {
    dsn?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
  }): void;
  captureException(err: unknown): unknown;
  withScope(callback: (scope: SentryScope) => void): void;
};

let active: SentryLike | undefined;
let initialized = false;

export function initSentry(
  config: SentryConfig,
  sdk: SentryLike,
): SentryLike | undefined {
  if (initialized) return active;
  initialized = true;
  if (!config.dsn) return undefined;
  sdk.init({
    dsn: config.dsn,
    environment: config.environment ?? 'development',
    release: config.release ?? process.env.VERCEL_GIT_COMMIT_SHA,
    // Errors-only for now. Tracing flips on once we have an actual
    // performance budget — until then it just spends our quota.
    tracesSampleRate: 0,
  });
  active = sdk;
  return sdk;
}

/**
 * Send an error to Sentry if init succeeded; no-op otherwise. The
 * `extra` payload mirrors what we log to stdout, so a Sentry event
 * and the corresponding log line carry identical context.
 */
export function captureError(
  err: unknown,
  surface: string,
  extra?: Record<string, unknown>,
): void {
  if (!active) return;
  const error = err instanceof Error ? err : new Error(String(err));
  active.withScope((scope) => {
    scope.setTag('surface', surface);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        scope.setExtra(k, v);
      }
    }
    active!.captureException(error);
  });
}

/** Test-only: clear the singleton so each test starts from a clean slate. */
export function _resetSentryForTests(): void {
  active = undefined;
  initialized = false;
}
