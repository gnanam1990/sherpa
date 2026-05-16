import { describe, test, expect, vi, afterEach } from 'vitest';
import { evaluateHealthFactor, fetchAaveHealthFactor } from './health-factor.js';

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-alert',
    user_address: '0x1234567890123456789012345678901234567890',
    condition_type: 'health-factor',
    comparison: '<',
    threshold: '1.5',
    asset: null,
    threshold_asset: null,
    notification_channels: [],
    triggered_intent: null,
    status: 'active',
    created_at: new Date().toISOString(),
    last_evaluated_at: null,
    triggered_at: null,
    trigger_count: 0,
    last_value: null,
    params: {},
    one_shot: false,
    cooldown_seconds: 3600,
    last_triggered_at: null,
    ...overrides,
  };
}

// Encode a getUserAccountData response with 6 uint256 words (Aave V3)
function encodeAccountData({
  totalCollateral = 0n,
  totalDebt = 0n,
  availableBorrows = 0n,
  liquidationThreshold = 0n,
  ltv = 0n,
  healthFactor = 2n * 10n ** 18n,
}: {
  totalCollateral?: bigint;
  totalDebt?: bigint;
  availableBorrows?: bigint;
  liquidationThreshold?: bigint;
  ltv?: bigint;
  healthFactor?: bigint;
}): string {
  const pad = (n: bigint) => n.toString(16).padStart(64, '0');
  return (
    '0x' +
    pad(totalCollateral) +
    pad(totalDebt) +
    pad(availableBorrows) +
    pad(liquidationThreshold) +
    pad(ltv) +
    pad(healthFactor)
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchAaveHealthFactor', () => {
  test('throws on HTTP error — no fake zero (P0-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    await expect(fetchAaveHealthFactor('0x1234567890123456789012345678901234567890'))
      .rejects.toThrow('rpc_http_503');
  });

  test('throws on JSON-RPC error — no fake zero (P0-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: 'execution reverted' } }),
    }));
    await expect(fetchAaveHealthFactor('0x1234567890123456789012345678901234567890'))
      .rejects.toThrow('rpc_error: execution reverted');
  });

  test('throws on network failure — no fake zero (P0-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(fetchAaveHealthFactor('0x1234567890123456789012345678901234567890'))
      .rejects.toThrow('ECONNREFUSED');
  });

  test('reads healthFactor from word 5 — correct Aave V3 decoding (P2-7)', async () => {
    const encoded = encodeAccountData({
      totalDebt: 500n * 10n ** 8n,
      healthFactor: 155n * 10n ** 16n, // 1.55
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: encoded }),
    }));
    const hf = await fetchAaveHealthFactor('0x1234567890123456789012345678901234567890');
    expect(hf).toBeCloseTo(1.55, 5);
  });

  test('returns Infinity when totalDebt is zero', async () => {
    const encoded = encodeAccountData({ totalDebt: 0n });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: encoded }),
    }));
    const hf = await fetchAaveHealthFactor('0x1234567890123456789012345678901234567890');
    expect(hf).toBe(Infinity);
  });

  test('returns 0 when result is empty (no Aave position)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: '0x' }),
    }));
    const hf = await fetchAaveHealthFactor('0x1234567890123456789012345678901234567890');
    expect(hf).toBe(0);
  });
});

describe('evaluateHealthFactor', () => {
  test('RPC failure returns error result — does not trigger (P0-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await evaluateHealthFactor(makeAlert() as never);
    expect(result.triggered).toBe(false);
    expect(result.error).toContain('rpc_failure');
    expect(result.value).toBe(0);
  });

  test('triggers when HF below threshold', async () => {
    const encoded = encodeAccountData({
      totalDebt: 500n * 10n ** 8n,
      healthFactor: 12n * 10n ** 17n, // 1.2
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: encoded }),
    }));
    const result = await evaluateHealthFactor(makeAlert({ comparison: '<', threshold: '1.5' }) as never);
    expect(result.triggered).toBe(true);
    expect(result.value).toBeCloseTo(1.2, 5);
  });

  test('does not trigger when HF above threshold', async () => {
    const encoded = encodeAccountData({
      totalDebt: 500n * 10n ** 8n,
      healthFactor: 2n * 10n ** 18n, // 2.0
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: encoded }),
    }));
    const result = await evaluateHealthFactor(makeAlert({ comparison: '<', threshold: '1.5' }) as never);
    expect(result.triggered).toBe(false);
    expect(result.value).toBeCloseTo(2.0, 5);
  });

  test('returns error for missing user_address', async () => {
    const result = await evaluateHealthFactor(makeAlert({ user_address: '' }) as never);
    expect(result.triggered).toBe(false);
    expect(result.error).toContain('missing user_address');
  });
});
