import { describe, it, expect } from 'vitest';
import { usdc, limitless, createBasescanIndexer, emptyIndexer } from './index.js';

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

describe('tools/limitless', () => {
  it('quote returns 2x placeholder odds', async () => {
    const q = await limitless.quote({
      stake: '5',
      marketId: `0x${'a'.repeat(64)}`,
      outcome: 1,
    });
    expect(q.stakeBaseUnits).toBe(5_000_000n);
    expect(q.estimatedPayoutBaseUnits).toBe(10_000_000n);
  });

  it('verify accepts factory target with value=0', async () => {
    const tx = await limitless.buildTx({
      stake: '1',
      marketId: `0x${'a'.repeat(64)}`,
      outcome: 0,
    });
    const v = await limitless.verify(tx);
    expect(v.ok).toBe(true);
  });

  it('verify rejects non-zero value', async () => {
    const tx = await limitless.buildTx({
      stake: '1',
      marketId: `0x${'a'.repeat(64)}`,
      outcome: 0,
    });
    const v = await limitless.verify({ ...tx, value: 1n });
    expect(v.ok).toBe(false);
  });
});

describe('tools/basescan', () => {
  it('emptyIndexer returns []', async () => {
    expect(await emptyIndexer.list(recipient, 10)).toEqual([]);
  });

  it('merges token + native txs and sorts by timestamp desc', async () => {
    const fakeFetch: typeof fetch = async (input) => {
      const url = String(input);
      const body = url.includes('action=tokentx')
        ? {
            status: '1',
            message: 'ok',
            result: [
              {
                hash: '0xaaa',
                timeStamp: '1000',
                from: recipient,
                to: '0x0000000000000000000000000000000000000001',
                value: '2000000',
                tokenSymbol: 'USDC',
                tokenDecimal: '6',
              },
            ],
          }
        : {
            status: '1',
            message: 'ok',
            result: [
              {
                hash: '0xbbb',
                timeStamp: '2000',
                from: '0x0000000000000000000000000000000000000002',
                to: recipient,
                value: '1000000000000000',
              },
            ],
          };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const indexer = createBasescanIndexer({ apiUrl: 'https://x' }, fakeFetch);
    const items = await indexer.list(recipient, 10);
    expect(items.length).toBe(2);
    expect(items[0]?.txHash).toBe('0xbbb'); // newer first
    expect(items[0]?.asset).toBe('ETH');
    expect(items[1]?.asset).toBe('USDC');
  });
});
