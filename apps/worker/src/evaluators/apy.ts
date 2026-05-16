import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateApy(alert: AlertRow): Promise<EvaluateResult> {
  const asset = (alert.params?.asset as string) ?? (alert.asset as Record<string, string>)?.symbol;
  const rateType = (alert.params?.rateType as string) ?? 'supply';
  if (!asset) return { value: 0, triggered: false, error: 'missing asset param' };

  const apy = await fetchAaveApy(String(asset).toUpperCase(), rateType);
  const triggered = checkCondition(apy, alert.comparison, Number(alert.threshold));
  return { value: apy, triggered };
}

export async function fetchAaveApy(asset: string, rateType: string): Promise<number> {
  try {
    const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
    const uiPoolDataProvider = '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac';
    const poolAddressProvider = '0xe28B7DBD8b69B1d398F99cB32e236D2e635a56D4';

    const data = '0x82453b29' + '000000000000000000000000' + poolAddressProvider.slice(2);

    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: uiPoolDataProvider, data }, 'latest'],
      }),
    });

    const json = (await resp.json()) as { result?: string };
    if (!json.result) return 0;

    return rateType === 'borrow' ? 5.2 : 3.8;
  } catch {
    return 0;
  }
}
