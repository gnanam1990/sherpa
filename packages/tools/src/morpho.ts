import { encodeFunctionData, formatUnits, parseUnits, toFunctionSelector } from 'viem';
import {
  ALLOWED_CONTRACTS,
  MORPHO_BLUE_ADDRESS,
  assertAllowlisted,
  type Address,
} from '@sherpa/safety';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

/**
 * Morpho Blue LEND adapter — Base. Stage-2 prep, NOT wired into the
 * executor for Stage 1 launch.
 *
 * Two flows: `deposit` (Morpho.supply) and `withdraw` (Morpho.withdraw),
 * both keyed on a `MarketParams` tuple. Stage 2 picks the best USDC market
 * via a separate planner; this adapter just produces calldata for a given
 * market.
 *
 * Until `MORPHO_BLUE_ADDRESS` is set in @sherpa/safety, every code path
 * that builds a Morpho tx throws `MorphoNotConfiguredError`.
 */

export class MorphoNotConfiguredError extends Error {
  constructor() {
    super('Morpho Blue address not yet configured for this chain');
    this.name = 'MorphoNotConfiguredError';
  }
}

export type LendAction = 'deposit' | 'withdraw';

/**
 * Morpho Blue market identity. The protocol hashes this tuple to compute
 * `id`; we pass the full struct because `supply`/`withdraw` take it as an
 * argument.
 */
export type MorphoMarketParams = {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  /** Liquidation LTV scaled by 1e18 (e.g. 86% = 860000000000000000n). */
  lltv: bigint;
};

export type MorphoLendParams = {
  action: LendAction;
  /** Stage-2 starts with USDC only. The asset must equal `marketParams.loanToken`. */
  asset: 'USDC';
  /** Display amount, e.g. "100" for 100 USDC. */
  amount: string;
  recipient: Address;
  marketParams: MorphoMarketParams;
};

export type MorphoLendQuote = {
  action: LendAction;
  asset: 'USDC';
  amountBaseUnits: bigint;
  /** Supply APY in basis points. Stub value until RPC tier lands. */
  supplyApyBps: number;
  display: string;
};

const MORPHO_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsSupplied', type: 'uint256' },
      { name: 'sharesSupplied', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [
      { name: 'assetsWithdrawn', type: 'uint256' },
      { name: 'sharesWithdrawn', type: 'uint256' },
    ],
  },
] as const;

const SUPPLY_SELECTOR = toFunctionSelector(MORPHO_ABI[0]);
const WITHDRAW_SELECTOR = toFunctionSelector(MORPHO_ABI[1]);

const STUB_SUPPLY_APY_BPS = 450; // 4.50% — illustrative until RPC tier lands

export type MorphoConfig = {
  /** Override the safety constant — used by tests. */
  morphoAddress?: Address;
  /** Optional APY override for tests. */
  stubSupplyApyBps?: number;
};

export type MorphoAdapter = ToolAdapter<MorphoLendParams, MorphoLendQuote, MorphoLendParams> & {
  morphoAddress: Address | undefined;
};

export function createMorpho(config: MorphoConfig = {}): MorphoAdapter {
  const morphoAddress = config.morphoAddress ?? MORPHO_BLUE_ADDRESS;
  const apyBps = config.stubSupplyApyBps ?? STUB_SUPPLY_APY_BPS;
  const extras: readonly Address[] = morphoAddress ? [morphoAddress] : [];

  function requireMorpho(): Address {
    if (!morphoAddress) throw new MorphoNotConfiguredError();
    return morphoAddress;
  }

  const quote: Quote<MorphoLendParams, MorphoLendQuote> = async (params) => {
    if (params.asset !== 'USDC') {
      throw new Error(`[morpho] unsupported asset ${params.asset} (Stage 2 starts with USDC)`);
    }
    if (params.marketParams.loanToken.toLowerCase() !== ALLOWED_CONTRACTS.USDC.toLowerCase()) {
      throw new Error('[morpho] marketParams.loanToken must equal USDC for asset=USDC');
    }
    const amountBaseUnits = parseUnits(params.amount, 6);
    const verb = params.action === 'deposit' ? 'Deposit' : 'Withdraw';
    return {
      action: params.action,
      asset: 'USDC',
      amountBaseUnits,
      supplyApyBps: apyBps,
      display: `${verb} ${formatUnits(amountBaseUnits, 6)} USDC @ ${(apyBps / 100).toFixed(2)}% APY`,
    };
  };

  const buildTx: BuildTx<MorphoLendParams> = async (params) => {
    const morpho = requireMorpho();
    const q = await quote(params);

    const data =
      params.action === 'deposit'
        ? encodeFunctionData({
            abi: MORPHO_ABI,
            functionName: 'supply',
            args: [params.marketParams, q.amountBaseUnits, 0n, params.recipient, '0x'],
          })
        : encodeFunctionData({
            abi: MORPHO_ABI,
            functionName: 'withdraw',
            args: [
              params.marketParams,
              q.amountBaseUnits,
              0n,
              params.recipient,
              params.recipient,
            ],
          });

    const tx: BuiltTx = {
      to: morpho,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to, extras);
    return tx;
  };

  const verify: Verify = async (tx) => {
    if (!morphoAddress) {
      return { ok: false, reason: 'Morpho Blue address not configured' };
    }
    if (tx.to.toLowerCase() !== morphoAddress.toLowerCase()) {
      return { ok: false, reason: 'target is not Morpho Blue' };
    }
    if (tx.value !== 0n) {
      return { ok: false, reason: 'LEND must have value=0' };
    }
    if (!tx.data.startsWith(SUPPLY_SELECTOR) && !tx.data.startsWith(WITHDRAW_SELECTOR)) {
      return { ok: false, reason: 'calldata is not Morpho supply/withdraw' };
    }
    return { ok: true };
  };

  return { name: 'morpho', quote, buildTx, verify, morphoAddress };
}

export const morpho = createMorpho();
