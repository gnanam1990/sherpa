import type { CopyTradeSettings } from './types.js';

export async function startCopyTrade(
  _settings: CopyTradeSettings,
): Promise<{ success: boolean; id: string }> {
  return { success: true, id: 'stub-copy-trade-id' };
}

export async function stopCopyTrade(
  _traderAddress: `0x${string}`,
): Promise<{ success: boolean }> {
  return { success: true };
}

export async function getCopyTradeStatus(
  _traderAddress: `0x${string}`,
): Promise<{ active: boolean; tradesCopied: number; successRate: number }> {
  return { active: true, tradesCopied: 25, successRate: 92 };
}
