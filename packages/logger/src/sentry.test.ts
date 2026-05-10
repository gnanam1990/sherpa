import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _resetSentryForTests,
  captureError,
  initSentry,
  type SentryLike,
} from './sentry.js';
import { createLogger } from './index.js';

function makeStub(): SentryLike & {
  init: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  withScope: ReturnType<typeof vi.fn>;
  _scope: { setTag: ReturnType<typeof vi.fn>; setExtra: ReturnType<typeof vi.fn> };
} {
  const _scope = { setTag: vi.fn(), setExtra: vi.fn() };
  return {
    _scope,
    init: vi.fn(),
    captureException: vi.fn(),
    withScope: vi.fn((cb: (s: typeof _scope) => void) => cb(_scope)),
  };
}

beforeEach(() => {
  _resetSentryForTests();
});

describe('logger/sentry / initSentry', () => {
  it('skips SDK init when DSN is unset', () => {
    const sdk = makeStub();
    const out = initSentry({}, sdk);
    expect(out).toBeUndefined();
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('initializes the SDK with environment + release + tracesSampleRate=0', () => {
    const sdk = makeStub();
    initSentry(
      { dsn: 'https://example/0', environment: 'production', release: 'abc123' },
      sdk,
    );
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith({
      dsn: 'https://example/0',
      environment: 'production',
      release: 'abc123',
      tracesSampleRate: 0,
    });
  });

  it('falls back environment="development" when SENTRY_ENVIRONMENT is unset', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0', release: 'r' }, sdk);
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'development' }),
    );
  });

  it('is idempotent — second init() with same singleton is a no-op', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0' }, sdk);
    initSentry({ dsn: 'https://example/0' }, sdk);
    expect(sdk.init).toHaveBeenCalledTimes(1);
  });
});

describe('logger/sentry / captureError', () => {
  it('is a no-op when init has not been called (DSN unset)', () => {
    const sdk = makeStub();
    captureError(new Error('boom'), 'api');
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it('tags surface and forwards extra inside withScope, then captureException', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0' }, sdk);
    const err = new Error('boom');
    captureError(err, 'cron', { task: 'price_refresh', auditLogId: 7 });
    expect(sdk.withScope).toHaveBeenCalledTimes(1);
    expect(sdk._scope.setTag).toHaveBeenCalledWith('surface', 'cron');
    expect(sdk._scope.setExtra).toHaveBeenCalledWith('task', 'price_refresh');
    expect(sdk._scope.setExtra).toHaveBeenCalledWith('auditLogId', 7);
    expect(sdk.captureException).toHaveBeenCalledWith(err);
  });

  it('wraps non-Error throwables in Error so the Sentry stack frame is preserved', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0' }, sdk);
    captureError('plain string fail', 'api');
    const arg = sdk.captureException.mock.calls[0]![0] as Error;
    expect(arg).toBeInstanceOf(Error);
    expect(arg.message).toBe('plain string fail');
  });
});

describe('logger / createLogger forwards error() to Sentry', () => {
  it('logger.error captures to Sentry with the bound surface tag', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0' }, sdk);
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger({ surface: 'cron' });
    log.error('task failed', { task: 'price_refresh', auditLogId: 7 });
    // Stdout still gets the structured line
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('"surface":"cron"'),
    );
    // Sentry gets the same context — surface as a tag, rest as extras,
    // with the synthetic Error message matching the log message.
    expect(sdk._scope.setTag).toHaveBeenCalledWith('surface', 'cron');
    expect(sdk._scope.setExtra).toHaveBeenCalledWith('task', 'price_refresh');
    expect(sdk._scope.setExtra).toHaveBeenCalledWith('auditLogId', 7);
    const captured = sdk.captureException.mock.calls[0]![0] as Error;
    expect(captured.message).toBe('task failed');
    stderr.mockRestore();
  });

  it('passing meta.err uses the underlying Error (preserves real stack)', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0' }, sdk);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const real = new Error('upstream rpc 502');
    const log = createLogger({ surface: 'api' });
    log.error('rpc call failed', { err: real });
    expect(sdk.captureException).toHaveBeenCalledWith(real);
  });

  it('logger.warn / .info / .debug do NOT touch Sentry', () => {
    const sdk = makeStub();
    initSentry({ dsn: 'https://example/0' }, sdk);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const log = createLogger({ surface: 'api' });
    log.warn('warn msg');
    log.info('info msg');
    log.debug('debug msg');
    expect(sdk.captureException).not.toHaveBeenCalled();
  });
});
