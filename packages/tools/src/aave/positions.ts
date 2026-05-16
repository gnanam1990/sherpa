import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { USER_ACCOUNT_DATA_ABI } from './user-account.js';

export const AAVE_POOL_BASE = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const;
export const AAVE_ORACLE_BASE = '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156' as const;
export const MAX_HEALTH_FACTOR = 2n ** 256n - 1n;

export type AavePosition = {
  /** Aave base currency amount, USD with 8 decimals on Base. */
  totalCollateralBase: bigint;
  /** Aave base currency amount, USD with 8 decimals on Base. */
  totalDebtBase: bigint;
  /** Aave base currency amount, USD with 8 decimals on Base. */
  availableBorrowsBase: bigint;
  /** Basis points. */
  currentLiquidationThreshold: bigint;
  /** Basis points. */
  ltv: bigint;
  /** 1e18 scale. Max uint when the account has no debt. */
  healthFactor: bigint;
  hasPosition: boolean;
  fetchedAt: Date;
};

type AccountDataTuple = readonly [bigint, bigint, bigint, bigint, bigint, bigint];

type ReadUserAccountData = (params: {
  address: typeof AAVE_POOL_BASE;
  abi: typeof USER_ACCOUNT_DATA_ABI;
  functionName: 'getUserAccountData';
  args: readonly [Address];
}) => Promise<AccountDataTuple>;

export type AavePositionsDeps = {
  rpcUrl?: string;
  now?: () => Date;
  readContract?: ReadUserAccountData;
};

function normalizeDeps(depsOrRpcUrl?: string | AavePositionsDeps): AavePositionsDeps {
  if (typeof depsOrRpcUrl === 'string') return { rpcUrl: depsOrRpcUrl };
  return depsOrRpcUrl ?? {};
}

function getReadContract(deps: AavePositionsDeps): ReadUserAccountData {
  if (deps.readContract) return deps.readContract;
  const client = createPublicClient({
    chain: base,
    transport: http(deps.rpcUrl || 'https://mainnet.base.org'),
  });
  return async (params) => client.readContract(params) as Promise<AccountDataTuple>;
}

export async function getUserAaveAccountData(
  userAddress: Address,
  depsOrRpcUrl?: string | AavePositionsDeps,
): Promise<AavePosition> {
  const deps = normalizeDeps(depsOrRpcUrl);
  const readContract = getReadContract(deps);

  const result = await readContract({
    address: AAVE_POOL_BASE,
    abi: USER_ACCOUNT_DATA_ABI,
    functionName: 'getUserAccountData',
    args: [userAddress],
  });

  return {
    totalCollateralBase: result[0],
    totalDebtBase: result[1],
    availableBorrowsBase: result[2],
    currentLiquidationThreshold: result[3],
    ltv: result[4],
    healthFactor: result[5],
    hasPosition: result[0] > 0n || result[1] > 0n,
    fetchedAt: deps.now?.() ?? new Date(),
  };
}

export function isMaxHealthFactor(healthFactor: bigint): boolean {
  return healthFactor === MAX_HEALTH_FACTOR;
}

export function classifyHealthFactor(
  healthFactor: bigint,
): 'no-debt' | 'safe' | 'caution' | 'risky' | 'danger' {
  if (isMaxHealthFactor(healthFactor)) return 'no-debt';
  if (healthFactor >= 2_000_000_000_000_000_000n) return 'safe';
  if (healthFactor >= 1_500_000_000_000_000_000n) return 'caution';
  if (healthFactor >= 1_200_000_000_000_000_000n) return 'risky';
  return 'danger';
}
