import { evaluateAlert } from './evaluators/index.js';
import { dispatchAlertNotification, formatAlertPayload } from './notifiers/index.js';
import type { AlertRow, AlertStore, AlertCycleResult } from './types.js';

export async function runAlertCycle(store: AlertStore): Promise<AlertCycleResult> {
  const alerts = await store.getActive();
  const result: AlertCycleResult = { evaluated: 0, triggered: 0, failed: 0, errors: [] };

  for (const alert of alerts) {
    try {
      if (!shouldEvaluate(alert)) continue;

      const evalResult = await evaluateAlert(alert);
      result.evaluated++;

      await store.markEvaluated(alert.id, evalResult.value);

      await store.logEvaluation({
        alertId: alert.id,
        userAddress: alert.user_address,
        conditionType: alert.condition_type,
        evaluatedValue: evalResult.value,
        threshold: Number(alert.threshold),
        triggered: evalResult.triggered,
        error: evalResult.error,
      });

      if (evalResult.error) {
        result.errors.push(`[${alert.id}] ${evalResult.error}`);
        continue;
      }

      if (evalResult.triggered && isInCooldown(alert)) {
        continue;
      }

      if (evalResult.triggered) {
        const payload = formatAlertPayload(alert, evalResult.value);
        await dispatchAlertNotification(alert, payload);
        await store.markTriggered(alert.id);
        result.triggered++;
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`[${alert.id}] ${String(err)}`);
    }
  }

  return result;
}

export function shouldEvaluate(alert: AlertRow): boolean {
  if (alert.status !== 'active') return false;
  if (!alert.last_evaluated_at) return true;

  const lastEval = new Date(alert.last_evaluated_at).getTime();
  const minInterval = Math.max(alert.cooldown_seconds * 1000, 30_000);
  return Date.now() - lastEval >= minInterval;
}

export function isInCooldown(alert: AlertRow): boolean {
  if (!alert.last_triggered_at) return false;
  const lastTrigger = new Date(alert.last_triggered_at).getTime();
  return Date.now() - lastTrigger < alert.cooldown_seconds * 1000;
}
