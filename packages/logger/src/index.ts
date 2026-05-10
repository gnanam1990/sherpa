/**
 * @sherpa/logger — thin logger facade (M3 ownership).
 *
 * Week-1 scope: console-backed stub with pino-compatible surface. Swap for
 * `pino` in a later week without changing callers.
 *
 * Errors fan out to Sentry via `captureError` (`./sentry.ts`) when
 * `initSentry` has been called with a DSN; otherwise the Sentry path is
 * a no-op and only stdout/stderr receive the line. The `surface`
 * binding (`api` | `cron`) is forwarded as a Sentry tag so a Sentry
 * event and its log line are always cross-referenceable.
 */

import { captureError } from './sentry.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  /**
   * Errors are written to stderr AND reported to Sentry (when DSN set).
   * Pass the underlying Error via `meta.err` if you have one — the
   * Sentry stack trace will reference it; otherwise a synthetic Error
   * is constructed from `msg` so we still get a frame.
   */
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function emit(level: LogLevel, bindings: Record<string, unknown>) {
  return (msg: string, meta?: Record<string, unknown>) => {
    const payload = { level, msg, ...bindings, ...(meta ?? {}) };
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
      const surface = String(bindings.surface ?? meta?.surface ?? 'api');
      const err = meta && meta.err instanceof Error ? meta.err : msg;
      // `extra` excludes `err` (already the exception subject) and
      // `surface` (already a tag) so the Sentry event isn't redundant.
      const extra: Record<string, unknown> = { ...bindings };
      if (meta) {
        for (const [k, v] of Object.entries(meta)) {
          if (k !== 'err' && k !== 'surface') extra[k] = v;
        }
      }
      captureError(err, surface, extra);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };
}

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  return {
    debug: emit('debug', bindings),
    info: emit('info', bindings),
    warn: emit('warn', bindings),
    error: emit('error', bindings),
    child(more) {
      return createLogger({ ...bindings, ...more });
    },
  };
}

export * from './sentry.js';
