export { LidoNotConfiguredError, quote } from './quoter.js';
export { buildStakeCall } from './stake-builder.js';
export { verifyStake } from './verify.js';
export { STUB_EXCHANGE_RATE, DEFAULT_DEADLINE_SECONDS, LIDO_STETH_ADDRESS } from './types.js';
export { STETH_ABI, SUBMIT_SELECTOR } from './steth.js';
export type { LidoStakeParams, LidoStakeQuote, LidoDeps } from './types.js';

import { assertAllowlisted, type Address } from '@sherpa/safety';
import type { ToolAdapter, BuiltTx } from '../types.js';
import { LidoNotConfiguredError, quote as doQuote } from './quoter.js';
import { buildStakeCall } from './stake-builder.js';
import { verifyStake } from './verify.js';
import type { LidoDeps, LidoStakeParams, LidoStakeQuote } from './types.js';
import { LIDO_STETH_ADDRESS } from './types.js';

export type LidoConfig = {
  stethAddress?: Address;
  chainId?: number;
};

export type LidoAdapter = ToolAdapter<LidoStakeParams, LidoStakeQuote, LidoStakeParams> & {
  stethAddress: Address | undefined;
};

export function createLido(config: LidoConfig = {}): LidoAdapter {
  const chainSteth = config.chainId != null ? LIDO_STETH_ADDRESS[config.chainId] : undefined;
  const stethAddress = config.stethAddress ?? chainSteth;
  const deps: LidoDeps = {
    stethAddress,
    chainId: config.chainId,
  };

  return {
    name: 'lido',
    stethAddress,
    quote: async (params) => doQuote(params, deps),
    buildTx: async (params): Promise<BuiltTx> => {
      const result = await buildStakeCall(params.amount, deps);
      return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
    },
    verify: async (tx) => verifyStake(tx, deps),
  };
}

export const lido = createLido();
