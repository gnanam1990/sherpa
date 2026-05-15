import type { LidoDeps, LidoStakeParams, LidoStakeQuote } from './types.js';
import { LIDO_STETH_ADDRESS, STUB_EXCHANGE_RATE } from './types.js';

export class LidoNotConfiguredError extends Error {
  constructor() {
    super('Lido stETH address not configured for this chain');
    this.name = 'LidoNotConfiguredError';
  }
}

export async function quote(
  params: LidoStakeParams,
  deps: LidoDeps = {},
): Promise<LidoStakeQuote> {
  const stethAddress = deps.stethAddress ?? (deps.chainId != null ? LIDO_STETH_ADDRESS[deps.chainId] : undefined);
  if (!stethAddress) {
    throw new LidoNotConfiguredError();
  }

  const poolAddress = stethAddress;
  const chainId = deps.chainId ?? 8453;

  return {
    stethAmount: params.amount,
    exchangeRate: STUB_EXCHANGE_RATE,
    pool: { address: poolAddress, chainId },
  };
}
