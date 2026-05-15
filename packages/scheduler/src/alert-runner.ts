import type { TaskContext } from './hourly-tasks.js';

export type AlertRow = {
  id: string;
  user_address: string;
  condition_type: string;
  asset: any;
  comparison: string;
  threshold: string;
  notification_channels: string[];
  triggered_intent?: string;
  status: string;
  last_value?: string;
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
      return currentValue > threshold; // needs previous state
    case 'cross-below':
      return currentValue < threshold;
    default:
      return false;
  }
}
