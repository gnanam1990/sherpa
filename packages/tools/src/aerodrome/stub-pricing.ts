/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { fetchPythPriceUsd, type PythConfig } from '../pyth.js';
import type { SwapAsset } from './types.js';

/**
 * Pyth-based stub pricing. Used when the on-chain quoter is unavailable
 * (AERODROME_ROUTER_ADDRESS unset) or as a fallback when Pyth is faster.
 *
 * The 3000-USD-per-ETH hard stub is the last-resort tier.
 */

const STUB_ETH_USD_PRICE = 3000;

export type { PythConfig };

/** Convert amountIn to amountOut using a USD-per-ETH price. */
export function priceConvert(
  amountInBaseUnits: bigint,
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  ethUsd: number,
): bigint {
  const priceScaled = BigInt(Math.round(ethUsd * 1e8));
  if (priceScaled <= 0n) return 0n;
  if (fromAsset === toAsset) return amountInBaseUnits;
  if (fromAsset === 'USDC' && toAsset === 'ETH') {
    return (amountInBaseUnits * 10n ** 20n) / priceScaled;
  }
  return (amountInBaseUnits * priceScaled) / 10n ** 20n;
}

export async function stubQuote(
  amountInBaseUnits: bigint,
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  pyth?: PythConfig | false,
): Promise<{ amountOut: bigint; ethUsd: number }> {
  let ethUsd = STUB_ETH_USD_PRICE;
  if (pyth !== false) {
    const fromPyth = await fetchPythPriceUsd('ETH/USD', pyth ?? {});
    if (fromPyth !== null) ethUsd = fromPyth;
  }
  return { amountOut: priceConvert(amountInBaseUnits, fromAsset, toAsset, ethUsd), ethUsd };
}
