import { createPublicClient, http, erc20Abi, formatUnits, type Address } from 'viem';
import { base } from 'viem/chains';
import { getUserAaveAccountData, AAVE_POOL_BASE } from '../aave/positions.js';
import { resolveToken } from '../registry.js';
import type { PortfolioSnapshot, PortfolioDeps, PortfolioToken, PortfolioPosition } from './types.js';

const BASE_CHAIN_ID = 8453;

const KNOWN_TOKENS: Array<{ symbol: string; address: Address | 'native'; decimals: number }> = [
  { symbol: 'ETH', address: 'native', decimals: 18 },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  { symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18 },
];

export type PortfolioFetcherDeps = {
  rpcUrl?: string;
  chainId?: number;
  readContract?: (params: any) => Promise<any>;
  getBalance?: (params: { address: Address }) => Promise<bigint>;
};

function getClient(deps: PortfolioFetcherDeps) {
  if (deps.rpcUrl || !deps.readContract) {
    return createPublicClient({
      chain: base,
      transport: http(deps.rpcUrl ?? 'https://mainnet.base.org'),
    });
  }
  return null;
}

/**
 * Fetch real on-chain portfolio for an address on Base.
 * Reads: native ETH, ERC-20 balances (multicall), Aave V3 positions.
 */
export async function fetchPortfolio(
  address: `0x${string}`,
  deps: PortfolioFetcherDeps = {},
): Promise<PortfolioSnapshot> {
  const chainId = deps.chainId ?? BASE_CHAIN_ID;
  const client = getClient(deps);
  const readContract = deps.readContract ?? ((params: any) => client!.readContract(params));
  const getBalance = deps.getBalance ?? ((params: { address: Address }) => client!.getBalance(params));

  const tokens: PortfolioToken[] = [];
  let totalValueUsd = 0n;

  // Fetch native ETH balance
  const nativeBalance = await getBalance({ address });
  if (nativeBalance > 0n) {
    // Use a hardcoded price for now; in production, fetch from Pyth or CoinGecko
    const ethPriceUsd = 3000;
    // valueUsd = balance (wei) * price / 1e18 = dollars as integer
    const valueUsd = (nativeBalance * BigInt(ethPriceUsd)) / (10n ** 18n);
    tokens.push({
      symbol: 'ETH',
      address: 'native',
      decimals: 18,
      chainId,
      balance: nativeBalance,
      priceUsd: ethPriceUsd,
      valueUsd,
    });
    totalValueUsd += valueUsd;
  }

  // Fetch ERC-20 balances via multicall
  const erc20Tokens = KNOWN_TOKENS.filter((t) => t.address !== 'native');
  const multicallResults = await Promise.allSettled(
    erc20Tokens.map(async (token) => {
      const balance = await readContract({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      });
      return { token, balance: balance as bigint };
    }),
  );

  const priceMap: Record<string, number> = {
    ETH: 3000,
    WETH: 3000,
    USDC: 1,
    AERO: 2,
  };

  for (const result of multicallResults) {
    if (result.status === 'fulfilled' && result.value.balance > 0n) {
      const { token, balance } = result.value;
      const priceUsd = priceMap[token.symbol] ?? 0;
      // valueUsd = balance * price / 10^decimals = dollars as integer
      const valueUsd = (balance * BigInt(priceUsd)) / (10n ** BigInt(token.decimals));
      tokens.push({
        symbol: token.symbol,
        address: token.address as Address,
        decimals: token.decimals,
        chainId,
        balance,
        priceUsd,
        valueUsd,
      });
      totalValueUsd += valueUsd;
    }
  }

  // Fetch Aave V3 position
  const positions: PortfolioPosition[] = [];
  try {
    const aaveData = await getUserAaveAccountData(address, { rpcUrl: deps.rpcUrl });
    if (aaveData.hasPosition) {
      // Aave values are in base currency (USD with 8 decimals on Base)
      // Convert to integer dollars: divide by 10^8
      const collateralUsd = aaveData.totalCollateralBase / (10n ** 8n);
      const debtUsd = aaveData.totalDebtBase / (10n ** 8n);

      if (collateralUsd > 0n) {
        positions.push({
          protocol: 'Aave V3',
          type: 'lend',
          tokens: [{
            symbol: 'aTokens',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId,
            balance: collateralUsd,
            priceUsd: 1,
            valueUsd: collateralUsd,
          }],
          valueUsd: collateralUsd,
        });
      }

      if (debtUsd > 0n) {
        positions.push({
          protocol: 'Aave V3',
          type: 'borrow',
          tokens: [{
            symbol: 'debtTokens',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId,
            balance: debtUsd,
            priceUsd: 1,
            valueUsd: debtUsd,
          }],
          valueUsd: debtUsd,
        });
      }
    }
  } catch {
    // Aave fetch failed — continue without positions
  }

  return {
    timestamp: Date.now(),
    totalValueUsd,
    tokens,
    positions,
  };
}

export async function fetchMultiChainPortfolio(
  address: `0x${string}`,
  chainIds: number[],
  deps: PortfolioFetcherDeps = {},
): Promise<PortfolioSnapshot[]> {
  return Promise.all(
    chainIds.map((chainId) => fetchPortfolio(address, { ...deps, chainId })),
  );
}
