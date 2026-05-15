import { describe, test, expect } from 'vitest';
import { findBestRoute, estimateCrossChainTime } from './router.js';

describe('Cross-chain router', () => {
  test('findBestRoute returns route', async () => {
    const route = await findBestRoute('base', 'arbitrum', 1000000000n, { chains: ['base', 'arbitrum'] });
    expect(route.sourceChain).toBe('base');
    expect(route.destinationChain).toBe('arbitrum');
  });

  test('estimateCrossChainTime returns 120s for L2-to-L2', () => {
    expect(estimateCrossChainTime('base', 'arbitrum')).toBe(120);
  });

  test('estimateCrossChainTime returns 600s for L1 involved', () => {
    expect(estimateCrossChainTime('base', 'ethereum')).toBe(600);
  });
});
