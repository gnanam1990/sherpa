/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Per-chain configuration for multi-chain expansion.
 *
 * Single source of truth for DEX routers, Aave pools, bridge contracts,
 * and chain-specific metadata across Base, Polygon, Optimism, and Arbitrum.
 */

type Address = `0x${string}`;

export type ChainId = 8453 | 137 | 10 | 42161;

export type DexConfig = {
  name: string;
  routerAddress: Address;
  factoryAddress?: Address;
  quoterAddress?: Address;
};

export type AaveConfig = {
  poolAddress: Address;
  dataProviderAddress: Address;
  oracleAddress?: Address;
};

export type BridgeConfig = {
  across?: { spokePool: Address };
  layerZero?: { endpoint: Address };
};

export type ChainContracts = {
  chainId: ChainId;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  wrappedNative: Address;
  usdc: Address;
  dex: DexConfig;
  aave: AaveConfig;
  bridge: BridgeConfig;
};

export const CHAIN_CONFIGS: Readonly<Record<ChainId, ChainContracts>> = Object.freeze({
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    wrappedNative: '0x4200000000000000000000000000000000000006',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    dex: {
      name: 'Aerodrome',
      routerAddress: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      factoryAddress: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
    },
    aave: {
      poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      dataProviderAddress: '0x2d8A3C5677189723C4cB8CF77Fc1281663307167',
    },
    bridge: {
      across: { spokePool: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64' },
    },
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    shortName: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    dex: {
      name: 'QuickSwap',
      routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    },
    aave: {
      poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      dataProviderAddress: '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C',
    },
    bridge: {
      across: { spokePool: '0x7E6e3Af00c096C5bCA5e2F1C0F8e2bD4F1E9bB0e' },
      layerZero: { endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' },
    },
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    wrappedNative: '0x4200000000000000000000000000000000000006',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    dex: {
      name: 'Velodrome',
      routerAddress: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
      factoryAddress: '0x25CbdEdC23981F5bAC436E6E6C1A8F3F9E0F9B60',
    },
    aave: {
      poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      dataProviderAddress: '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C',
    },
    bridge: {
      across: { spokePool: '0x6f26Bf09B1C792e3228e5467807a900A503c0281' },
      layerZero: { endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' },
    },
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    dex: {
      name: 'Camelot',
      routerAddress: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
      factoryAddress: '0x6EcCab422D763aC031210895C81787E87B43A652',
    },
    aave: {
      poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      dataProviderAddress: '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C',
    },
    bridge: {
      across: { spokePool: '0xe35e9842fceaCA96570B73C02b79C3858eE19eF4' },
      layerZero: { endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62' },
    },
  },
});

export function getChainConfig(chainId: ChainId): ChainContracts {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) throw new Error(`Unsupported chain: ${chainId}`);
  return config;
}

export function getDexRouter(chainId: ChainId): Address {
  return getChainConfig(chainId).dex.routerAddress;
}

export function getAavePool(chainId: ChainId): Address {
  return getChainConfig(chainId).aave.poolAddress;
}

export function getAaveDataProvider(chainId: ChainId): Address {
  return getChainConfig(chainId).aave.dataProviderAddress;
}

export function getSupportedChainIds(): ChainId[] {
  return Object.keys(CHAIN_CONFIGS).map(Number) as ChainId[];
}

export function isChainSupported(chainId: number): chainId is ChainId {
  return chainId in CHAIN_CONFIGS;
}

export function getChainName(chainId: ChainId): string {
  return getChainConfig(chainId).shortName;
}

export function chainNameToId(name: string): ChainId | undefined {
  const normalized = name.toLowerCase().trim();
  for (const config of Object.values(CHAIN_CONFIGS)) {
    if (config.shortName === normalized || config.name.toLowerCase() === normalized) {
      return config.chainId;
    }
  }
  if (normalized === 'arb') return 42161;
  if (normalized === 'op') return 10;
  if (normalized === 'matic') return 137;
  return undefined;
}
