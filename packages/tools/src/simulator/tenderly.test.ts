import { describe, it, expect, vi } from 'vitest';
import { createSimulator, type SimulatorCall, type TenderlyConfig } from './tenderly.js';

const CONFIG: TenderlyConfig = {
  apiKey: 'test-key-123',
  user: 'sherpa-test',
  project: 'sherpa-dev',
};

const CALL: SimulatorCall = {
  to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  value: 0n,
};

const SENDER = '0x1111111111111111111111111111111111111111';

function okResponse(gasUsed = 21000): Response {
  return new Response(
    JSON.stringify({ transaction: { status: true, gas_used: gasUsed } }),
    { status: 200 },
  );
}

function revertResponse(message = 'execution reverted'): Response {
  return new Response(
    JSON.stringify({
      transaction: {
        status: false,
        error_info: { error_message: message, error_type: 'revert' },
      },
    }),
    { status: 200 },
  );
}

function insufficientFundsResponse(): Response {
  return new Response(
    JSON.stringify({
      transaction: {
        status: false,
        error_info: {
          error_message: 'insufficient funds for gas * price + value',
          error_type: 'insufficient_funds',
        },
      },
    }),
    { status: 200 },
  );
}

describe('tools/simulator/tenderly', () => {
  it('successful simulation returns gas estimate', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse(45000));
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.gasEstimate).toBe(45000n);
      expect(result.simulatedAt).toBeGreaterThan(0);
    }
  });

  it('revert simulation returns SIMULATION_REVERT', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(revertResponse('ERC20: transfer amount exceeds balance'));
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('SIMULATION_REVERT');
      expect(result.errorMessage).toContain('ERC20');
    }
  });

  it('insufficient funds returns INSUFFICIENT_FUNDS_FOR_GAS', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(insufficientFundsResponse());
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('INSUFFICIENT_FUNDS_FOR_GAS');
    }
  });

  it('timeout returns TIMEOUT', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(abortError);
    // Use a no-op setTimeout so the AbortController timer doesn't fire
    // (we're simulating the abort via the fetch rejection instead)
    const setTimeoutImpl = vi.fn<typeof setTimeout>().mockReturnValue(0 as unknown as ReturnType<typeof setTimeout>);
    const sim = createSimulator(CONFIG, { fetchImpl, setTimeoutImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('TIMEOUT');
    }
  });

  it('network error retries once then returns NETWORK_ERROR', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(fetchImpl).toHaveBeenCalledTimes(2); // 1 original + 1 retry
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.errorMessage).toContain('ECONNREFUSED');
    }
  });

  it('network error succeeds on retry', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(okResponse(30000));
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.gasEstimate).toBe(30000n);
    }
  });

  it('empty calls returns INVALID_USEROP', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([], SENDER);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('INVALID_USEROP');
    }
  });

  it('401 response returns NETWORK_ERROR with auth hint', async () => {
    // Use mockImplementation to create fresh Response per call
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response('Unauthorized', { status: 401 }),
    );
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.errorMessage).toContain('401');
    }
  });

  it('429 rate limit returns NETWORK_ERROR', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response('rate limited', { status: 429 }),
    );
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('NETWORK_ERROR');
      expect(result.errorMessage).toContain('rate limit');
    }
  });

  it('DI fetchImpl receives correct URL, headers, and body shape', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = Object.fromEntries(new Headers(init?.headers).entries());
      capturedBody = JSON.parse(String(init?.body));
      return okResponse();
    });
    const sim = createSimulator(CONFIG, { fetchImpl });
    await sim.simulate([CALL], SENDER);

    expect(capturedUrl).toContain('/api/v1/account/sherpa-test/project/sherpa-dev/simulate');
    expect(capturedHeaders['x-access-key']).toBe('test-key-123');
    expect(capturedHeaders['content-type']).toBe('application/json');
    expect(capturedBody.network_id).toBe('84532');
    expect(capturedBody.from).toBe(SENDER);
    expect(capturedBody.to).toBe(CALL.to);
    expect(capturedBody.input).toBe(CALL.data);
  });

  it('cache hit returns same result without calling Tenderly again', async () => {
    const nowMs = 1_000_000;
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse(50000));
    const sim = createSimulator(CONFIG, { fetchImpl, now: () => nowMs });

    const r1 = await sim.simulate([CALL], SENDER);
    const r2 = await sim.simulate([CALL], SENDER);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
  });

  it('cache expires after 30s TTL', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => okResponse(50000));
    let nowMs = 1_000_000;
    const sim = createSimulator(CONFIG, { fetchImpl, now: () => nowMs });

    await sim.simulate([CALL], SENDER);
    nowMs += 30_001; // past TTL
    await sim.simulate([CALL], SENDER);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('cache key is case-insensitive for sender address', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const sim = createSimulator(CONFIG, { fetchImpl });

    await sim.simulate([CALL], '0xAAAA');
    await sim.simulate([CALL], '0xaaaa');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('non-JSON response returns NETWORK_ERROR', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response('html error page', { status: 200 }),
    );
    const sim = createSimulator(CONFIG, { fetchImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('NETWORK_ERROR');
    }
  });

  it('timeout retries once then returns TIMEOUT on second timeout', async () => {
    const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    const fetchImpl = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(abortError);
    const setTimeoutImpl = vi.fn<typeof setTimeout>().mockReturnValue(0 as unknown as ReturnType<typeof setTimeout>);
    const sim = createSimulator(CONFIG, { fetchImpl, setTimeoutImpl });
    const result = await sim.simulate([CALL], SENDER);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('TIMEOUT');
    }
  });
});
