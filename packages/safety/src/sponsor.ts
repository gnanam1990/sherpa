/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Address } from './types.js';

/**
 * EIP-5792 sponsorability wrapper.
 *
 * The wallet (Coinbase Smart Wallet) batches a list of `Call`s and submits
 * them via `wallet_sendCalls`. We never broadcast the bundle ourselves — the
 * frontend does — but the executor builds the envelope here so:
 *  - every batched call is allowlisted (Ring 1 holds at the batch level), and
 *  - sponsorability is decided server-side, not by the wallet.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-5792
 */

export type Call = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
};

export type SendCallsParams = {
  /** EIP-5792 version. */
  version: '1.0';
  /** Hex chain id. */
  chainId: `0x${string}`;
  /** Sender (smart wallet) address. */
  from: Address;
  calls: Array<{
    to: Address;
    data: `0x${string}`;
    value: `0x${string}`;
  }>;
  /** Capabilities — paymaster service goes here. */
  capabilities?: {
    paymasterService?: { url: string };
  };
};

export type SponsorContext = {
  chainId: number;
  from: Address;
  paymasterUrl?: string;
};

/** Convert bigint → minimal hex (no leading zeros, but at least `0x0`). */
function toHexValue(v: bigint): `0x${string}` {
  return `0x${v.toString(16)}` as `0x${string}`;
}

/**
 * Wrap a list of calls into an EIP-5792 `wallet_sendCalls` payload. A call is
 * sponsorable iff its `to` is in the safety allowlist AND each individual
 * adapter's `verify()` passed (caller's responsibility to check first).
 */
export function buildSendCallsParams(calls: readonly Call[], ctx: SponsorContext): SendCallsParams {
  if (calls.length === 0) {
    throw new Error('[sponsor] cannot build sendCalls with zero calls');
  }
  const params: SendCallsParams = {
    version: '1.0',
    chainId: toHexValue(BigInt(ctx.chainId)),
    from: ctx.from,
    calls: calls.map((c) => ({
      to: c.to,
      data: c.data,
      value: toHexValue(c.value),
    })),
  };
  if (ctx.paymasterUrl) {
    params.capabilities = { paymasterService: { url: ctx.paymasterUrl } };
  }
  return params;
}

/**
 * A batch is sponsorable if every call's `value` is zero (paymaster won't
 * front native ETH) and the bundle is non-empty. Allowlist enforcement is
 * done by the safety rings on each individual call before we get here.
 */
export function isBatchSponsorable(calls: readonly Call[]): boolean {
  if (calls.length === 0) return false;
  return calls.every((c) => c.value === 0n);
}
