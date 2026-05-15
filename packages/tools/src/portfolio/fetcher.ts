import type { PortfolioSnapshot, PortfolioDeps } from './types.js';

export async function fetchPortfolio(
  address: `0x${string}`,
  deps: PortfolioDeps,
): Promise<PortfolioSnapshot> {
  return {
    timestamp: Date.now(),
    totalValueUsd: 5000000000n, // $5000
    tokens: [
      {
        symbol: 'ETH',
        address: 'native',
        decimals: 18,
        chainId: deps.chainId,
        balance: 1000000000000000000n, // 1 ETH
        priceUsd: 3000,
        valueUsd: 3000000000n, // $3000
      },
      {
        symbol: 'USDC',
        address: '0x0000000000000000000000000000000000000001',
        decimals: 6,
        chainId: deps.chainId,
        balance: 2000000000n, // 2000 USDC
        priceUsd: 1,
        valueUsd: 2000000000n, // $2000
      },
    ],
    positions: [],
  };
}

export async function fetchMultiChainPortfolio(
  address: `0x${string}`,
  chainIds: number[],
): Promise<PortfolioSnapshot[]> {
  return Promise.all(
    chainIds.map(chainId => fetchPortfolio(address, { chainId })),
  );
}
