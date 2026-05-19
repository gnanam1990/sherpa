/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type PortfolioToken = {
  symbol: string;
  address: `0x${string}` | 'native';
  decimals: number;
  chainId: number;
  balance: bigint;
  priceUsd: number;
  valueUsd: bigint;
};

export type PortfolioPosition = {
  protocol: string;
  type: 'lend' | 'borrow' | 'lp' | 'stake';
  tokens: PortfolioToken[];
  valueUsd: bigint;
  apy?: number;
};

export type PortfolioSnapshot = {
  chainId?: number;
  chainName?: string;
  timestamp: number;
  totalValueUsd: bigint;
  tokens: PortfolioToken[];
  positions: PortfolioPosition[];
  chains?: PortfolioSnapshot[];
  errors?: PortfolioChainError[];
};

export type PortfolioDeps = {
  chainId: number;
  rpcUrl?: string;
};

export type PortfolioChainError = {
  chainId: number;
  chainName: string;
  message: string;
};
