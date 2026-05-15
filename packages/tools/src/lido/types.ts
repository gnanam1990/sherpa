import type { Address } from '@sherpa/safety';
import type { TokenInfo } from '../registry.js';

export type LidoStakeParams = {
  amount: bigint;
  receiveType: 'stETH' | 'wstETH';
};

export type LidoStakeQuote = {
  stethAmount: bigint;
  exchangeRate: number;
  pool: { address: Address; chainId: number };
};

export type LidoDeps = {
  stethAddress?: Address;
  chainId?: number;
  now?: () => number;
};

export const LIDO_STETH_ADDRESS: Record<number, Address | undefined> = {
  84532: undefined, // Sepolia
  8453: '0xC7BBF38442f64e9eDD8E1C70DABaf7b6d27FbCcc', // Base mainnet
};

export const DEFAULT_DEADLINE_SECONDS = 600;
export const STUB_EXCHANGE_RATE = 1.0;
