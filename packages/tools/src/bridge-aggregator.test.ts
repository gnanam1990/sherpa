import { describe, test, expect } from 'vitest';
import { getBestBridgeQuote, buildBestBridgeCall } from './bridge-aggregator.js';

describe('bridge-aggregator', () => {
  test('selects across for base→polygon', async () => {
    const q = await getBestBridgeQuote({
      asset: 'USDC',
      amount: 1000000000n,
      sourceChain: 'base',
      destinationChain: 'polygon',
      recipient: '0x1111111111111111111111111111111111111111',
      sender: '0x2222222222222222222222222222222222222222',
    });
    expect(q.protocol).toBe('across');
    expect(q.fee).toBeGreaterThan(0n);
  });

  test('selects by speed when preferSpeed=true', async () => {
    const q = await getBestBridgeQuote({
      asset: 'USDC',
      amount: 1000000000n,
      sourceChain: 'polygon',
      destinationChain: 'optimism',
      recipient: '0x1111111111111111111111111111111111111111',
      sender: '0x2222222222222222222222222222222222222222',
      preferSpeed: true,
    });
    expect(q.estimatedTime).toBeGreaterThan(0);
  });

  test('buildBestBridgeCall returns tx data', async () => {
    const { quote, tx } = await buildBestBridgeCall({
      asset: 'USDC',
      amount: 100000000n,
      sourceChain: 'base',
      destinationChain: 'polygon',
      recipient: '0x1111111111111111111111111111111111111111',
      sender: '0x2222222222222222222222222222222222222222',
    });
    expect(quote.protocol).toBeDefined();
    expect(tx.to).toBeDefined();
    expect(tx.data).toBeDefined();
  });
});
