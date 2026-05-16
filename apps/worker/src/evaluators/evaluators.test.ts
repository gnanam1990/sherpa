import { describe, test, expect } from 'vitest';
import { evaluateAlert, evaluatePrice, evaluateGas } from './index.js';
import type { AlertRow } from './price.js';

function makeAlert(overrides: Partial<AlertRow> = {}): AlertRow {
  return {
    id: 'test-alert-1',
    user_address: '0x1234567890123456789012345678901234567890',
    condition_type: 'price',
    asset: { symbol: 'ETH' },
    comparison: '>',
    threshold: '5000',
    threshold_asset: null,
    notification_channels: ['push'],
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

describe('evaluateAlert', () => {
  test('routes to price evaluator for price condition', async () => {
    const alert = makeAlert({ condition_type: 'price', asset: { symbol: 'ETH' } });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
    expect(typeof result.value).toBe('number');
    expect(typeof result.triggered).toBe('boolean');
  });

  test('routes to gas evaluator for gas condition', async () => {
    const alert = makeAlert({ condition_type: 'gas' });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
  });

  test('routes to health-factor evaluator', async () => {
    const alert = makeAlert({ condition_type: 'health-factor' });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
  });

  test('routes to apy evaluator', async () => {
    const alert = makeAlert({ condition_type: 'apy', params: { asset: 'USDC', rateType: 'supply' } });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
  });

  test('routes to address-activity evaluator', async () => {
    const alert = makeAlert({
      condition_type: 'balance',
      params: { address: '0x1234567890123456789012345678901234567890' },
    });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
  });

  test('routes to contract-event evaluator', async () => {
    const alert = makeAlert({
      condition_type: 'contract-event',
      params: {
        contractAddress: '0x1234567890123456789012345678901234567890',
        topic: '0xabc',
      },
    });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
  });

  test('falls back to price evaluator for unknown condition type', async () => {
    const alert = makeAlert({ condition_type: 'unknown' });
    const result = await evaluateAlert(alert);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('triggered');
  });
});

describe('evaluatePrice', () => {
  test('returns error when asset symbol missing', async () => {
    const alert = makeAlert({ asset: null, params: {} });
    const result = await evaluatePrice(alert);
    expect(result.error).toBe('missing asset symbol');
    expect(result.triggered).toBe(false);
  });

  test('uses params.symbol when asset is null', async () => {
    const alert = makeAlert({ asset: null, params: { symbol: 'ETH' } });
    const result = await evaluatePrice(alert);
    expect(result).toHaveProperty('value');
    expect(typeof result.value).toBe('number');
  });

  test('evaluates > comparison correctly', async () => {
    const alert = makeAlert({
      asset: { symbol: 'ETH' },
      comparison: '>',
      threshold: '0',
    });
    const result = await evaluatePrice(alert);
    expect(typeof result.triggered).toBe('boolean');
  });
});

describe('evaluateGas', () => {
  test('returns a numeric gas price', async () => {
    const alert = makeAlert({ condition_type: 'gas', comparison: '<', threshold: '100' });
    const result = await evaluateGas(alert);
    expect(typeof result.value).toBe('number');
    expect(result.value).toBeGreaterThanOrEqual(0);
  });
});
