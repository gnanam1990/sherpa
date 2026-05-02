import { ALLOWED_CONTRACTS, assertAllowlisted } from '@sherpa/safety';
import { parseUnits } from 'viem';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

/**
 * Limitless Exchange BET adapter — Stage-1 Week-4 scaffold.
 *
 * The live factory ABI / address on Base Sepolia needs final confirmation
 * from the Limitless team, so the real calldata encoding is left as a
 * follow-up (see TODO below). The shape + exports are in place so
 * `@sherpa/core` can already route BET intents through `quote/buildTx/verify`
 * for unit testing.
 */

export type BetParams = {
  /** USDC amount, human-readable ("5" = 5 USDC). */
  stake: string;
  /** Market id from Limitless. */
  marketId: `0x${string}`;
  /** Outcome index — typically 0 = NO, 1 = YES. */
  outcome: 0 | 1;
};

export type BetQuote = {
  asset: 'USDC';
  stakeBaseUnits: bigint;
  estimatedPayoutBaseUnits: bigint;
  odds: string;
};

const quote: Quote<BetParams, BetQuote> = async (params) => {
  const stakeBaseUnits = parseUnits(params.stake, 6);
  // Stage-1 placeholder: assume 2x payout; real numbers come from Limitless API.
  const estimatedPayoutBaseUnits = stakeBaseUnits * 2n;
  return {
    asset: 'USDC',
    stakeBaseUnits,
    estimatedPayoutBaseUnits,
    odds: '2.0x',
  };
};

const buildTx: BuildTx<BetParams> = async (_params) => {
  // TODO(week-4): encode against the real Limitless factory ABI once we have
  // it on Sepolia. For now, produce a syntactically-valid tx targeting the
  // allowlisted factory with empty calldata so the safety layer can still
  // reason about it.
  const tx: BuiltTx = {
    to: ALLOWED_CONTRACTS.LIMITLESS_FACTORY,
    data: '0x',
    value: 0n,
    sponsorable: true,
  };
  assertAllowlisted(tx.to);
  return tx;
};

const verify: Verify = async (tx) => {
  if (tx.to.toLowerCase() !== ALLOWED_CONTRACTS.LIMITLESS_FACTORY.toLowerCase()) {
    return { ok: false, reason: 'target is not Limitless factory' };
  }
  if (tx.value !== 0n) {
    return { ok: false, reason: 'Limitless bet must have value=0 (USDC-funded)' };
  }
  return { ok: true };
};

export const limitless: ToolAdapter<BetParams, BetQuote, BetParams> = {
  name: 'limitless',
  quote,
  buildTx,
  verify,
};
