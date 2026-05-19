/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { TipParams, TipQuote } from './types.js';

export function buildTipCall(params: TipParams, recipientAddress: `0x${string}` | null): TipQuote {
  if (!recipientAddress) {
    return {
      recipientAddress: null,
      amount: params.amount,
      asset: params.asset,
    };
  }

  return {
    recipientAddress,
    amount: params.amount,
    asset: params.asset,
  };
}
