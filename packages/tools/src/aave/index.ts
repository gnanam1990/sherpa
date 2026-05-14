export { AaveNotConfiguredError, AssetNotSupportedError, quote } from './quoter.js';
export { buildSupplyCall, buildWithdrawCall } from './supply-builder.js';
export { verifySupply } from './verify.js';
export { STUB_SUPPLY_APY_BPS } from './stub-pricing.js';
export { AAVE_POOL_ABI, SUPPLY_SELECTOR, WITHDRAW_SELECTOR } from './pool.js';
export type {
  AaveLendAction,
  AaveLendParams,
  AaveLendQuote,
  AaveDeps,
  AavePoolInfo,
  ReserveData,
} from './types.js';
export { DEFAULT_DEADLINE_SECONDS } from './types.js';

import { AAVE_V3_POOL_ADDRESS, ALLOWED_CONTRACTS, type Address } from '@sherpa/safety';
import type { ToolAdapter, BuiltTx } from '../types.js';
import { quote as doQuote } from './quoter.js';
import { buildSupplyCall, buildWithdrawCall } from './supply-builder.js';
import { verifySupply } from './verify.js';
import type { AaveDeps, AaveLendParams, AaveLendQuote } from './types.js';

export type AaveConfig = {
  poolAddress?: Address;
  stubSupplyApyBps?: number;
};

export type AaveAdapter = ToolAdapter<AaveLendParams, AaveLendQuote, AaveLendParams> & {
  poolAddress: Address | undefined;
};

export function createAave(config: AaveConfig = {}): AaveAdapter {
  const poolAddress = config.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  const deps: AaveDeps = {
    poolAddress,
    stubSupplyApyBps: config.stubSupplyApyBps,
  };

  return {
    name: 'aave',
    poolAddress,
    quote: async (params) => doQuote(params, deps),
    buildTx: async (params): Promise<BuiltTx> => {
      const q = await doQuote(params, deps);
      if (params.action === 'deposit') {
        const result = await buildSupplyCall(
          ALLOWED_CONTRACTS.USDC,
          q.amountBaseUnits,
          params.recipient,
          params.referralCode,
          deps,
        );
        return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
      }
      const result = await buildWithdrawCall(
        ALLOWED_CONTRACTS.USDC,
        q.amountBaseUnits,
        params.recipient,
        deps,
      );
      return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
    },
    verify: async (tx) => verifySupply(tx, deps),
  };
}

export const aave = createAave();
