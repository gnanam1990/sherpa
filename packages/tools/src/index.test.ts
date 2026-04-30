import { describe, it, expect } from 'vitest';
import { usdc } from './index.js';

const recipient = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

describe('tools/usdc', () => {
  it('quote returns base units with 6-decimal precision', async () => {
    const q = await usdc.quote({ amount: '5', to: recipient });
    expect(q.amountBaseUnits).toBe(5_000_000n);
    expect(q.usdDisplay).toBe('$5.00');
  });

  it('buildTx returns ERC-20 transfer calldata targeting USDC', async () => {
    const tx = await usdc.buildTx({ amount: '1', to: recipient });
    expect(tx.data.startsWith('0xa9059cbb')).toBe(true);
    expect(tx.value).toBe(0n);
    expect(tx.sponsorable).toBe(true);
  });

  it('verify accepts a well-formed tx', async () => {
    const tx = await usdc.buildTx({ amount: '1', to: recipient });
    const v = await usdc.verify(tx);
    expect(v.ok).toBe(true);
  });

  it('verify rejects wrong target', async () => {
    const tx = await usdc.buildTx({ amount: '1', to: recipient });
    const v = await usdc.verify({ ...tx, to: '0x1111111111111111111111111111111111111111' });
    expect(v.ok).toBe(false);
  });
});
