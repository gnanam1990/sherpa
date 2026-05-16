import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateAddressActivity(alert: AlertRow): Promise<EvaluateResult> {
  const address = alert.params?.address as string | undefined;
  if (!address) return { value: 0, triggered: false, error: 'missing address param' };

  const txCount = await fetchRecentTxCount(address);
  const triggered = checkCondition(txCount, alert.comparison, Number(alert.threshold));
  return { value: txCount, triggered };
}

export async function fetchRecentTxCount(address: string): Promise<number> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? process.env.BASESCAN_API_KEY;
  if (!apiKey) return 0;

  try {
    const resp = await fetch(
      `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${apiKey}`,
    );
    const data = (await resp.json()) as { status: string; result: unknown[] };
    if (data.status !== '1') return 0;
    return data.result.length;
  } catch {
    return 0;
  }
}
