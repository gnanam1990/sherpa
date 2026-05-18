import type { TaskContext } from './hourly-tasks.js';

export type AlertRow = {
  id: string;
  user_address: string;
  condition_type: string;
  asset: Record<string, unknown> | null;
  comparison: string;
  threshold: string;
  notification_channels: string[];
  triggered_intent?: string;
  status: string;
  last_value?: string;
  last_triggered_at?: string;
  cooldown_seconds?: number;
  one_shot?: boolean;
};

export async function runAlertTasks(ctx: TaskContext): Promise<{ ok: boolean; detail?: string }> {
  try {
    // Stub: fetch active alerts from DB
    // const alerts = await ctx.db.query('SELECT * FROM alerts WHERE status = $1', ['active']);
    const alerts: AlertRow[] = [];

    let triggered = 0;
    let evaluated = 0;

    for (const alert of alerts) {
      try {
        const currentValue = await evaluateAlertCondition(alert);
        evaluated++;

        if (checkCondition(currentValue, alert.comparison, Number(alert.threshold))) {
          triggered++;
          // Send notification via alert.notification_channels
          // Update alert status to 'triggered'
        }
      } catch (err) {
        ctx.log.error('Alert evaluation failed', { err, alertId: alert.id });
      }
    }

    return { ok: true, detail: `Alerts: ${evaluated} evaluated, ${triggered} triggered` };
  } catch (err) {
    ctx.log.error('Alert runner error', { err });
    return { ok: false, detail: String(err) };
  }
}

async function evaluateAlertCondition(_alert: AlertRow): Promise<number> {
  // Stub: return mock value
  // Real implementation: query Pyth for price, Aave for HF, wallet for balance
  return 0;
}

export function checkCondition(
  currentValue: number,
  comparison: string,
  threshold: number,
  previousValue?: number,
): boolean {
  switch (comparison) {
    case '>':
      return currentValue > threshold;
    case '<':
      return currentValue < threshold;
    case '>=':
      return currentValue >= threshold;
    case '<=':
      return currentValue <= threshold;
    case '==':
      return currentValue === threshold;
    case 'cross-above':
      if (previousValue === undefined) return currentValue > threshold;
      return previousValue <= threshold && currentValue > threshold;
    case 'cross-below':
      if (previousValue === undefined) return currentValue < threshold;
      return previousValue >= threshold && currentValue < threshold;
    default:
      return false;
  }
}

export function isInCooldown(alert: AlertRow): boolean {
  if (!alert.last_triggered_at) return false;
  const lastTrigger = new Date(alert.last_triggered_at).getTime();
  const cooldownMs = (alert.cooldown_seconds ?? 3600) * 1000;
  return Date.now() - lastTrigger < cooldownMs;
}

export function shouldEvaluate(alert: AlertRow): boolean {
  if (alert.status !== 'active') return false;
  return true;
}
