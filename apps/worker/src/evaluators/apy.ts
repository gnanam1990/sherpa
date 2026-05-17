import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateApy(alert: AlertRow): Promise<EvaluateResult> {
  const asset = (alert.params?.asset as string) ?? (alert.asset as Record<string, string>)?.symbol;
  const rateType = (alert.params?.rateType as string) ?? 'supply';
  if (!asset) return { value: 0, triggered: false, error: 'missing asset param' };

  let apy: number;
  try {
    apy = await fetchAaveApy(String(asset).toUpperCase(), rateType);
  } catch (err) {
    return {
      value: 0,
      triggered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const triggered = checkCondition(apy, alert.comparison, Number(alert.threshold));
  return { value: apy, triggered };
}

export async function fetchAaveApy(asset: string, rateType: string): Promise<never> {
  throw new Error(
    `aave_apy_evaluator_not_configured: ${asset}/${rateType} requires a real reserve-data decoder`,
  );
}
