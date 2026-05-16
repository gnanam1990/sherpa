import { describe, it, expect } from 'vitest';
import { quote, TokenNotFoundError } from './quoter.js';

describe('camelot/quoter', () => {
  it('quotes USDC→WETH with stub pricing', async () => {
    const q = await quote('USDC', 'WETH', '300');
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('WETH');
    expect(q.route).toContain('camelot');
  });

  it('quotes WETH→USDC symmetrically', async () => {
    const q = await quote('WETH', 'USDC', '0.1');
    expect(q.amountOutBaseUnits).toBe(300_000_000n);
  });

  it('quotes USDC→ARB', async () => {
    const q = await quote('USDC', 'ARB', '120');
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('ARB');
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000_000n);
  });

  it('quotes USDC→WBTC', async () => {
    const q = await quote('USDC', 'WBTC', '60000');
    expect(q.toAsset).toBe('WBTC');
    expect(q.toToken.decimals).toBe(8);
    expect(q.amountOutBaseUnits).toBe(100_000_000n);
  });

  it('includes fromToken and toToken from Arbitrum registry', async () => {
    const q = await quote('USDC', 'ARB', '10');
    expect(q.fromToken.symbol).toBe('USDC');
    expect(q.fromToken.chainId).toBe(42161);
    expect(q.toToken.symbol).toBe('ARB');
    expect(q.toToken.chainId).toBe(42161);
  });

  it('throws on same fromAsset/toAsset', async () => {
    await expect(quote('USDC', 'USDC', '1')).rejects.toThrow('fromAsset and toAsset must differ');
  });

  it('throws TokenNotFoundError for unknown symbol', async () => {
    await expect(quote('USDC', 'DAI' as any, '1')).rejects.toBeInstanceOf(TokenNotFoundError);
  });

  it('quotes ARB→USDT', async () => {
    const q = await quote('ARB', 'USDT', '10');
    expect(q.amountOutBaseUnits).toBe(12_000_000n);
  });

  it('quotes WETH→WBTC', async () => {
    const q = await quote('WETH', 'WBTC', '1');
    expect(q.amountOutBaseUnits).toBe(5_000_000n);
  });
});
