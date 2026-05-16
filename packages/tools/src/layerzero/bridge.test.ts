import { describe, test, expect } from 'vitest';
import { getLayerZeroQuote, buildLayerZeroCall, LayerZeroNotSupportedError } from './bridge.js';
import { isLayerZeroSupported, LZ_ENDPOINT_IDS } from './types.js';

describe('layerzero/bridge', () => {
  test('isLayerZeroSupported returns true for polygon', () => {
    expect(isLayerZeroSupported('polygon')).toBe(true);
  });

  test('isLayerZeroSupported returns true for optimism', () => {
    expect(isLayerZeroSupported('optimism')).toBe(true);
  });

  test('isLayerZeroSupported returns true for arbitrum', () => {
    expect(isLayerZeroSupported('arbitrum')).toBe(true);
  });

  test('isLayerZeroSupported returns true for base', () => {
    expect(isLayerZeroSupported('base')).toBe(true);
  });

  test('isLayerZeroSupported returns false for unknown chain', () => {
    expect(isLayerZeroSupported('solana')).toBe(false);
  });

  test('LZ_ENDPOINT_IDS has correct values', () => {
    expect(LZ_ENDPOINT_IDS['polygon']).toBe(30109);
    expect(LZ_ENDPOINT_IDS['optimism']).toBe(30111);
    expect(LZ_ENDPOINT_IDS['arbitrum']).toBe(30110);
    expect(LZ_ENDPOINT_IDS['base']).toBe(30184);
  });

  test('quotes polygon→optimism', async () => {
    const q = await getLayerZeroQuote({
      asset: 'USDC',
      amount: 1000000000n,
      sourceChain: 'polygon',
      destinationChain: 'optimism',
      recipient: '0x1111111111111111111111111111111111111111',
    });
    expect(q.nativeFee).toBeGreaterThan(0n);
    expect(q.estimatedTime).toBe(180);
    expect(q.destinationEndpointId).toBe(30111);
  });

  test('quotes polygon→ethereum has longer time', async () => {
    const q = await getLayerZeroQuote({
      asset: 'USDC',
      amount: 1000000000n,
      sourceChain: 'polygon',
      destinationChain: 'ethereum',
      recipient: '0x1111111111111111111111111111111111111111',
    });
    expect(q.estimatedTime).toBe(900);
  });

  test('throws for unsupported chain', async () => {
    await expect(
      getLayerZeroQuote({
        asset: 'USDC',
        amount: 1000000000n,
        sourceChain: 'solana',
        destinationChain: 'polygon',
        recipient: '0x1111111111111111111111111111111111111111',
      }),
    ).rejects.toBeInstanceOf(LayerZeroNotSupportedError);
  });

  test('buildLayerZeroCall produces valid calldata', async () => {
    const q = await getLayerZeroQuote({
      asset: 'USDC',
      amount: 100000000n,
      sourceChain: 'polygon',
      destinationChain: 'optimism',
      recipient: '0x1111111111111111111111111111111111111111',
    });
    const result = await buildLayerZeroCall(
      {
        asset: 'USDC',
        amount: 100000000n,
        sourceChain: 'polygon',
        destinationChain: 'optimism',
        recipient: '0x1111111111111111111111111111111111111111',
      },
      q,
      '0x2222222222222222222222222222222222222222',
    );
    expect(result.value).toBe(q.nativeFee);
    expect(result.sponsorable).toBe(false);
  });
});
