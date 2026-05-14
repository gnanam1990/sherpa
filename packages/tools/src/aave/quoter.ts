import { formatUnits, parseUnits } from 'viem';
import type { AaveDeps, AaveLendParams, AaveLendQuote } from './types.js';
import { STUB_SUPPLY_APY_BPS } from './types.js';

export class AaveNotConfiguredError extends Error {
  constructor() {
    super('Aave V3 Pool address not yet configured for this chain');
    this.name = 'AaveNotConfiguredError';
  }
}

export class AssetNotSupportedError extends Error {
  constructor(asset: string) {
    super(`[aave] unsupported asset ${asset} (Stage 2 starts with USDC)`);
    this.name = 'AssetNotSupportedError';
  }
}

export async function quote(
  params: AaveLendParams,
  deps: AaveDeps = {},
): Promise<AaveLendQuote> {
  if (params.asset !== 'USDC') {
    throw new AssetNotSupportedError(params.asset);
  }

  const apyBps = deps.stubSupplyApyBps ?? STUB_SUPPLY_APY_BPS;
  const amountBaseUnits = parseUnits(params.amount, 6);
  const verb = params.action === 'deposit' ? 'Deposit' : 'Withdraw';

  return {
    action: params.action,
    asset: 'USDC',
    amountBaseUnits,
    supplyApyBps: apyBps,
    display: `${verb} ${formatUnits(amountBaseUnits, 6)} USDC @ ${(apyBps / 100).toFixed(2)}% APY (Aave)`,
  };
}
