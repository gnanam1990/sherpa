import type pg from 'pg';
import { query } from '@sherpa/config';

export type AlertRow = {
  id: string;
  user_address: string;
  condition_type: string;
  asset: Record<string, unknown> | null;
  comparison: string;
  threshold: string;
  threshold_asset: Record<string, unknown> | null;
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

export type CreateAlertInput = {
  userAddress: string;
  conditionType: string;
  asset?: Record<string, unknown>;
  comparison: string;
  threshold: number;
  thresholdAsset?: Record<string, unknown>;
  notificationChannels?: string[];
  triggeredIntent?: string;
  params?: Record<string, unknown>;
  oneShot?: boolean;
  cooldownSeconds?: number;
};

export type UpdateAlertInput = {
  status?: string;
  threshold?: number;
  comparison?: string;
  notificationChannels?: string[];
  oneShot?: boolean;
  cooldownSeconds?: number;
};

export type AlertEvaluationInput = {
  alertId: string;
  userAddress: string;
  conditionType: string;
  evaluatedValue: number;
  threshold: number;
  triggered: boolean;
  error?: string;
};

export type AlertEvaluationRow = {
  id: string;
  alert_id: string;
  user_address: string;
  condition_type: string;
  evaluated_value: string | null;
  threshold: string | null;
  triggered: boolean;
  error: string | null;
  evaluated_at: string;
};

// ── In-memory implementation ──────────────────────────────────────────

export interface AlertStore {
  create(input: CreateAlertInput): Promise<AlertRow>;
  getActive(): Promise<AlertRow[]>;
  getByUser(userAddress: string): Promise<AlertRow[]>;
  getById(id: string): Promise<AlertRow | null>;
  update(id: string, updates: UpdateAlertInput): Promise<AlertRow | null>;
  delete(id: string): Promise<boolean>;
  markEvaluated(id: string, value: number): Promise<void>;
  markTriggered(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  logEvaluation(input: AlertEvaluationInput): Promise<AlertEvaluationRow>;
  getEvaluationHistory(alertId: string, limit?: number): Promise<AlertEvaluationRow[]>;
}

export class InMemoryAlertStore implements AlertStore {
  private alerts = new Map<string, AlertRow>();
  private evaluations: AlertEvaluationRow[] = [];
  private nextId = 1;

  async create(input: CreateAlertInput): Promise<AlertRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row: AlertRow = {
      id,
      user_address: input.userAddress,
      condition_type: input.conditionType,
      asset: input.asset ?? null,
      comparison: input.comparison,
      threshold: String(input.threshold),
      threshold_asset: input.thresholdAsset ?? null,
      notification_channels: input.notificationChannels ?? ['push'],
      triggered_intent: input.triggeredIntent ?? null,
      status: 'active',
      created_at: now,
      last_evaluated_at: null,
      triggered_at: null,
      trigger_count: 0,
      last_value: null,
      params: input.params ?? {},
      one_shot: input.oneShot ?? false,
      cooldown_seconds: input.cooldownSeconds ?? 3600,
      last_triggered_at: null,
    };
    this.alerts.set(id, row);
    return row;
  }

  async getActive(): Promise<AlertRow[]> {
    return [...this.alerts.values()].filter((a) => a.status === 'active');
  }

  async getByUser(userAddress: string): Promise<AlertRow[]> {
    return [...this.alerts.values()].filter(
      (a) => a.user_address.toLowerCase() === userAddress.toLowerCase(),
    );
  }

  async getById(id: string): Promise<AlertRow | null> {
    return this.alerts.get(id) ?? null;
  }

  async update(id: string, updates: UpdateAlertInput): Promise<AlertRow | null> {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    if (updates.status) alert.status = updates.status;
    if (updates.threshold !== undefined) alert.threshold = String(updates.threshold);
    if (updates.comparison) alert.comparison = updates.comparison;
    if (updates.notificationChannels) alert.notification_channels = updates.notificationChannels;
    if (updates.oneShot !== undefined) alert.one_shot = updates.oneShot;
    if (updates.cooldownSeconds !== undefined) alert.cooldown_seconds = updates.cooldownSeconds;
    return alert;
  }

  async delete(id: string): Promise<boolean> {
    return this.alerts.delete(id);
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
      const now = new Date().toISOString();
      alert.last_triggered_at = now;
      alert.triggered_at = now;
      alert.trigger_count++;
      if (alert.one_shot) alert.status = 'completed';
    }
  }

  async disable(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) alert.status = 'completed';
  }

  async logEvaluation(input: AlertEvaluationInput): Promise<AlertEvaluationRow> {
    const row: AlertEvaluationRow = {
      id: String(this.nextId++),
      alert_id: input.alertId,
      user_address: input.userAddress,
      condition_type: input.conditionType,
      evaluated_value: String(input.evaluatedValue),
      threshold: String(input.threshold),
      triggered: input.triggered,
      error: input.error ?? null,
      evaluated_at: new Date().toISOString(),
    };
    this.evaluations.push(row);
    return row;
  }

  async getEvaluationHistory(alertId: string, limit = 50): Promise<AlertEvaluationRow[]> {
    return this.evaluations
      .filter((e) => e.alert_id === alertId)
      .sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at))
      .slice(0, limit);
  }
}

// ── Postgres implementation ───────────────────────────────────────────

export function createPostgresAlertStore(pool: pg.Pool): AlertStore {
  return {
    async create(input) {
      const res = await query<AlertRow>(
        pool,
        `INSERT INTO alerts (user_address, condition_type, asset, comparison, threshold,
         threshold_asset, notification_channels, triggered_intent, params, one_shot, cooldown_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          input.userAddress,
          input.conditionType,
          input.asset ? JSON.stringify(input.asset) : null,
          input.comparison,
          input.threshold,
          input.thresholdAsset ? JSON.stringify(input.thresholdAsset) : null,
          input.notificationChannels ?? ['push'],
          input.triggeredIntent ?? null,
          JSON.stringify(input.params ?? {}),
          input.oneShot ?? false,
          input.cooldownSeconds ?? 3600,
        ],
      );
      return res.rows[0]!;
    },

    async getActive() {
      const res = await query<AlertRow>(
        pool,
        `SELECT * FROM alerts WHERE status = 'active' ORDER BY last_evaluated_at NULLS FIRST`,
      );
      return res.rows;
    },

    async getByUser(userAddress) {
      const res = await query<AlertRow>(
        pool,
        `SELECT * FROM alerts WHERE user_address = $1 ORDER BY created_at DESC`,
        [userAddress],
      );
      return res.rows;
    },

    async getById(id) {
      const res = await query<AlertRow>(pool, `SELECT * FROM alerts WHERE id = $1`, [id]);
      return res.rows[0] ?? null;
    },

    async update(id, updates) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;
      if (updates.status) {
        sets.push(`status = $${idx++}`);
        vals.push(updates.status);
      }
      if (updates.threshold !== undefined) {
        sets.push(`threshold = $${idx++}`);
        vals.push(updates.threshold);
      }
      if (updates.comparison) {
        sets.push(`comparison = $${idx++}`);
        vals.push(updates.comparison);
      }
      if (updates.notificationChannels) {
        sets.push(`notification_channels = $${idx++}`);
        vals.push(updates.notificationChannels);
      }
      if (updates.oneShot !== undefined) {
        sets.push(`one_shot = $${idx++}`);
        vals.push(updates.oneShot);
      }
      if (updates.cooldownSeconds !== undefined) {
        sets.push(`cooldown_seconds = $${idx++}`);
        vals.push(updates.cooldownSeconds);
      }
      if (sets.length === 0) return this.getById(id);
      vals.push(id);
      const res = await query<AlertRow>(
        pool,
        `UPDATE alerts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals,
      );
      return res.rows[0] ?? null;
    },

    async delete(id) {
      const res = await query(pool, `DELETE FROM alerts WHERE id = $1`, [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async markEvaluated(id, value) {
      await query(
        pool,
        `UPDATE alerts SET last_evaluated_at = now(), last_value = $2 WHERE id = $1`,
        [id, value],
      );
    },

    async markTriggered(id) {
      await query(
        pool,
        `UPDATE alerts SET
         last_triggered_at = now(), triggered_at = now(),
         trigger_count = trigger_count + 1,
         status = CASE WHEN one_shot THEN 'completed' ELSE status END
         WHERE id = $1`,
        [id],
      );
    },

    async disable(id) {
      await query(pool, `UPDATE alerts SET status = 'completed' WHERE id = $1`, [id]);
    },

    async logEvaluation(input) {
      const res = await query<AlertEvaluationRow>(
        pool,
        `INSERT INTO alert_evaluations (alert_id, user_address, condition_type, evaluated_value, threshold, triggered, error)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          input.alertId,
          input.userAddress,
          input.conditionType,
          input.evaluatedValue,
          input.threshold,
          input.triggered,
          input.error ?? null,
        ],
      );
      return res.rows[0]!;
    },

    async getEvaluationHistory(alertId, limit = 50) {
      const res = await query<AlertEvaluationRow>(
        pool,
        `SELECT * FROM alert_evaluations WHERE alert_id = $1 ORDER BY evaluated_at DESC LIMIT $2`,
        [alertId, limit],
      );
      return res.rows;
    },
  };
}

const defaultStore: AlertStore = new InMemoryAlertStore();

export async function createAlert(
  input: CreateAlertInput,
  store: AlertStore = defaultStore,
): Promise<AlertRow> {
  return store.create(input);
}

export async function getActiveAlerts(store: AlertStore = defaultStore): Promise<AlertRow[]> {
  return store.getActive();
}

export async function getAlertsByUser(
  userAddress: string,
  store: AlertStore = defaultStore,
): Promise<AlertRow[]> {
  return store.getByUser(userAddress);
}

export async function updateAlert(
  id: string,
  updates: UpdateAlertInput,
  store: AlertStore = defaultStore,
): Promise<AlertRow | null> {
  return store.update(id, updates);
}

export async function deleteAlert(
  id: string,
  store: AlertStore = defaultStore,
): Promise<boolean> {
  return store.delete(id);
}

export async function logEvaluation(
  input: AlertEvaluationInput,
  store: AlertStore = defaultStore,
): Promise<AlertEvaluationRow> {
  return store.logEvaluation(input);
}
