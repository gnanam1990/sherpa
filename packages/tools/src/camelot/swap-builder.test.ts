import { describe, it, expect } from 'vitest';
import { buildSwapCall, SWAP_EXACT_TOKENS_SELECTOR } from './swap-builder.js';
import { verifySwap } from './verify.js';

const FAKE_ROUTER = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;

describe('camelot/swap-builder', () => {
  it('builds USDC→WETH swap calldata', async () => {
    const result = await buildSwapCall('USDC', 'WETH', '100', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    expect(result.to).toBe(FAKE_ROUTER);
    expect(result.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)).toBe(true);
    expect(result.value).toBe(0n);
    expect(result.sponsorable).toBe(true);
  });

  it('path has correct token addresses', async () => {
    const result = await buildSwapCall('USDC', 'ARB', '10', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    expect(result.path.length).toBe(2);
    expect(result.path[0].toLowerCase()).toBe(
      '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase(),
    );
  });

  it('verify accepts a valid swap tx', async () => {
    const result = await buildSwapCall('USDC', 'WETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    const v = await verifySwap(
      { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable },
      { routerAddress: FAKE_ROUTER },
    );
    expect(v.ok).toBe(true);
  });

  it('verify rejects wrong target', async () => {
    const result = await buildSwapCall('USDC', 'WETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    const v = await verifySwap({ ...result, to: FAKE_USER }, { routerAddress: FAKE_ROUTER });
    expect(v.ok).toBe(false);
  });

  it('verify rejects non-zero value', async () => {
    const result = await buildSwapCall('USDC', 'WETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    const v = await verifySwap({ ...result, value: 1n }, { routerAddress: FAKE_ROUTER });
    expect(v.ok).toBe(false);
  });
});
