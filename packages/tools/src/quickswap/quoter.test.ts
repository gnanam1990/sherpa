import { describe, it, expect } from 'vitest';
import { quote, TokenNotFoundError } from './quoter.js';

describe('quickswap/quoter', () => {
  it('quotes USDC→WETH with stub pricing', async () => {
    const q = await quote('USDC', 'WETH', '300');
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('WETH');
    expect(q.route).toContain('USDC->WETH');
  });

  it('quotes WETH→USDC symmetrically', async () => {
    const q = await quote('WETH', 'USDC', '0.1');
    expect(q.amountInBaseUnits).toBe(100_000_000_000_000_000n);
    expect(q.amountOutBaseUnits).toBe(300_000_000n);
  });

  it('quotes USDC→WMATIC', async () => {
    const q = await quote('USDC', 'WMATIC', '100');
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('WMATIC');
    expect(q.amountOutBaseUnits).toBe(200_000_000_000_000_000_000n);
  });

  it('includes fromToken and toToken from Polygon registry', async () => {
    const q = await quote('USDC', 'WETH', '10');
    expect(q.fromToken.symbol).toBe('USDC');
    expect(q.fromToken.chainId).toBe(137);
    expect(q.toToken.symbol).toBe('WETH');
    expect(q.toToken.chainId).toBe(137);
  });

  it('computes minOutAmount with slippage', async () => {
    const q = await quote('USDC', 'WETH', '100');
    expect(q.minOutAmount).toBeLessThan(q.amountOutBaseUnits);
    expect(q.minOutAmount).toBeGreaterThan(0n);
    expect(q.slippageBps).toBe(50);
  });

  it('throws on same fromAsset/toAsset', async () => {
    await expect(quote('USDC', 'USDC', '1')).rejects.toThrow('fromAsset and toAsset must differ');
  });

  it('throws TokenNotFoundError for unknown symbol', async () => {
    await expect(quote('USDC', 'DAI' as any, '1')).rejects.toBeInstanceOf(TokenNotFoundError);
  });

  it('quotes USDC→USDT at 1:1', async () => {
    const q = await quote('USDC', 'USDT', '500');
    expect(q.amountOutBaseUnits).toBe(500_000_000n);
  });

  it('quotes WMATIC→WETH', async () => {
    const q = await quote('WMATIC', 'WETH', '100');
    expect(q.amountOutBaseUnits).toBe(BigInt(Math.floor(100e18 / 6000)));
  });

  it('uses route string with quickswap label', async () => {
    const q = await quote('USDC', 'WETH', '10');
    expect(q.route).toContain('quickswap');
  });
});
