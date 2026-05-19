/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { ZoraMintParams } from './types.js';

export function buildMintCall(params: ZoraMintParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  void params;
  return {
    to: params.collection,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
