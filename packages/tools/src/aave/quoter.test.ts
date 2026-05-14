import { describe, it, expect } from 'vitest';
import { quote, AssetNotSupportedError } from './quoter.js';

describe('aave/quoter', () => {
  it('quotes USDC deposit with correct amount and APY', async () => {
    const q = await quote({ action: 'deposit', asset: 'USDC', amount: '100', recipient: '0x1111' });
    expect(q.action).toBe('deposit');
    expect(q.asset).toBe('USDC');
    expect(q.amountBaseUnits).toBe(100_000_000n);
    expect(q.supplyApyBps).toBe(380);
  });

  it('quotes USDC withdraw with correct amount', async () => {
    const q = await quote({ action: 'withdraw', asset: 'USDC', amount: '50', recipient: '0x1111' });
    expect(q.action).toBe('withdraw');
    expect(q.amountBaseUnits).toBe(50_000_000n);
  });

  it('uses custom APY override', async () => {
    const q = await quote(
      { action: 'deposit', asset: 'USDC', amount: '100', recipient: '0x1111' },
      { stubSupplyApyBps: 525 },
    );
    expect(q.supplyApyBps).toBe(525);
  });

  it('rejects unsupported asset', async () => {
    await expect(
      // @ts-expect-error testing unsupported asset
      quote({ action: 'deposit', asset: 'DAI', amount: '100', recipient: '0x1111' }),
    ).rejects.toBeInstanceOf(AssetNotSupportedError);
  });

  it('uses stub pricing (STUB_SUPPLY_APY_BPS=380) by default', async () => {
    const q = await quote({ action: 'deposit', asset: 'USDC', amount: '1', recipient: '0x1111' });
    expect(q.supplyApyBps).toBe(380);
  });

  it('display string has correct format', async () => {
    const q = await quote({ action: 'deposit', asset: 'USDC', amount: '100', recipient: '0x1111' });
    expect(q.display).toBe('Deposit 100 USDC @ 3.80% APY (Aave)');
  });

  it('display string for withdraw', async () => {
    const q = await quote({ action: 'withdraw', asset: 'USDC', amount: '50', recipient: '0x1111' });
    expect(q.display).toBe('Withdraw 50 USDC @ 3.80% APY (Aave)');
  });
});
