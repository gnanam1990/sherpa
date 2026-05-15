import type { CopyTradeSettings } from './types.js';

export async function startCopyTrade(
  settings: CopyTradeSettings,
): Promise<{ success: boolean; id: string }> {
  return { success: true, id: 'stub-copy-trade-id' };
}

export async function stopCopyTrade(
  traderAddress: `0x${string}`,
): Promise<{ success: boolean }> {
  return { success: true };
}

export async function getCopyTradeStatus(
  traderAddress: `0x${string}`,
): Promise<{ active: boolean; tradesCopied: number; successRate: number }> {
  return { active: true, tradesCopied: 25, successRate: 92 };
}
