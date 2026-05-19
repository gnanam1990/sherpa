/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type BridgeParams = {
  asset: string;
  amount: bigint;
  sourceChain: string;
  destinationChain: string;
};

export type BridgeQuote = {
  relayerFee: bigint;
  estimatedTime: number;
  minOutAmount: bigint;
  spokePool: `0x${string}`;
};

export const SUPPORTED_CHAINS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
};

export const CHAIN_IDS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
};

export const SUPPORTED_BRIDGE_PAIRS: Array<[string, string]> = [
  ['base', 'ethereum'],
  ['ethereum', 'base'],
  ['base', 'optimism'],
  ['optimism', 'base'],
  ['base', 'arbitrum'],
  ['arbitrum', 'base'],
  ['base', 'polygon'],
  ['polygon', 'base'],
  ['ethereum', 'optimism'],
  ['optimism', 'ethereum'],
  ['ethereum', 'arbitrum'],
  ['arbitrum', 'ethereum'],
  ['ethereum', 'polygon'],
  ['polygon', 'ethereum'],
  ['optimism', 'arbitrum'],
  ['arbitrum', 'optimism'],
  ['optimism', 'polygon'],
  ['polygon', 'optimism'],
  ['arbitrum', 'polygon'],
  ['polygon', 'arbitrum'],
];

export function isBridgePairSupported(source: string, dest: string): boolean {
  return SUPPORTED_BRIDGE_PAIRS.some(([s, d]) => s === source && d === dest);
}
