/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { SessionKeyPermission } from './types.js';

export function buildSessionKeyCall(params: {
  target: `0x${string}`;
  selector: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
}): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return {
    to: params.target,
    data: params.data,
    value: params.value,
  };
}

export function validateExecution(
  permission: SessionKeyPermission,
  target: `0x${string}`,
  selector: `0x${string}`,
  value: bigint,
): { ok: boolean; error?: string } {
  if (permission.target.toLowerCase() !== target.toLowerCase()) {
    return { ok: false, error: 'Target not permitted' };
  }
  if (permission.selector !== selector) {
    return { ok: false, error: 'Function selector not permitted' };
  }
  if (value > permission.maxValue) {
    return { ok: false, error: 'Value exceeds permission limit' };
  }
  return { ok: true };
}
