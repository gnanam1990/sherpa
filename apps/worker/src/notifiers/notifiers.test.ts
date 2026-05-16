import { describe, test, expect } from 'vitest';
import { formatAlertPayload, dispatchAlertNotification } from './index.js';
import type { AlertRow } from './telegram.js';

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

describe('formatAlertPayload', () => {
  test('formats price alert payload', () => {
    const alert = makeAlert({ condition_type: 'price', asset: { symbol: 'ETH' } });
    const payload = formatAlertPayload(alert, 5500);
    expect(payload.title).toContain('ETH');
    expect(payload.title).toContain('Alert Triggered');
    expect(payload.body).toContain('5500');
    expect(payload.body).toContain('> 5000');
    expect(payload.data?.alertId).toBe('test-alert-1');
    expect(payload.data?.currentValue).toBe('5500');
  });

  test('formats health-factor alert payload', () => {
    const alert = makeAlert({
      condition_type: 'health-factor',
      asset: { symbol: 'Aave HF' },
      comparison: '<',
      threshold: '1.5',
    });
    const payload = formatAlertPayload(alert, 1.2);
    expect(payload.body).toContain('1.2');
    expect(payload.body).toContain('< 1.5');
  });

  test('formats gas alert payload', () => {
    const alert = makeAlert({
      condition_type: 'gas',
      asset: { symbol: 'Gas' },
      comparison: '<',
      threshold: '20',
    });
    const payload = formatAlertPayload(alert, 15);
    expect(payload.body).toContain('15');
    expect(payload.body).toContain('< 20');
  });

  test('includes data fields', () => {
    const alert = makeAlert();
    const payload = formatAlertPayload(alert, 100);
    expect(payload.data).toBeDefined();
    expect(payload.data?.alertId).toBe('test-alert-1');
    expect(payload.data?.conditionType).toBe('price');
  });

  test('handles missing asset symbol', () => {
    const alert = makeAlert({ asset: null });
    const payload = formatAlertPayload(alert, 100);
    expect(payload.title).toBeDefined();
    expect(payload.body).toBeDefined();
  });
});

describe('dispatchAlertNotification', () => {
  test('dispatches to push channel by default', async () => {
    const alert = makeAlert({ notification_channels: ['push'] });
    const results = await dispatchAlertNotification(alert, {
      title: 'Test',
      body: 'Test body',
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('success');
  });

  test('dispatches to multiple channels', async () => {
    const alert = makeAlert({ notification_channels: ['push', 'telegram'] });
    const results = await dispatchAlertNotification(alert, {
      title: 'Test',
      body: 'Test body',
    });
    expect(results).toHaveLength(2);
  });

  test('handles empty notification channels', async () => {
    const alert = makeAlert({ notification_channels: [] });
    const results = await dispatchAlertNotification(alert, {
      title: 'Test',
      body: 'Test body',
    });
    expect(results).toHaveLength(0);
  });

  test('handles unknown channel gracefully', async () => {
    const alert = makeAlert({ notification_channels: ['unknown'] });
    const results = await dispatchAlertNotification(alert, {
      title: 'Test',
      body: 'Test body',
    });
    expect(results).toHaveLength(1);
  });

  test('returns results for each channel', async () => {
    const alert = makeAlert({ notification_channels: ['push', 'farcaster', 'telegram'] });
    const results = await dispatchAlertNotification(alert, {
      title: 'Test',
      body: 'Test body',
    });
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r).toHaveProperty('success');
    });
  });
});
