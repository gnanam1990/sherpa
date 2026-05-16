import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateHealthFactor(alert: AlertRow): Promise<EvaluateResult> {
  const userAddress = alert.user_address;
  if (!userAddress) return { value: 0, triggered: false, error: 'missing user_address' };

  const hf = await fetchAaveHealthFactor(userAddress);
  const triggered = checkCondition(hf, alert.comparison, Number(alert.threshold));
  return { value: hf, triggered };
}

export async function fetchAaveHealthFactor(address: string): Promise<number> {
  try {
    const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
    const poolAddress = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';

    const data =
      '0x35ea6a75' +
      '000000000000000000000000' +
      address.slice(2).toLowerCase();

    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: poolAddress, data }, 'latest'],
      }),
    });

    const json = (await resp.json()) as { result?: string };
    if (!json.result || json.result === '0x') return 0;

    const hex = json.result;
    const totalDebtHex = '0x' + hex.slice(2 + 64 * 4, 2 + 64 * 5);
    const totalDebt = BigInt(totalDebtHex);

    if (totalDebt === 0n) return Infinity;

    const totalCollateralHex = '0x' + hex.slice(2 + 64 * 2, 2 + 64 * 3);
    const liquidationThresholdHex = '0x' + hex.slice(2 + 64 * 7, 2 + 64 * 8);
    const totalCollateral = BigInt(totalCollateralHex);
    const liquidationThreshold = BigInt(liquidationThresholdHex);

    if (totalDebt === 0n) return Infinity;
    const hf = (totalCollateral * liquidationThreshold) / (totalDebt * 10000n);
    return Number(hf) / 1e18;
  } catch {
    return 0;
  }
}
