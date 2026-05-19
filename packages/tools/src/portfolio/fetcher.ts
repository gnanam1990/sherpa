import { createPublicClient, erc20Abi, http, type Address, type Chain } from 'viem';
import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains';
import { getUserAaveAccountData, type AavePosition } from '../aave/positions.js';
import type {
  PortfolioChainError,
  PortfolioPosition,
  PortfolioSnapshot,
  PortfolioToken,
} from './types.js';

export const BASE_CHAIN_ID = 8453;
export const SUPPORTED_PORTFOLIO_CHAIN_IDS = [8453, 1, 137, 10, 42161] as const;

export type SupportedPortfolioChainId = (typeof SUPPORTED_PORTFOLIO_CHAIN_IDS)[number];

type ChainTokenConfig = {
  symbol: string;
  address: Address | 'native';
  decimals: number;
  priceUsd: number;
};

type ChainConfig = {
  id: SupportedPortfolioChainId;
  name: string;
  chain: Chain;
  rpcUrl: string;
  tokens: readonly ChainTokenConfig[];
};

type Erc20BalanceCall = {
  address: Address;
  abi: typeof erc20Abi;
  functionName: 'balanceOf';
  args: readonly [Address];
};

type MulticallResult =
  | { status: 'success'; result: bigint }
  | { status: 'failure'; error?: Error };

export type PortfolioFetcherDeps = {
  rpcUrl?: string;
  rpcUrls?: Partial<Record<SupportedPortfolioChainId, string>>;
  chainId?: number;
  chains?: number[];
  readContract?: (params: Erc20BalanceCall & { chainId?: SupportedPortfolioChainId }) => Promise<bigint>;
  multicall?: (params: {
    chainId: SupportedPortfolioChainId;
    contracts: readonly Erc20BalanceCall[];
  }) => Promise<readonly MulticallResult[]>;
  getBalance?: (params: { address: Address; chainId?: SupportedPortfolioChainId }) => Promise<bigint>;
  getAaveAccountData?: (params: { address: Address; chainId: SupportedPortfolioChainId }) => Promise<AavePosition>;
  log?: { warn: (message: string, meta?: Record<string, unknown>) => void };
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const CHAIN_CONFIGS: Record<SupportedPortfolioChainId, ChainConfig> = {
  8453: {
    id: 8453,
    name: 'Base',
    chain: base,
    rpcUrl: 'https://mainnet.base.org',
    tokens: [
      { symbol: 'ETH', address: 'native', decimals: 18, priceUsd: 3000 },
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, priceUsd: 1 },
      { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, priceUsd: 1 },
      { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, priceUsd: 1 },
    ],
  },
  1: {
    id: 1,
    name: 'Ethereum',
    chain: mainnet,
    rpcUrl: 'https://eth.llamarpc.com',
    tokens: [
      { symbol: 'ETH', address: 'native', decimals: 18, priceUsd: 3000 },
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, priceUsd: 1 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, priceUsd: 1 },
      { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, priceUsd: 1 },
    ],
  },
  137: {
    id: 137,
    name: 'Polygon',
    chain: polygon,
    rpcUrl: 'https://polygon-rpc.com',
    tokens: [
      { symbol: 'MATIC', address: 'native', decimals: 18, priceUsd: 1 },
      { symbol: 'USDC', address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', decimals: 6, priceUsd: 1 },
      { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, priceUsd: 1 },
      { symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, priceUsd: 1 },
    ],
  },
  10: {
    id: 10,
    name: 'Optimism',
    chain: optimism,
    rpcUrl: 'https://mainnet.optimism.io',
    tokens: [
      { symbol: 'ETH', address: 'native', decimals: 18, priceUsd: 3000 },
      { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, priceUsd: 1 },
      { symbol: 'USDT', address: '0x94b008aD8eE5FfC3CcD6285cE3abdaE682EFA8a', decimals: 6, priceUsd: 1 },
      { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, priceUsd: 1 },
    ],
  },
  42161: {
    id: 42161,
    name: 'Arbitrum',
    chain: arbitrum,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    tokens: [
      { symbol: 'ETH', address: 'native', decimals: 18, priceUsd: 3000 },
      { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, priceUsd: 1 },
      { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, priceUsd: 1 },
      { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, priceUsd: 1 },
    ],
  },
};

function normalizeChainId(chainId: number): SupportedPortfolioChainId {
  if (SUPPORTED_PORTFOLIO_CHAIN_IDS.includes(chainId as SupportedPortfolioChainId)) {
    return chainId as SupportedPortfolioChainId;
  }
  throw new Error(`unsupported_chain:${chainId}`);
}

function getClient(chainId: SupportedPortfolioChainId, deps: PortfolioFetcherDeps) {
  const config = CHAIN_CONFIGS[chainId];
  return createPublicClient({
    chain: config.chain,
    transport: http(deps.rpcUrls?.[chainId] ?? deps.rpcUrl ?? config.rpcUrl),
  });
}

function valueUsd(balance: bigint, token: ChainTokenConfig): bigint {
  return (balance * BigInt(token.priceUsd)) / (10n ** BigInt(token.decimals));
}

async function readErc20Balances(
  address: Address,
  chainId: SupportedPortfolioChainId,
  erc20Tokens: readonly ChainTokenConfig[],
  deps: PortfolioFetcherDeps,
): Promise<readonly MulticallResult[]> {
  const contracts = erc20Tokens.map((token) => ({
    address: token.address as Address,
    abi: erc20Abi,
    functionName: 'balanceOf' as const,
    args: [address] as const,
  }));

  if (deps.multicall) {
    return deps.multicall({ chainId, contracts });
  }

  if (deps.readContract) {
    const settled = await Promise.allSettled(
      contracts.map((contract) => deps.readContract!({ ...contract, chainId })),
    );
    return settled.map((result) => (
      result.status === 'fulfilled'
        ? { status: 'success' as const, result: result.value }
        : { status: 'failure' as const, error: result.reason as Error }
    ));
  }

  const client = getClient(chainId, deps);
  return client.multicall({
    allowFailure: true,
    contracts,
  }) as Promise<readonly MulticallResult[]>;
}

async function fetchBaseAavePositions(
  address: Address,
  chainId: SupportedPortfolioChainId,
  deps: PortfolioFetcherDeps,
): Promise<PortfolioPosition[]> {
  if (chainId !== BASE_CHAIN_ID) return [];

  try {
    const aaveData = deps.getAaveAccountData
      ? await deps.getAaveAccountData({ address, chainId })
      : await getUserAaveAccountData(address, { rpcUrl: deps.rpcUrls?.[BASE_CHAIN_ID] ?? deps.rpcUrl });

    if (!aaveData.hasPosition) return [];

    const positions: PortfolioPosition[] = [];
    const collateralUsd = aaveData.totalCollateralBase / (10n ** 8n);
    const debtUsd = aaveData.totalDebtBase / (10n ** 8n);

    if (collateralUsd > 0n) {
      positions.push({
        protocol: 'Aave V3',
        type: 'lend',
        tokens: [{
          symbol: 'aTokens',
          address: ZERO_ADDRESS,
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
          address: ZERO_ADDRESS,
          decimals: 18,
          chainId,
          balance: debtUsd,
          priceUsd: 1,
          valueUsd: debtUsd,
        }],
        valueUsd: debtUsd,
      });
    }

    return positions;
  } catch {
    return [];
  }
}

async function fetchSingleChainPortfolio(
  address: Address,
  chainId: SupportedPortfolioChainId,
  deps: PortfolioFetcherDeps,
): Promise<PortfolioSnapshot> {
  const config = CHAIN_CONFIGS[chainId];
  const tokens: PortfolioToken[] = [];
  let totalValueUsd = 0n;

  const nativeToken = config.tokens.find((token) => token.address === 'native');
  if (nativeToken) {
    const nativeBalance = deps.getBalance
      ? await deps.getBalance({ address, chainId })
      : await getClient(chainId, deps).getBalance({ address });

    if (nativeBalance > 0n) {
      const nativeValueUsd = valueUsd(nativeBalance, nativeToken);
      tokens.push({
        symbol: nativeToken.symbol,
        address: 'native',
        decimals: nativeToken.decimals,
        chainId,
        balance: nativeBalance,
        priceUsd: nativeToken.priceUsd,
        valueUsd: nativeValueUsd,
      });
      totalValueUsd += nativeValueUsd;
    }
  }

  const erc20Tokens = config.tokens.filter((token) => token.address !== 'native');
  const multicallResults = await readErc20Balances(address, chainId, erc20Tokens, deps);

  for (let i = 0; i < erc20Tokens.length; i++) {
    const token = erc20Tokens[i];
    const result = multicallResults[i];
    if (!token || result?.status !== 'success' || result.result <= 0n) continue;

    const tokenValueUsd = valueUsd(result.result, token);
    tokens.push({
      symbol: token.symbol,
      address: token.address as Address,
      decimals: token.decimals,
      chainId,
      balance: result.result,
      priceUsd: token.priceUsd,
      valueUsd: tokenValueUsd,
    });
    totalValueUsd += tokenValueUsd;
  }

  const positions = await fetchBaseAavePositions(address, chainId, deps);
  for (const position of positions) totalValueUsd += position.valueUsd;

  return {
    chainId,
    chainName: config.name,
    timestamp: Date.now(),
    totalValueUsd,
    tokens,
    positions,
  };
}

async function fetchPortfolioAcrossChains(
  address: Address,
  chainIds: readonly number[],
  deps: PortfolioFetcherDeps,
): Promise<PortfolioSnapshot> {
  const normalizedChainIds = chainIds.map(normalizeChainId);
  const settled = await Promise.allSettled(
    normalizedChainIds.map((chainId) => fetchSingleChainPortfolio(address, chainId, deps)),
  );

  const chains: PortfolioSnapshot[] = [];
  const errors: PortfolioChainError[] = [];

  for (let i = 0; i < settled.length; i++) {
    const chainId = normalizedChainIds[i];
    if (!chainId) continue;

    const result = settled[i];
    if (result?.status === 'fulfilled') {
      chains.push(result.value);
      continue;
    }

    const config = CHAIN_CONFIGS[chainId];
    const message = result?.reason instanceof Error ? result.reason.message : String(result?.reason);
    const error = { chainId, chainName: config.name, message };
    errors.push(error);
    deps.log?.warn('portfolio chain fetch failed', error);
  }

  return {
    timestamp: Date.now(),
    totalValueUsd: chains.reduce((sum, snapshot) => sum + snapshot.totalValueUsd, 0n),
    tokens: chains.flatMap((snapshot) => snapshot.tokens),
    positions: chains.flatMap((snapshot) => snapshot.positions),
    chains,
    errors,
  };
}

/**
 * Fetch on-chain portfolio balances.
 *
 * Default behavior is Base mainnet only. Passing `chains` returns an
 * aggregate snapshot with per-chain snapshots and non-blocking chain errors.
 */
export async function fetchPortfolio(
  address: Address,
  deps: PortfolioFetcherDeps = {},
): Promise<PortfolioSnapshot> {
  if (deps.chains) {
    return fetchPortfolioAcrossChains(address, deps.chains, deps);
  }

  return fetchSingleChainPortfolio(address, normalizeChainId(deps.chainId ?? BASE_CHAIN_ID), deps);
}

export async function fetchMultiChainPortfolio(
  address: Address,
  chainIds: number[],
  deps: PortfolioFetcherDeps = {},
): Promise<PortfolioSnapshot[]> {
  const snapshot = await fetchPortfolio(address, { ...deps, chains: chainIds });
  return snapshot.chains ?? [snapshot];
}
