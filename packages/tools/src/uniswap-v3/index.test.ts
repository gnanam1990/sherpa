import type { PublicClient } from 'viem';
import { describe, expect, test, vi } from 'vitest';
import { createUniswapV3 } from './index.js';

const tokenIn = '0x1111111111111111111111111111111111111111';
const tokenOut = '0x2222222222222222222222222222222222222222';
const recipient = '0x3333333333333333333333333333333333333333';
const routerAddress = '0x4444444444444444444444444444444444444444';
const quoterAddress = '0x5555555555555555555555555555555555555555';

describe('Uniswap V3 adapter', () => {
  test('quote requires a public client', async () => {
    const adapter = createUniswapV3({ routerAddress, quoterAddress });

    await expect(adapter.quote({
      tokenIn,
      tokenOut,
      recipient,
      amountIn: 100n,
      fee: 500,
    })).rejects.toThrow('[uniswap-v3] public client not configured');
  });

  test('quote uses simulateContract result when client is provided', async () => {
    const simulateContract = vi.fn().mockResolvedValue({ result: [95n, 0n, 0, 0n] });
    const adapter = createUniswapV3({
      routerAddress,
      quoterAddress,
      client: { simulateContract } as unknown as PublicClient,
    });

    const quote = await adapter.quote({
      tokenIn,
      tokenOut,
      recipient,
      amountIn: 100n,
      fee: 500,
    });

    expect(quote.amountOut).toBe(95n);
    expect(simulateContract).toHaveBeenCalledOnce();
  });
});
