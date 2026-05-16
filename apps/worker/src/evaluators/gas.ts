import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateGas(alert: AlertRow): Promise<EvaluateResult> {
  const gasPrice = await fetchGasPrice();
  const triggered = checkCondition(gasPrice, alert.comparison, Number(alert.threshold));
  return { value: gasPrice, triggered };
}

export async function fetchGasPrice(): Promise<number> {
  try {
    const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
    });
    const json = (await resp.json()) as { result?: string };
    if (!json.result) return 0;
    const wei = BigInt(json.result);
    return Number(wei) / 1e9;
  } catch {
    return 0;
  }
}
