/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

// Copy-trade is a Stage 10+ feature. All functions throw explicitly.
// This module must not return stub stats or fake active status.

import type { CopyTradeSettings } from './types.js';

export async function startCopyTrade(
  _settings: CopyTradeSettings,
): Promise<never> {
  throw new Error('copy-trade not yet implemented — Stage 10+ feature');
}

export async function stopCopyTrade(
  _traderAddress: `0x${string}`,
): Promise<never> {
  throw new Error('copy-trade not yet implemented — Stage 10+ feature');
}

export async function getCopyTradeStatus(
  _traderAddress: `0x${string}`,
): Promise<never> {
  throw new Error('copy-trade not yet implemented — Stage 10+ feature');
}
