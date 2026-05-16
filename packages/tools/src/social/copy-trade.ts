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
