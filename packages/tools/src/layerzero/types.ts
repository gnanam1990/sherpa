/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type LayerZeroParams = {
  asset: string;
  amount: bigint;
  sourceChain: string;
  destinationChain: string;
  recipient: `0x${string}`;
};

export type LayerZeroQuote = {
  nativeFee: bigint;
  lzTokenFee: bigint;
  estimatedTime: number;
  destinationEndpointId: number;
};

export const LZ_ENDPOINT_IDS: Record<string, number> = {
  ethereum: 30101,
  polygon: 30109,
  optimism: 30111,
  arbitrum: 30110,
  base: 30184,
};

export const LZ_ENDPOINTS: Record<string, `0x${string}`> = {
  ethereum: '0x66A71Dcef29a0fFBDBE3c6a460a3B5BC225Cd675',
  polygon: '0x3c2269811836af69497E5F486A85D7316753cf62',
  optimism: '0x3c2269811836af69497E5F486A85D7316753cf62',
  arbitrum: '0x3c2269811836af69497E5F486A85D7316753cf62',
  base: '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7',
};

export function isLayerZeroSupported(chain: string): boolean {
  return chain.toLowerCase() in LZ_ENDPOINT_IDS;
}
