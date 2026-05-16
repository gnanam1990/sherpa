import { describe, it, expect } from 'vitest';
import { quote, TokenNotFoundError } from './quoter.js';

describe('velodrome/quoter', () => {
  it('quotes USDC→WETH with stub pricing', async () => {
    const q = await quote('USDC', 'WETH', '300');
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('WETH');
    expect(q.route).toContain('velodrome');
  });

  it('quotes WETH→USDC symmetrically', async () => {
    const q = await quote('WETH', 'USDC', '0.1');
    expect(q.amountOutBaseUnits).toBe(300_000_000n);
  });

  it('quotes USDC→OP', async () => {
    const q = await quote('USDC', 'OP', '100');
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('OP');
    expect(q.amountOutBaseUnits).toBe(40_000_000_000_000_000_000n);
  });

  it('includes fromToken and toToken from Optimism registry', async () => {
    const q = await quote('USDC', 'OP', '10');
    expect(q.fromToken.symbol).toBe('USDC');
    expect(q.fromToken.chainId).toBe(10);
    expect(q.toToken.symbol).toBe('OP');
    expect(q.toToken.chainId).toBe(10);
  });

  it('throws on same fromAsset/toAsset', async () => {
    await expect(quote('USDC', 'USDC', '1')).rejects.toThrow('fromAsset and toAsset must differ');
  });

  it('throws TokenNotFoundError for unknown symbol', async () => {
    await expect(quote('USDC', 'DAI' as any, '1')).rejects.toBeInstanceOf(TokenNotFoundError);
  });

  it('quotes WETH→OP', async () => {
    const q = await quote('WETH', 'OP', '1');
    expect(q.amountOutBaseUnits).toBe(1200_000_000_000_000_000_000n);
  });

  it('quotes OP→USDT', async () => {
    const q = await quote('OP', 'USDT', '10');
    expect(q.amountOutBaseUnits).toBe(25_000_000n);
  });

  it('computes minOutAmount with slippage', async () => {
    const q = await quote('USDC', 'WETH', '100');
    expect(q.minOutAmount).toBeLessThan(q.amountOutBaseUnits);
    expect(q.slippageBps).toBe(50);
  });
});
