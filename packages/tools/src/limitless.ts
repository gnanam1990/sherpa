import { encodeFunctionData, erc20Abi, parseUnits } from 'viem';
import {
  ALLOWED_CONTRACTS,
  LIMITLESS_FACTORY_ADDRESS,
  assertAllowlisted,
  type Address,
} from '@sherpa/safety';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

export class LimitlessNotConfiguredError extends Error {
  constructor() {
    super('Limitless Sepolia address not yet configured');
    this.name = 'LimitlessNotConfiguredError';
  }
}

function requireFactory(): Address {
  if (!LIMITLESS_FACTORY_ADDRESS) throw new LimitlessNotConfiguredError();
  return LIMITLESS_FACTORY_ADDRESS;
}

/**
 * Limitless Exchange BET adapter — Base Sepolia.
 *
 * Two-step flow batched via EIP-5792:
 *   1. USDC.approve(LIMITLESS_FACTORY, stake)
 *   2. CTFExchange.buyOutcomeShares(marketId, outcome, stake, minSharesOut)
 *
 * `quote()` calls the Limitless REST API when configured; otherwise returns a
 * 50/50 stub so unit tests run offline.
 */

export type BetParams = {
  stake: string;
  marketId: `0x${string}`;
  outcome: 0 | 1;
  slippageBps?: number;
};

export type BetQuote = {
  asset: 'USDC';
  stakeBaseUnits: bigint;
  minSharesOut: bigint;
  estimatedPayoutBaseUnits: bigint;
  odds: string;
};

const DEFAULT_SLIPPAGE_BPS = 100;

const CTF_EXCHANGE_ABI = [
  {
    type: 'function',
    name: 'buyOutcomeShares',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'outcome', type: 'uint8' },
      { name: 'stake', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
] as const;

export type LimitlessConfig = {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
};

type RestMarketQuote = { yesPrice: string; noPrice: string };

async function fetchMarketQuote(
  cfg: LimitlessConfig,
  marketId: string,
): Promise<RestMarketQuote | null> {
  if (!cfg.apiUrl) return null;
  const f = cfg.fetchImpl ?? fetch;
  const res = await f(`${cfg.apiUrl}/markets/${marketId}/quote`);
  if (!res.ok) throw new Error(`[limitless] api ${res.status}`);
  return (await res.json()) as RestMarketQuote;
}

export function createLimitless(
  config: LimitlessConfig = {},
): ToolAdapter<BetParams, BetQuote, BetParams> {
  const quote: Quote<BetParams, BetQuote> = async (params) => {
    const stakeBaseUnits = parseUnits(params.stake, 6);
    let pricePerShare = 0.5;
    try {
      const m = await fetchMarketQuote(config, params.marketId);
      if (m) {
        const p = Number(params.outcome === 1 ? m.yesPrice : m.noPrice);
        if (Number.isFinite(p) && p > 0 && p < 1) pricePerShare = p;
      }
    } catch {
      pricePerShare = 0.5;
    }
    const sharesFloat = Number(params.stake) / pricePerShare;
    const sharesBaseUnits = parseUnits(sharesFloat.toFixed(6), 6);
    const slippageBps = BigInt(params.slippageBps ?? DEFAULT_SLIPPAGE_BPS);
    const minSharesOut = (sharesBaseUnits * (10_000n - slippageBps)) / 10_000n;
    return {
      asset: 'USDC',
      stakeBaseUnits,
      minSharesOut,
      estimatedPayoutBaseUnits: sharesBaseUnits,
      odds: `${(1 / pricePerShare).toFixed(2)}x`,
    };
  };

  const buildTx: BuildTx<BetParams> = async (params) => {
    const factory = requireFactory();
    const q = await quote(params);
    const data = encodeFunctionData({
      abi: CTF_EXCHANGE_ABI,
      functionName: 'buyOutcomeShares',
      args: [params.marketId, params.outcome, q.stakeBaseUnits, q.minSharesOut],
    });
    const tx: BuiltTx = {
      to: factory,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to);
    return tx;
  };

  const verify: Verify = async (tx) => {
    if (!LIMITLESS_FACTORY_ADDRESS) {
      return { ok: false, reason: 'Limitless Sepolia address not yet configured' };
    }
    if (tx.to.toLowerCase() !== LIMITLESS_FACTORY_ADDRESS.toLowerCase()) {
      return { ok: false, reason: 'target is not Limitless exchange' };
    }
    if (tx.value !== 0n) {
      return { ok: false, reason: 'Limitless bet must have value=0 (USDC-funded)' };
    }
    return { ok: true };
  };

  return { name: 'limitless', quote, buildTx, verify };
}

/** USDC approval calldata used as step 0 of a Limitless or Uniswap plan. */
export function buildApproveCall(
  spender: Address,
  amountBaseUnits: bigint,
): { to: Address; data: `0x${string}`; value: bigint } {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amountBaseUnits],
  });
  return { to: ALLOWED_CONTRACTS.USDC, data, value: 0n };
}

export const limitless = createLimitless();
