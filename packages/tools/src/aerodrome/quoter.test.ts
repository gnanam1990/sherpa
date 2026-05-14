import { describe, it, expect } from 'vitest';
import { quote, TokenNotFoundError } from './quoter.js';

describe('aerodrome/quoter', () => {
  it('quotes USDC→ETH with 3000-stub (pyth disabled)', async () => {
    const q = await quote('USDC', 'ETH', '300', { pyth: false });
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    // 300 USDC at 3000 USD/ETH ⇒ 0.1 ETH = 1e17 wei
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
    expect(q.fromAsset).toBe('USDC');
    expect(q.toAsset).toBe('ETH');
    expect(q.route).toContain('USDC->ETH');
  });

  it('quotes ETH→USDC symmetrically', async () => {
    const q = await quote('ETH', 'USDC', '0.1', { pyth: false });
    expect(q.amountInBaseUnits).toBe(100_000_000_000_000_000n);
    // 0.1 ETH at 3000 USD/ETH ⇒ 300 USDC = 300_000_000 (6dp)
    expect(q.amountOutBaseUnits).toBe(300_000_000n);
  });

  it('includes fromToken and toToken from registry', async () => {
    const q = await quote('USDC', 'ETH', '10', { pyth: false });
    expect(q.fromToken.symbol).toBe('USDC');
    expect(q.fromToken.decimals).toBe(6);
    expect(q.toToken.symbol).toBe('WETH');
    expect(q.toToken.decimals).toBe(18);
  });

  it('computes minOutAmount with slippage', async () => {
    const q = await quote('USDC', 'ETH', '100', { pyth: false });
    // 100 USDC at 3000 ⇒ 0.0333... ETH. Min out = out * 9950/10000 (0.5% slippage)
    expect(q.minOutAmount).toBeLessThan(q.amountOutBaseUnits);
    expect(q.minOutAmount).toBeGreaterThan(0n);
    expect(q.slippageBps).toBe(50);
  });

  it('throws on same fromAsset/toAsset', async () => {
    await expect(quote('USDC', 'USDC', '1', { pyth: false })).rejects.toThrow(
      'fromAsset and toAsset must differ',
    );
  });

  it('throws TokenNotFoundError for unknown symbol', async () => {
    await expect(quote('USDC', 'DAI', '1', { pyth: false })).rejects.toBeInstanceOf(
      TokenNotFoundError,
    );
  });

  it('uses Pyth price when configured', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          parsed: [{ id: 'eth', price: { price: '400000000000', conf: '0', expo: -8 } }],
        }),
        { status: 200 },
      );
    const q = await quote('USDC', 'ETH', '100', { pyth: { fetchImpl: fakeFetch } });
    // 100 USDC at 4000 USD/ETH ⇒ 0.025 ETH = 2.5e16 wei
    expect(q.amountOutBaseUnits).toBe(25_000_000_000_000_000n);
  });
});
