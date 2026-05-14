import type { Address } from '@sherpa/safety';
import type { TokenInfo } from '../registry.js';

export type AaveLendAction = 'deposit' | 'withdraw';

export type AavePoolInfo = {
  poolAddress: Address;
  chainId: number;
};

export type ReserveData = {
  asset: TokenInfo;
  supplyApyBps: number;
  totalSupply: bigint;
  availableLiquidity: bigint;
};

export type AaveLendParams = {
  action: AaveLendAction;
  asset: 'USDC';
  amount: string;
  recipient: Address;
  referralCode?: number;
};

export type AaveLendQuote = {
  action: AaveLendAction;
  asset: 'USDC';
  amountBaseUnits: bigint;
  supplyApyBps: number;
  display: string;
};

export type AaveDeps = {
  poolAddress?: Address;
  dataProviderAddress?: Address;
  stubSupplyApyBps?: number;
  now?: () => number;
};

export const STUB_SUPPLY_APY_BPS = 380; // 3.80%
export const DEFAULT_DEADLINE_SECONDS = 600;
