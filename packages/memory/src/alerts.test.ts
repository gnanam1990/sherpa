import { describe, test, expect } from 'vitest';
import {
  InMemoryAlertStore,
  createAlert,
  getActiveAlerts,
  getAlertsByUser,
  updateAlert,
  deleteAlert,
  logEvaluation,
  type CreateAlertInput,
} from './alerts.js';

function makeInput(overrides: Partial<CreateAlertInput> = {}): CreateAlertInput {
  return {
    userAddress: '0x1234567890123456789012345678901234567890',
    conditionType: 'price',
    comparison: '>',
    threshold: 5000,
    ...overrides,
  };
}

describe('InMemoryAlertStore', () => {
  describe('create', () => {
    test('creates an alert with defaults', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('active');
      expect(alert.trigger_count).toBe(0);
      expect(alert.one_shot).toBe(false);
      expect(alert.cooldown_seconds).toBe(3600);
    });

    test('creates alert with custom params', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(
        makeInput({
          oneShot: true,
          cooldownSeconds: 600,
          notificationChannels: ['telegram'],
          params: { symbol: 'ETH' },
        }),
      );
      expect(alert.one_shot).toBe(true);
      expect(alert.cooldown_seconds).toBe(600);
      expect(alert.notification_channels).toEqual(['telegram']);
      expect(alert.params).toEqual({ symbol: 'ETH' });
    });

    test('sets created_at timestamp', async () => {
      const store = new InMemoryAlertStore();
      const before = Date.now();
      const alert = await store.create(makeInput());
      expect(new Date(alert.created_at).getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('getActive', () => {
    test('returns only active alerts', async () => {
      const store = new InMemoryAlertStore();
      await store.create(makeInput());
      const a2 = await store.create(makeInput());
      await store.update(a2.id, { status: 'paused' });
      const active = await store.getActive();
      expect(active).toHaveLength(1);
      expect(active[0]!.status).toBe('active');
    });

    test('returns empty array when no active alerts', async () => {
      const store = new InMemoryAlertStore();
      expect(await store.getActive()).toEqual([]);
    });
  });

  describe('getByUser', () => {
    test('returns alerts for specific user', async () => {
      const store = new InMemoryAlertStore();
      await store.create(makeInput({ userAddress: '0xaaaa' }));
      await store.create(makeInput({ userAddress: '0xbbbb' }));
      const alerts = await store.getByUser('0xaaaa');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.user_address).toBe('0xaaaa');
    });

    test('returns empty for unknown user', async () => {
      const store = new InMemoryAlertStore();
      expect(await store.getByUser('0xunknown')).toEqual([]);
    });
  });

  describe('getById', () => {
    test('returns alert by id', async () => {
      const store = new InMemoryAlertStore();
      const created = await store.create(makeInput());
      const found = await store.getById(created.id);
      expect(found?.id).toBe(created.id);
    });

    test('returns null for unknown id', async () => {
      const store = new InMemoryAlertStore();
      expect(await store.getById('nonexistent')).toBeNull();
    });
  });

  describe('update', () => {
    test('updates status', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      const updated = await store.update(alert.id, { status: 'paused' });
      expect(updated?.status).toBe('paused');
    });

    test('updates threshold', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput({ threshold: 5000 }));
      const updated = await store.update(alert.id, { threshold: 6000 });
      expect(updated?.threshold).toBe('6000');
    });

    test('updates notification channels', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      const updated = await store.update(alert.id, { notificationChannels: ['telegram'] });
      expect(updated?.notification_channels).toEqual(['telegram']);
    });

    test('returns null for nonexistent alert', async () => {
      const store = new InMemoryAlertStore();
      expect(await store.update('nonexistent', { status: 'paused' })).toBeNull();
    });
  });

  describe('delete', () => {
    test('deletes alert', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      expect(await store.delete(alert.id)).toBe(true);
      expect(await store.getById(alert.id)).toBeNull();
    });

    test('returns false for nonexistent alert', async () => {
      const store = new InMemoryAlertStore();
      expect(await store.delete('nonexistent')).toBe(false);
    });
  });

  describe('markEvaluated', () => {
    test('updates last_evaluated_at and last_value', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      await store.markEvaluated(alert.id, 5500);
      const updated = await store.getById(alert.id);
      expect(updated?.last_evaluated_at).not.toBeNull();
      expect(updated?.last_value).toBe('5500');
    });
  });

  describe('markTriggered', () => {
    test('increments trigger count', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      await store.markTriggered(alert.id);
      const updated = await store.getById(alert.id);
      expect(updated?.trigger_count).toBe(1);
      expect(updated?.last_triggered_at).not.toBeNull();
    });

    test('disables one-shot alerts', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput({ oneShot: true }));
      await store.markTriggered(alert.id);
      const updated = await store.getById(alert.id);
      expect(updated?.status).toBe('completed');
    });
  });

  describe('logEvaluation', () => {
    test('logs evaluation entry', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      const entry = await store.logEvaluation({
        alertId: alert.id,
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'price',
        evaluatedValue: 5500,
        threshold: 5000,
        triggered: true,
      });
      expect(entry.alert_id).toBe(alert.id);
      expect(entry.triggered).toBe(true);
    });

    test('stores evaluation history', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      await store.logEvaluation({
        alertId: alert.id,
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'price',
        evaluatedValue: 5500,
        threshold: 5000,
        triggered: true,
      });
      await store.logEvaluation({
        alertId: alert.id,
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'price',
        evaluatedValue: 4800,
        threshold: 5000,
        triggered: false,
      });
      const history = await store.getEvaluationHistory(alert.id);
      expect(history).toHaveLength(2);
    });
  });

  describe('disable', () => {
    test('sets status to completed', async () => {
      const store = new InMemoryAlertStore();
      const alert = await store.create(makeInput());
      await store.disable(alert.id);
      const updated = await store.getById(alert.id);
      expect(updated?.status).toBe('completed');
    });
  });
});

describe('convenience functions', () => {
  test('createAlert works with default store', async () => {
    const alert = await createAlert(makeInput());
    expect(alert.id).toBeDefined();
  });

  test('getActiveAlerts returns active alerts', async () => {
    const store = new InMemoryAlertStore();
    await store.create(makeInput());
    const active = await getActiveAlerts(store);
    expect(active.length).toBeGreaterThanOrEqual(1);
  });

  test('getAlertsByUser returns user alerts', async () => {
    const store = new InMemoryAlertStore();
    await store.create(makeInput({ userAddress: '0xuser' }));
    const alerts = await getAlertsByUser('0xuser', store);
    expect(alerts).toHaveLength(1);
  });

  test('updateAlert updates alert', async () => {
    const store = new InMemoryAlertStore();
    const alert = await store.create(makeInput());
    const updated = await updateAlert(alert.id, { status: 'paused' }, store);
    expect(updated?.status).toBe('paused');
  });

  test('deleteAlert deletes alert', async () => {
    const store = new InMemoryAlertStore();
    const alert = await store.create(makeInput());
    const deleted = await deleteAlert(alert.id, store);
    expect(deleted).toBe(true);
  });

  test('logEvaluation logs entry', async () => {
    const store = new InMemoryAlertStore();
    const alert = await store.create(makeInput());
    const entry = await logEvaluation(
      {
        alertId: alert.id,
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'price',
        evaluatedValue: 5500,
        threshold: 5000,
        triggered: true,
      },
      store,
    );
    expect(entry.triggered).toBe(true);
  });
});
