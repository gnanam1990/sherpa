/**
 * @sherpa/logger — thin logger facade (M3 ownership).
 *
 * Week-1 scope: console-backed stub with pino-compatible surface. Swap for
 * `pino` in a later week without changing callers.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function emit(level: LogLevel, bindings: Record<string, unknown>) {
  return (msg: string, meta?: Record<string, unknown>) => {
    const payload = { level, msg, ...bindings, ...(meta ?? {}) };
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
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
