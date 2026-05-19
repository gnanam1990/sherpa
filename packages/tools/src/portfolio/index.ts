/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export {
  BASE_CHAIN_ID,
  SUPPORTED_PORTFOLIO_CHAIN_IDS,
  fetchPortfolio,
  fetchMultiChainPortfolio,
} from './fetcher.js';
export type { PortfolioFetcherDeps, SupportedPortfolioChainId } from './fetcher.js';
export { aggregatePortfolio } from './aggregator.js';
export { calculatePnl } from './pnl.js';
export type {
  PortfolioToken,
  PortfolioPosition,
  PortfolioSnapshot,
  PortfolioDeps,
  PortfolioChainError,
} from './types.js';
