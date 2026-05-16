import { describe, test, expect } from 'vitest';
import { runAlertCycle, shouldEvaluate, isInCooldown } from './alert-runner.js';

type AlertRow = {
  id: string;
  user_address: string;
  condition_type: string;
  asset: Record<string, string> | null;
  comparison: string;
  threshold: string;
  threshold_asset: Record<string, string> | null;
  notification_channels: string[];
  triggered_intent: string | null;
  status: string;
  created_at: string;
  last_evaluated_at: string | null;
  triggered_at: string | null;
  trigger_count: number;
  last_value: string | null;
  params: Record<string, unknown>;
  one_shot: boolean;
  cooldown_seconds: number;
  last_triggered_at: string | null;
};

type AlertStore = {
  create(input: Record<string, unknown>): Promise<AlertRow>;
  getActive(): Promise<AlertRow[]>;
  getById(id: string): Promise<AlertRow | null>;
  update(id: string, updates: Record<string, unknown>): Promise<AlertRow | null>;
  markEvaluated(id: string, value: number): Promise<void>;
  markTriggered(id: string): Promise<void>;
  logEvaluation(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  getEvaluationHistory(alertId: string): Promise<Record<string, unknown>[]>;
};

function makeAlert(overrides: Partial<AlertRow> = {}): AlertRow {
  return {
    id: 'test-alert-1',
    user_address: '0x1234567890123456789012345678901234567890',
    condition_type: 'price',
    asset: { symbol: 'ETH' },
    comparison: '>',
    threshold: '0',
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

class LocalAlertStore implements AlertStore {
  private alerts = new Map<string, AlertRow>();
  private evaluations: Record<string, unknown>[] = [];

  async create(input: Record<string, unknown>): Promise<AlertRow> {
    const id = crypto.randomUUID();
    const mapped = {
      id,
      user_address: input.userAddress ?? input.user_address,
      condition_type: input.conditionType ?? input.condition_type,
      comparison: input.comparison,
      threshold: String(input.threshold ?? '0'),
      notification_channels: input.notificationChannels ?? input.notification_channels ?? ['push'],
      one_shot: input.oneShot ?? input.one_shot ?? false,
      cooldown_seconds: input.cooldownSeconds ?? input.cooldown_seconds ?? 3600,
      params: input.params ?? {},
    };
    const row = makeAlert(mapped as Partial<AlertRow>);
    this.alerts.set(id, row);
    return row;
  }

  async getActive(): Promise<AlertRow[]> {
    return [...this.alerts.values()].filter((a) => a.status === 'active');
  }

  async getById(id: string): Promise<AlertRow | null> {
    return this.alerts.get(id) ?? null;
  }

  async update(id: string, updates: Record<string, unknown>): Promise<AlertRow | null> {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    if (updates.status) alert.status = updates.status as string;
    return alert;
  }

  async markEvaluated(id: string, value: number): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.last_evaluated_at = new Date().toISOString();
      alert.last_value = String(value);
    }
  }

  async markTriggered(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.last_triggered_at = new Date().toISOString();
      alert.trigger_count++;
      if (alert.one_shot) alert.status = 'completed';
    }
  }

  async logEvaluation(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.evaluations.push(input);
    return input;
  }

  async getEvaluationHistory(): Promise<Record<string, unknown>[]> {
    return this.evaluations;
  }
}

describe('alert-runner', () => {
  describe('shouldEvaluate', () => {
    test('returns true for active alerts with no prior evaluation', () => {
      const alert = makeAlert({ status: 'active', last_evaluated_at: null });
      expect(shouldEvaluate(alert)).toBe(true);
    });

    test('returns true when enough time has passed', () => {
      const alert = makeAlert({
        status: 'active',
        last_evaluated_at: new Date(Date.now() - 120000).toISOString(),
        cooldown_seconds: 60,
      });
      expect(shouldEvaluate(alert)).toBe(true);
    });

    test('returns false when not enough time has passed', () => {
      const alert = makeAlert({
        status: 'active',
        last_evaluated_at: new Date().toISOString(),
        cooldown_seconds: 3600,
      });
      expect(shouldEvaluate(alert)).toBe(false);
    });

    test('returns false for non-active alerts', () => {
      expect(shouldEvaluate(makeAlert({ status: 'paused' }))).toBe(false);
      expect(shouldEvaluate(makeAlert({ status: 'completed' }))).toBe(false);
      expect(shouldEvaluate(makeAlert({ status: 'triggered' }))).toBe(false);
    });
  });

  describe('isInCooldown', () => {
    test('returns false when never triggered', () => {
      expect(isInCooldown(makeAlert({ last_triggered_at: null }))).toBe(false);
    });

    test('returns true within cooldown window', () => {
      const alert = makeAlert({
        last_triggered_at: new Date().toISOString(),
        cooldown_seconds: 3600,
      });
      expect(isInCooldown(alert)).toBe(true);
    });

    test('returns false after cooldown expires', () => {
      const alert = makeAlert({
        last_triggered_at: new Date(Date.now() - 7200000).toISOString(),
        cooldown_seconds: 3600,
      });
      expect(isInCooldown(alert)).toBe(false);
    });
  });

  describe('runAlertCycle', () => {
    test('returns zero counts when no active alerts', async () => {
      const store = new LocalAlertStore();
      const result = await runAlertCycle(store);
      expect(result.evaluated).toBe(0);
      expect(result.triggered).toBe(0);
      expect(result.failed).toBe(0);
    });

    test('evaluates active alerts', async () => {
      const store = new LocalAlertStore();
      await store.create({
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'gas',
        comparison: '<',
        threshold: 999999,
        notificationChannels: ['push'],
      });
      const result = await runAlertCycle(store);
      expect(result.evaluated).toBeGreaterThanOrEqual(1);
    });

    test('marks alerts as evaluated', async () => {
      const store = new LocalAlertStore();
      const alert = await store.create({
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'gas',
        comparison: '>=',
        threshold: 0,
        notificationChannels: ['push'],
      });
      await runAlertCycle(store);
      const updated = await store.getById(alert.id);
      expect(updated?.last_evaluated_at).not.toBeNull();
    });

    test('does not re-evaluate within cooldown', async () => {
      const store = new LocalAlertStore();
      await store.create({
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'gas',
        comparison: '>=',
        threshold: 0,
        notificationChannels: ['push'],
        cooldownSeconds: 3600,
      });
      await runAlertCycle(store);
      const result2 = await runAlertCycle(store);
      expect(result2.evaluated).toBe(0);
    });

    test('respects one-shot alerts', async () => {
      const store = new LocalAlertStore();
      const alert = await store.create({
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'gas',
        comparison: '>=',
        threshold: 0,
        notificationChannels: ['push'],
        oneShot: true,
      });
      // Verify one-shot alert starts active
      const before = await store.getById(alert.id);
      expect(before?.status).toBe('active');
      expect(before?.one_shot).toBe(true);

      // Simulate triggering via store directly
      await store.markTriggered(alert.id);
      const after = await store.getById(alert.id);
      expect(after?.status).toBe('completed');
      expect(after?.trigger_count).toBe(1);
    });

    test('skips non-active alerts', async () => {
      const store = new LocalAlertStore();
      const alert = await store.create({
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'price',
        comparison: '>',
        threshold: 5000,
        notificationChannels: ['push'],
      });
      await store.update(alert.id, { status: 'paused' });
      const result = await runAlertCycle(store);
      expect(result.evaluated).toBe(0);
    });

    test('logs evaluations to store', async () => {
      const store = new LocalAlertStore();
      await store.create({
        userAddress: '0x1234567890123456789012345678901234567890',
        conditionType: 'gas',
        comparison: '>=',
        threshold: 0,
        notificationChannels: ['push'],
      });
      await runAlertCycle(store);
      const history = await store.getEvaluationHistory('test');
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });
});
