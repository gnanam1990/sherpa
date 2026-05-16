import { describe, test, expect } from 'vitest';
import { getBridgeQuote } from './quoter.js';
import { buildBridgeCall } from './bridge-builder.js';
import { isBridgePairSupported, SUPPORTED_CHAINS, CHAIN_IDS } from './types.js';

describe('across/bridge (extended)', () => {
  test('polygon is in supported chains', () => {
    expect(SUPPORTED_CHAINS['polygon']).toBe(137);
    expect(CHAIN_IDS['polygon']).toBe(137);
  });

  test('base→polygon pair is supported', () => {
    expect(isBridgePairSupported('base', 'polygon')).toBe(true);
  });

  test('polygon→base pair is supported', () => {
    expect(isBridgePairSupported('polygon', 'base')).toBe(true);
  });

  test('polygon→optimism pair is supported', () => {
    expect(isBridgePairSupported('polygon', 'optimism')).toBe(true);
  });

  test('polygon→arbitrum pair is supported', () => {
    expect(isBridgePairSupported('polygon', 'arbitrum')).toBe(true);
  });

  test('unsupported pair returns false', () => {
    expect(isBridgePairSupported('polygon', 'solana')).toBe(false);
  });

  test('quotes base→polygon bridge', async () => {
    const q = await getBridgeQuote({
      asset: 'USDC',
      amount: 1000000000n,
      sourceChain: 'base',
      destinationChain: 'polygon',
    });
    expect(q.relayerFee).toBeGreaterThan(0n);
    expect(q.minOutAmount).toBeLessThan(1000000000n);
    expect(q.spokePool).toBeDefined();
  });

  test('quotes polygon→optimism bridge', async () => {
    const q = await getBridgeQuote({
      asset: 'USDC',
      amount: 500000000n,
      sourceChain: 'polygon',
      destinationChain: 'optimism',
    });
    expect(q.relayerFee).toBeGreaterThan(0n);
    expect(q.estimatedTime).toBe(120);
  });

  test('quotes polygon→ethereum bridge', async () => {
    const q = await getBridgeQuote({
      asset: 'USDC',
      amount: 1000000000n,
      sourceChain: 'polygon',
      destinationChain: 'ethereum',
    });
    expect(q.estimatedTime).toBe(600);
  });

  test('buildBridgeCall produces valid calldata for polygon→base', async () => {
    const q = await getBridgeQuote({
      asset: 'USDC',
      amount: 100000000n,
      sourceChain: 'polygon',
      destinationChain: 'base',
    });
    const result = await buildBridgeCall(
      { asset: 'USDC', amount: 100000000n, sourceChain: 'polygon', destinationChain: 'base' },
      q,
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    );
    expect(result.to).toBe(q.spokePool);
    expect(result.data.startsWith('0x06180d0a')).toBe(true);
    expect(result.value).toBe(q.relayerFee);
  });
});
