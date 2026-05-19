/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Address } from '@sherpa/safety';
import type { BridgeParams, BridgeQuote } from './types.js';
import { SUPPORTED_CHAINS } from './types.js';

const DEPOSIT_V3_SELECTOR = '0x06180d0a';

export type BridgeCallResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
};

export async function buildBridgeCall(
  params: BridgeParams,
  quote: BridgeQuote,
  depositor: Address,
  recipient: Address,
  inputToken: Address,
): Promise<BridgeCallResult> {
  const destChainId = SUPPORTED_CHAINS[params.destinationChain];
  if (!destChainId) {
    throw new Error(`Unsupported destination chain: ${params.destinationChain}`);
  }

  const fillDeadline = Math.floor(Date.now() / 1000) + 1800; // 30 min
  const quoteTimestamp = Math.floor(Date.now() / 1000);

  // Encode depositV3 call data
  const data = encodeDepositV3(
    depositor,
    recipient,
    inputToken,
    inputToken,
    params.amount,
    quote.minOutAmount,
    BigInt(destChainId),
    '0x0000000000000000000000000000000000000000' as Address,
    quoteTimestamp,
    fillDeadline,
    0,
  );

  return {
    to: quote.spokePool,
    data,
    value: quote.relayerFee,
    sponsorable: false,
  };
}

function encodeDepositV3(
  depositor: Address,
  recipient: Address,
  inputToken: Address,
  outputToken: Address,
  inputAmount: bigint,
  outputAmount: bigint,
  destinationChainId: bigint,
  exclusiveRelayer: Address,
  quoteTimestamp: number,
  fillDeadline: number,
  exclusivityParameter: number,
): `0x${string}` {
  const encodeAddress = (addr: string) =>
    addr.toLowerCase().replace('0x', '').padStart(64, '0');
  const encodeUint256 = (val: bigint) =>
    val.toString(16).padStart(64, '0');
  const encodeUint32 = (val: number) =>
    val.toString(16).padStart(64, '0');

  const encoded =
    DEPOSIT_V3_SELECTOR +
    encodeAddress(depositor) +
    encodeAddress(recipient) +
    encodeAddress(inputToken) +
    encodeAddress(outputToken) +
    encodeUint256(inputAmount) +
    encodeUint256(outputAmount) +
    encodeUint256(destinationChainId) +
    encodeAddress(exclusiveRelayer) +
    encodeUint32(quoteTimestamp) +
    encodeUint32(fillDeadline) +
    encodeUint32(exclusivityParameter) +
    // message offset (0, no message)
    encodeUint256(0n) +
    // message length (0)
    encodeUint256(0n);

  return encoded as `0x${string}`;
}
