import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
  parseUnits,
  type Address,
} from 'viem';
import { base } from 'viem/chains';
import { resolveToken, type TokenInfo } from './registry.js';

export const SHERPA_ROUTER_BASE_MAINNET =
  '0x00bfef87DD352D48F8572BcfA52E57870B35DE8b' as const;
export const SHERPA_TREASURY_BASE_MAINNET =
  '0xF4e72beAA559E1815f4671e39EDb1295aD975918' as const;
export const AERODROME_FACTORY_BASE =
  '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as const;

const BASE_MAINNET_CHAIN_ID = 8453;
const ROUTER_FEE_BPS = 10;
const DEFAULT_SLIPPAGE_BPS = 50;
const DEFAULT_DEADLINE_SECONDS = 600;
const VARIABLE_INTEREST_RATE_MODE = 2n;

const SHERPA_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'repay',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const AERODROME_ROUTER_ABI = [
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

const AAVE_POOL_RESERVE_ABI = [
  {
    type: 'function',
    name: 'getReserveData',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'configuration', type: 'uint256' },
      { name: 'liquidityIndex', type: 'uint128' },
      { name: 'currentLiquidityRate', type: 'uint128' },
      { name: 'variableBorrowIndex', type: 'uint128' },
      { name: 'currentVariableBorrowRate', type: 'uint128' },
      { name: 'currentStableBorrowRate', type: 'uint128' },
      { name: 'lastUpdateTimestamp', type: 'uint40' },
      { name: 'id', type: 'uint16' },
      { name: 'aTokenAddress', type: 'address' },
      { name: 'stableDebtTokenAddress', type: 'address' },
      { name: 'variableDebtTokenAddress', type: 'address' },
      { name: 'interestRateStrategyAddress', type: 'address' },
      { name: 'accruedToTreasury', type: 'uint128' },
      { name: 'unbacked', type: 'uint128' },
      { name: 'isolationModeTotalDebt', type: 'uint128' },
    ],
  },
] as const;

const VARIABLE_DEBT_TOKEN_ABI = [
  {
    type: 'function',
    name: 'approveDelegation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'delegatee', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export type SherpaRouterStep = {
  kind: 'approve' | 'swap' | 'custom';
  to: Address;
  data: `0x${string}`;
  value: bigint;
  label: string;
};

export type SherpaRouterReadContract = (params: {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}) => Promise<unknown>;

export type SherpaRouterDeps = {
  routerAddress?: Address;
  aerodromeRouterAddress: Address;
  aerodromeFactoryAddress?: Address;
  aavePoolAddress: Address;
  rpcUrl?: string;
  now?: () => number;
  readContract?: SherpaRouterReadContract;
};

export type SherpaRouterPlan = {
  steps: SherpaRouterStep[];
  amountBaseUnits: bigint;
  asset: TokenInfo;
  secondaryDisplay?: string;
  quotedOut?: bigint;
  minOut?: bigint;
};

type Route = {
  from: Address;
  to: Address;
  stable: boolean;
  factory: Address;
};

function getReadContract(deps: SherpaRouterDeps): SherpaRouterReadContract {
  if (deps.readContract) return deps.readContract;
  const client = createPublicClient({
    chain: base,
    transport: http(deps.rpcUrl ?? 'https://mainnet.base.org'),
  });
  return (params) =>
    client.readContract(params as Parameters<typeof client.readContract>[0]) as Promise<unknown>;
}

function tokenFor(symbol: string): TokenInfo {
  const token = resolveToken(symbol, BASE_MAINNET_CHAIN_ID);
  if (!token || token.address === 'native') {
    throw new Error(`Sherpa mainnet Stage 2 supports USDC and WETH. Try WETH instead of native ETH.`);
  }
  return token;
}

function tokenAddress(token: TokenInfo): Address {
  if (token.address === 'native') {
    throw new Error(`Sherpa mainnet Stage 2 supports ERC-20 assets only. Try WETH instead of native ETH.`);
  }
  return token.address;
}

function amountFor(amount: string, token: TokenInfo): bigint {
  const parsed = parseUnits(amount, token.decimals);
  if (parsed <= 0n) throw new Error('amount must be greater than zero');
  return parsed;
}

function routerAddress(deps: SherpaRouterDeps): Address {
  return deps.routerAddress ?? SHERPA_ROUTER_BASE_MAINNET;
}

function approveStep(token: TokenInfo, spender: Address, amount: bigint, label: string): SherpaRouterStep {
  if (token.address === 'native') throw new Error('native ETH approvals are not supported');
  return {
    kind: 'approve',
    to: token.address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    }),
    value: 0n,
    label,
  };
}

async function reserveTokens(asset: Address, deps: SherpaRouterDeps): Promise<{
  aTokenAddress: Address;
  variableDebtTokenAddress: Address;
}> {
  const readContract = getReadContract(deps);
  const result = (await readContract({
    address: deps.aavePoolAddress,
    abi: AAVE_POOL_RESERVE_ABI,
    functionName: 'getReserveData',
    args: [asset],
  })) as readonly unknown[];

  const aTokenAddress = result[8];
  const variableDebtTokenAddress = result[10];
  if (typeof aTokenAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(aTokenAddress)) {
    throw new Error(`Aave reserve missing aToken for ${asset}`);
  }
  if (
    typeof variableDebtTokenAddress !== 'string' ||
    !/^0x[a-fA-F0-9]{40}$/.test(variableDebtTokenAddress)
  ) {
    throw new Error(`Aave reserve missing variable debt token for ${asset}`);
  }
  return {
    aTokenAddress: aTokenAddress as Address,
    variableDebtTokenAddress: variableDebtTokenAddress as Address,
  };
}

export async function buildSherpaRouterSwapPlan(params: {
  fromAsset: string;
  toAsset: string;
  amount: string;
  slippageBps?: number;
  deps: SherpaRouterDeps;
}): Promise<SherpaRouterPlan> {
  const tokenIn = tokenFor(params.fromAsset);
  const tokenOut = tokenFor(params.toAsset);
  if (tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase()) {
    throw new Error('fromAsset and toAsset must differ');
  }

  const amountIn = amountFor(params.amount, tokenIn);
  const tokenInAddress = tokenAddress(tokenIn);
  const tokenOutAddress = tokenAddress(tokenOut);
  const route: Route = {
    from: tokenInAddress,
    to: tokenOutAddress,
    stable: false,
    factory: params.deps.aerodromeFactoryAddress ?? AERODROME_FACTORY_BASE,
  };
  const amountAfterFee = amountIn - (amountIn * BigInt(ROUTER_FEE_BPS)) / 10_000n;
  const readContract = getReadContract(params.deps);
  const amounts = (await readContract({
    address: params.deps.aerodromeRouterAddress,
    abi: AERODROME_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountAfterFee, [route]],
  })) as readonly bigint[];
  const quotedOut = amounts.at(-1);
  if (typeof quotedOut !== 'bigint' || quotedOut <= 0n) {
    throw new Error('Aerodrome returned no output quote');
  }

  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const minOut = (quotedOut * (10_000n - BigInt(slippageBps))) / 10_000n;
  const deadline = BigInt((params.deps.now?.() ?? Math.floor(Date.now() / 1000)) + DEFAULT_DEADLINE_SECONDS);
  const router = routerAddress(params.deps);

  return {
    amountBaseUnits: amountIn,
    asset: tokenIn,
    quotedOut,
    minOut,
    secondaryDisplay: `minimum ${minOut.toString()} ${tokenOut.symbol} base units`,
    steps: [
      approveStep(tokenIn, router, amountIn, `Approve ${params.amount} ${tokenIn.symbol} for SherpaRouter`),
      {
        kind: 'swap',
        to: router,
        data: encodeFunctionData({
          abi: SHERPA_ROUTER_ABI,
          functionName: 'swap',
          args: [tokenInAddress, tokenOutAddress, amountIn, minOut, [route], deadline],
        }),
        value: 0n,
        label: `Swap ${params.amount} ${tokenIn.symbol} to ${tokenOut.symbol} via SherpaRouter`,
      },
    ],
  };
}

export async function buildSherpaRouterSupplyPlan(params: {
  asset: string;
  amount: string;
  deps: SherpaRouterDeps;
}): Promise<SherpaRouterPlan> {
  const asset = tokenFor(params.asset);
  const assetAddress = tokenAddress(asset);
  const amount = amountFor(params.amount, asset);
  const router = routerAddress(params.deps);
  return {
    amountBaseUnits: amount,
    asset,
    secondaryDisplay: 'Aave V3 via SherpaRouter',
    steps: [
      approveStep(asset, router, amount, `Approve ${params.amount} ${asset.symbol} for SherpaRouter`),
      {
        kind: 'custom',
        to: router,
        data: encodeFunctionData({
          abi: SHERPA_ROUTER_ABI,
          functionName: 'supply',
          args: [assetAddress, amount],
        }),
        value: 0n,
        label: `Supply ${params.amount} ${asset.symbol} to Aave via SherpaRouter`,
      },
    ],
  };
}

export async function buildSherpaRouterWithdrawPlan(params: {
  asset: string;
  amount: string;
  deps: SherpaRouterDeps;
}): Promise<SherpaRouterPlan> {
  const asset = tokenFor(params.asset);
  const assetAddress = tokenAddress(asset);
  const amount = amountFor(params.amount, asset);
  const router = routerAddress(params.deps);
  const { aTokenAddress } = await reserveTokens(assetAddress, params.deps);
  return {
    amountBaseUnits: amount,
    asset,
    secondaryDisplay: 'Aave V3 via SherpaRouter',
    steps: [
      {
        kind: 'approve',
        to: aTokenAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [router, amount],
        }),
        value: 0n,
        label: `Approve a${asset.symbol} for SherpaRouter`,
      },
      {
        kind: 'custom',
        to: router,
        data: encodeFunctionData({
          abi: SHERPA_ROUTER_ABI,
          functionName: 'withdraw',
          args: [assetAddress, amount],
        }),
        value: 0n,
        label: `Withdraw ${params.amount} ${asset.symbol} from Aave via SherpaRouter`,
      },
    ],
  };
}

export async function buildSherpaRouterBorrowPlan(params: {
  asset: string;
  amount: string;
  deps: SherpaRouterDeps;
}): Promise<SherpaRouterPlan> {
  const asset = tokenFor(params.asset);
  const assetAddress = tokenAddress(asset);
  const amount = amountFor(params.amount, asset);
  const router = routerAddress(params.deps);
  const { variableDebtTokenAddress } = await reserveTokens(assetAddress, params.deps);
  return {
    amountBaseUnits: amount,
    asset,
    secondaryDisplay: 'variable debt mode',
    steps: [
      {
        kind: 'approve',
        to: variableDebtTokenAddress,
        data: encodeFunctionData({
          abi: VARIABLE_DEBT_TOKEN_ABI,
          functionName: 'approveDelegation',
          args: [router, amount],
        }),
        value: 0n,
        label: `Approve ${asset.symbol} debt delegation for SherpaRouter`,
      },
      {
        kind: 'custom',
        to: router,
        data: encodeFunctionData({
          abi: SHERPA_ROUTER_ABI,
          functionName: 'borrow',
          args: [assetAddress, amount, VARIABLE_INTEREST_RATE_MODE],
        }),
        value: 0n,
        label: `Borrow ${params.amount} ${asset.symbol} from Aave via SherpaRouter`,
      },
    ],
  };
}

export async function buildSherpaRouterRepayPlan(params: {
  asset: string;
  amount: string;
  deps: SherpaRouterDeps;
}): Promise<SherpaRouterPlan> {
  const asset = tokenFor(params.asset);
  const assetAddress = tokenAddress(asset);
  const amount = amountFor(params.amount, asset);
  const router = routerAddress(params.deps);
  return {
    amountBaseUnits: amount,
    asset,
    secondaryDisplay: 'variable debt mode',
    steps: [
      approveStep(asset, router, amount, `Approve ${params.amount} ${asset.symbol} for SherpaRouter`),
      {
        kind: 'custom',
        to: router,
        data: encodeFunctionData({
          abi: SHERPA_ROUTER_ABI,
          functionName: 'repay',
          args: [assetAddress, amount, VARIABLE_INTEREST_RATE_MODE],
        }),
        value: 0n,
        label: `Repay ${params.amount} ${asset.symbol} to Aave via SherpaRouter`,
      },
    ],
  };
}
