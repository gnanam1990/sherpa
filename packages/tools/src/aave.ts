import { encodeFunctionData, formatUnits, parseUnits, toFunctionSelector } from 'viem';
import {
  AAVE_V3_POOL_ADDRESS,
  ALLOWED_CONTRACTS,
  assertAllowlisted,
  type Address,
} from '@sherpa/safety';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

/**
 * Aave V3 Pool LEND adapter — Base. Stage-2 prep, NOT wired into the
 * executor for Stage 1 launch.
 *
 * Used as the LEND fallback when Morpho rates aren't competitive or the
 * asset isn't supported. Same `quote/buildTx/verify` shape as Morpho so a
 * future LEND planner can swap implementations transparently.
 *
 * Until `AAVE_V3_POOL_ADDRESS` is set in @sherpa/safety, every code path
 * that builds an Aave tx throws `AaveNotConfiguredError`.
 */

export class AaveNotConfiguredError extends Error {
  constructor() {
    super('Aave V3 Pool address not yet configured for this chain');
    this.name = 'AaveNotConfiguredError';
  }
}

export type AaveLendAction = 'deposit' | 'withdraw';

export type AaveLendParams = {
  action: AaveLendAction;
  /** Stage-2 starts with USDC only. */
  asset: 'USDC';
  amount: string;
  recipient: Address;
  /** Aave referral code; default 0. */
  referralCode?: number;
};

export type AaveLendQuote = {
  action: AaveLendAction;
  asset: 'USDC';
  amountBaseUnits: bigint;
  /** Supply APY in basis points. Stub until RPC tier lands. */
  supplyApyBps: number;
  display: string;
};

const AAVE_POOL_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
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
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const SUPPLY_SELECTOR = toFunctionSelector(AAVE_POOL_ABI[0]);
const WITHDRAW_SELECTOR = toFunctionSelector(AAVE_POOL_ABI[1]);

const STUB_SUPPLY_APY_BPS = 380; // 3.80% — illustrative; lower than Morpho stub

export type AaveConfig = {
  /** Override the safety constant — used by tests. */
  poolAddress?: Address;
  /** Optional APY override for tests. */
  stubSupplyApyBps?: number;
};

export type AaveAdapter = ToolAdapter<AaveLendParams, AaveLendQuote, AaveLendParams> & {
  poolAddress: Address | undefined;
};

export function createAave(config: AaveConfig = {}): AaveAdapter {
  const poolAddress = config.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  const apyBps = config.stubSupplyApyBps ?? STUB_SUPPLY_APY_BPS;
  const extras: readonly Address[] = poolAddress ? [poolAddress] : [];

  function requirePool(): Address {
    if (!poolAddress) throw new AaveNotConfiguredError();
    return poolAddress;
  }

  const quote: Quote<AaveLendParams, AaveLendQuote> = async (params) => {
    if (params.asset !== 'USDC') {
      throw new Error(`[aave] unsupported asset ${params.asset} (Stage 2 starts with USDC)`);
    }
    const amountBaseUnits = parseUnits(params.amount, 6);
    const verb = params.action === 'deposit' ? 'Deposit' : 'Withdraw';
    return {
      action: params.action,
      asset: 'USDC',
      amountBaseUnits,
      supplyApyBps: apyBps,
      display: `${verb} ${formatUnits(amountBaseUnits, 6)} USDC @ ${(apyBps / 100).toFixed(2)}% APY (Aave)`,
    };
  };

  const buildTx: BuildTx<AaveLendParams> = async (params) => {
    const pool = requirePool();
    const q = await quote(params);

    const data =
      params.action === 'deposit'
        ? encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: 'supply',
            args: [
              ALLOWED_CONTRACTS.USDC,
              q.amountBaseUnits,
              params.recipient,
              params.referralCode ?? 0,
            ],
          })
        : encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: 'withdraw',
            args: [ALLOWED_CONTRACTS.USDC, q.amountBaseUnits, params.recipient],
          });

    const tx: BuiltTx = {
      to: pool,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to, extras);
    return tx;
  };

  const verify: Verify = async (tx) => {
    if (!poolAddress) {
      return { ok: false, reason: 'Aave V3 Pool address not configured' };
    }
    if (tx.to.toLowerCase() !== poolAddress.toLowerCase()) {
      return { ok: false, reason: 'target is not Aave V3 Pool' };
    }
    if (tx.value !== 0n) {
      return { ok: false, reason: 'LEND must have value=0' };
    }
    if (!tx.data.startsWith(SUPPLY_SELECTOR) && !tx.data.startsWith(WITHDRAW_SELECTOR)) {
      return { ok: false, reason: 'calldata is not Aave supply/withdraw' };
    }
    return { ok: true };
  };

  return { name: 'aave', quote, buildTx, verify, poolAddress };
}

export const aave = createAave();
