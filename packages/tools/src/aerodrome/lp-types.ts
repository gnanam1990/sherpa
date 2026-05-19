/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type LPQuoteParams = {
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  stable: boolean;
};

export type LPQuote = {
  lpTokenAmount: bigint;
  priceImpactBps: number;
  pool: { address: `0x${string}`; stable: boolean };
};
