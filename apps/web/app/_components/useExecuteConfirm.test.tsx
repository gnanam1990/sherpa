import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIRM_POLL_DELAYS_MS, useExecuteConfirm } from './useExecuteConfirm';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useExecuteConfirm', () => {
  it('uses the requested 1s, 2s, 3s, 5s capped backoff sequence', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, status: 'pending' }));
    const { result } = renderHook(() => useExecuteConfirm({ fetcher }));

    act(() => result.current.start(7));
    expect(CONFIRM_POLL_DELAYS_MS).toEqual([1000, 2000, 3000, 5000]);
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(fetcher).toHaveBeenCalledTimes(3);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(fetcher).toHaveBeenCalledTimes(4);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(fetcher).toHaveBeenCalledTimes(5);

    expect(fetcher).toHaveBeenLastCalledWith('/api/execute/7/confirm', { method: 'GET' });
  });

  it('shows Confirming before 30 seconds and long-wait copy after 30 seconds', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, status: 'pending' }));
    const { result } = renderHook(() => useExecuteConfirm({ fetcher }));

    act(() => result.current.start(9));
    expect(result.current.message).toBe('Confirming...');

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    expect(result.current.status).toBe('long_wait');
    expect(result.current.message).toBe('Still waiting... (longer than usual)');
  });

  it('times out at 60 seconds with a refresh CTA message', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, status: 'pending' }));
    const { result } = renderHook(() => useExecuteConfirm({ fetcher }));

    act(() => result.current.start(11));
    await act(async () => vi.advanceTimersByTimeAsync(60_000));

    expect(result.current.status).toBe('timeout');
    expect(result.current.errorDetail).toBe('TIMEOUT');
    expect(result.current.message).toBe('Refresh to check status');
  });

  it('ignores stale responses after reset', async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { result } = renderHook(() => useExecuteConfirm({ fetcher }));

    act(() => result.current.start(14));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => result.current.reset());
    resolveFetch(
      new Response(JSON.stringify({ ok: true, status: 'success', txHash: `0x${'c'.repeat(64)}` }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.txHash).toBeUndefined();
  });

  it('returns success with the confirmed transaction hash', async () => {
    const txHash = `0x${'a'.repeat(64)}`;
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, status: 'success', txHash }));
    const { result } = renderHook(() => useExecuteConfirm({ fetcher }));

    act(() => result.current.start(12));
    await act(async () => vi.advanceTimersByTimeAsync(1000));

    expect(result.current.status).toBe('success');
    expect(result.current.txHash).toBe(txHash);
  });

  it('returns failure with M3 error_detail', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ ok: true, status: 'failed', error_detail: 'SIMULATION_FAILED' }),
    );
    const { result } = renderHook(() => useExecuteConfirm({ fetcher }));

    act(() => result.current.start(13));
    await act(async () => vi.advanceTimersByTimeAsync(1000));

    expect(result.current.status).toBe('failure');
    expect(result.current.errorDetail).toBe('SIMULATION_FAILED');
  });
});
