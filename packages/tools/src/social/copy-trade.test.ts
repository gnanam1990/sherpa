import { describe, test, expect } from 'vitest';
import { startCopyTrade, stopCopyTrade, getCopyTradeStatus } from './copy-trade.js';

describe('copy-trade (P1-8)', () => {
  test('startCopyTrade throws — no fake stats', async () => {
    await expect(
      startCopyTrade({ traderAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`, maxAmountPerTrade: '100', maxDailyAmount: '1000', enabledIntents: [] }),
    ).rejects.toThrow('Stage 10+');
  });

  test('stopCopyTrade throws — no fake success', async () => {
    await expect(
      stopCopyTrade('0x1234567890123456789012345678901234567890'),
    ).rejects.toThrow('Stage 10+');
  });

  test('getCopyTradeStatus throws — no hardcoded active/stats', async () => {
    await expect(
      getCopyTradeStatus('0x1234567890123456789012345678901234567890'),
    ).rejects.toThrow('Stage 10+');
  });
});
