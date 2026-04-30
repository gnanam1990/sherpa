import { encodeFunctionData, erc20Abi, parseUnits } from 'viem';
import { ALLOWED_CONTRACTS, assertAllowlisted, type Address } from '@sherpa/safety';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

/**
 * USDC adapter (Base Sepolia — 6 decimals).
 *
 * Exports `quote / buildTx / verify` per the M1 hard rule (naming non-negotiable).
 */

export type UsdcTransferParams = {
  /** Human amount, e.g. "5" = 5 USDC. */
  amount: string;
  /** Already-resolved recipient (never an LLM-guessed 0x). */
  to: Address;
};

export type UsdcQuote = {
  asset: 'USDC';
  /** Amount in base units (6 decimals). */
  amountBaseUnits: bigint;
  /** Approximate USD display (USDC is a stablecoin → 1:1). */
  usdDisplay: string;
};

const quote: Quote<UsdcTransferParams, UsdcQuote> = async (params) => {
  const amountBaseUnits = parseUnits(params.amount, 6);
  return {
    asset: 'USDC',
    amountBaseUnits,
    usdDisplay: `$${Number(params.amount).toFixed(2)}`,
  };
};

const buildTx: BuildTx<UsdcTransferParams> = async (params) => {
  const amountBaseUnits = parseUnits(params.amount, 6);
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [params.to, amountBaseUnits],
  });
  const tx: BuiltTx = {
    to: ALLOWED_CONTRACTS.USDC,
    data,
    value: 0n,
    sponsorable: true,
  };
  // Safety ring 1 — re-assert target at build time.
  assertAllowlisted(tx.to);
  return tx;
};

const verify: Verify = async (tx) => {
  if (tx.to.toLowerCase() !== ALLOWED_CONTRACTS.USDC.toLowerCase()) {
    return { ok: false, reason: 'target is not USDC' };
  }
  if (tx.value !== 0n) {
    return { ok: false, reason: 'USDC transfer must have value=0' };
  }
  if (!tx.data.startsWith('0xa9059cbb')) {
    return { ok: false, reason: 'calldata is not ERC-20 transfer(address,uint256)' };
  }
  return { ok: true };
};

export const usdc: ToolAdapter<UsdcTransferParams, UsdcQuote, UsdcTransferParams> = {
  name: 'usdc',
  quote,
  buildTx,
  verify,
};
