/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { LimitlessOrderParams } from './types.js';

export function buildBuyOrderCall(_params: LimitlessOrderParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  throw new Error('limitless_order_builder_not_configured');
}
