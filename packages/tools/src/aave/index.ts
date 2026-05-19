/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { AaveNotConfiguredError, AssetNotSupportedError, quote } from './quoter.js';
export { buildSupplyCall, buildWithdrawCall } from './supply-builder.js';
export { buildBorrowCall, buildRepayCall } from './borrow-builder.js';
export { verifySupply } from './verify.js';
export { STUB_SUPPLY_APY_BPS } from './stub-pricing.js';
export { AAVE_POOL_ABI, SUPPLY_SELECTOR, WITHDRAW_SELECTOR, BORROW_SELECTOR, REPAY_SELECTOR } from './pool.js';
export { computeHealthFactor, computePostBorrowHealthFactor, healthFactorToBps, healthFactorRiskLevel } from './health-factor.js';
export { USER_ACCOUNT_DATA_ABI, encodeGetUserAccountData, parseUserAccountData } from './user-account.js';
export {
  AAVE_ORACLE_BASE,
  AAVE_POOL_BASE,
  MAX_HEALTH_FACTOR,
  classifyHealthFactor,
  getUserAaveAccountData,
  isMaxHealthFactor,
} from './positions.js';
export type { AavePosition, AavePositionsDeps } from './positions.js';
export type {
  AaveLendAction,
  AaveLendParams,
  AaveLendQuote,
  AaveDeps,
  AavePoolInfo,
  ReserveData,
  AaveBorrowParams,
  AaveBorrowQuote,
  BorrowSimulation,
} from './types.js';
export type { UserAccountData } from './health-factor.js';
export { DEFAULT_DEADLINE_SECONDS } from './types.js';

import { AAVE_V3_POOL_ADDRESS, ALLOWED_CONTRACTS, type Address } from '@sherpa/safety';
import type { ToolAdapter, BuiltTx } from '../types.js';
import { quote as doQuote } from './quoter.js';
import { buildSupplyCall, buildWithdrawCall } from './supply-builder.js';
import { verifySupply } from './verify.js';
import type { AaveDeps, AaveLendParams, AaveLendQuote } from './types.js';

const AAVE_POOL: Record<number, Address | undefined> = {
  84532: undefined, // Sepolia - from env
  8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Base mainnet
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Optimism
  43114: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Avalanche
};

const AAVE_DATA_PROVIDERS: Record<number, Address | undefined> = {
  84532: undefined, // Sepolia - from env
  8453: '0x2d8A3C5677189723C4cB8CF77Fc1281663307167', // Base mainnet
  42161: '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C', // Arbitrum
  10: '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C', // Optimism
  43114: '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C', // Avalanche
};

export type AaveConfig = {
  poolAddress?: Address;
  chainId?: number;
  stubSupplyApyBps?: number;
};

export type AaveAdapter = ToolAdapter<AaveLendParams, AaveLendQuote, AaveLendParams> & {
  poolAddress: Address | undefined;
};

export function getAavePool(chainId: number): Address | undefined {
  return AAVE_POOL[chainId];
}

export function getAaveDataProvider(chainId: number): Address | undefined {
  return AAVE_DATA_PROVIDERS[chainId];
}

export function createAave(config: AaveConfig = {}): AaveAdapter {
  const chainPool = config.chainId != null ? AAVE_POOL[config.chainId] : undefined;
  const chainProvider = config.chainId != null ? AAVE_DATA_PROVIDERS[config.chainId] : undefined;
  const poolAddress = config.poolAddress ?? chainPool ?? AAVE_V3_POOL_ADDRESS;
  const deps: AaveDeps = {
    poolAddress,
    dataProviderAddress: chainProvider,
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
