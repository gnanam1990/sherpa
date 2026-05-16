import { describe, it, expect } from 'vitest';
import { buildSwapCall, SWAP_EXACT_TOKENS_SELECTOR } from './swap-builder.js';
import { verifySwap } from './verify.js';

const FAKE_ROUTER = '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;

describe('velodrome/swap-builder', () => {
  it('builds USDC→WETH swap calldata', async () => {
    const result = await buildSwapCall('USDC', 'WETH', '100', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    expect(result.to).toBe(FAKE_ROUTER);
    expect(result.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)).toBe(true);
    expect(result.value).toBe(0n);
    expect(result.sponsorable).toBe(true);
  });

  it('includes route with stable flag', async () => {
    const result = await buildSwapCall('USDC', 'WETH', '10', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
    });
    expect(result.route.from.toLowerCase()).toBe(
      '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'.toLowerCase(),
    );
    expect(result.route.stable).toBe(false);
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
