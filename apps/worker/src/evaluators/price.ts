import { checkCondition } from './check-condition.js';
import type { AlertRow, EvaluateResult, EvaluatorFn } from '../types.js';

export type { AlertRow, EvaluateResult, EvaluatorFn };

export async function evaluatePrice(alert: AlertRow): Promise<EvaluateResult> {
  const symbol = (alert.asset as Record<string, string>)?.symbol ?? (alert.params?.symbol as string);
  if (!symbol) return { value: 0, triggered: false, error: 'missing asset symbol' };

  const price = await fetchPythPrice(String(symbol).toUpperCase());
  const triggered = checkCondition(price, alert.comparison, Number(alert.threshold));
  return { value: price, triggered };
}

export async function fetchPythPrice(symbol: string): Promise<number> {
  const priceIds: Record<string, string> = {
    ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
    DAI: '0xb0948a5e5313200c632b51bb5ca32f6a2e4a8b8e4b3d0e1c7a8f0c3b2a1d4e5f6',
    BASE: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  };

  const id = priceIds[symbol];
  if (!id) return 0;

  try {
    const resp = await fetch(
      `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${id}&encoding=hex`,
    );
    if (!resp.ok) return 0;
    const data = (await resp.json()) as Array<{
      price: { price: string; expo: number };
    }>;
    const raw = data[0]?.price;
    if (!raw) return 0;
    return Number(raw.price) * Math.pow(10, raw.expo);
  } catch {
    return 0;
  }
}
