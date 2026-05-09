import { describe, it, expect } from 'vitest';
import {
  usdc,
  limitless,
  uniswap,
  onramp,
  createBasescanIndexer,
  createLimitless,
  emptyIndexer,
  buildApproveCall,
  LimitlessNotConfiguredError,
} from './index.js';
import { ALLOWED_CONTRACTS } from '@sherpa/safety';

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

  it('buildTx throws LimitlessNotConfiguredError when factory address is not set', async () => {
    await expect(
      limitless.buildTx({ stake: '1', marketId: `0x${'a'.repeat(64)}`, outcome: 0 }),
    ).rejects.toBeInstanceOf(LimitlessNotConfiguredError);
  });

  it('verify rejects when factory address is not set', async () => {
    // Synthesise a BuiltTx without going through buildTx (which would throw).
    const fakeTx = {
      to: '0x0000000000000000000000000000000000000001' as const,
      data: '0xdeadbeef' as const,
      value: 0n,
      sponsorable: true,
    };
    const v = await limitless.verify(fakeTx);
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toContain('not yet configured');
  });
});

describe('tools/uniswap', () => {
  const me = '0x1111111111111111111111111111111111111111' as const;

  it('quote returns stub ETH out for given USDC in', async () => {
    const q = await uniswap.quote({ usd: '300', asset: 'ETH', recipient: me });
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    // 300 USDC at 1 ETH = 3000 USDC ⇒ 0.1 ETH = 1e17 wei
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
  });

  it('buildTx targets the router with exactInputSingle calldata', async () => {
    const tx = await uniswap.buildTx({ usd: '50', asset: 'ETH', recipient: me });
    expect(tx.to.toLowerCase()).toBe(ALLOWED_CONTRACTS.UNISWAP_ROUTER.toLowerCase());
    expect(tx.data.startsWith('0x04e45aaf')).toBe(true);
    expect(tx.value).toBe(0n);
  });

  it('verify rejects wrong selector', async () => {
    const tx = await uniswap.buildTx({ usd: '1', asset: 'ETH', recipient: me });
    const v = await uniswap.verify({ ...tx, data: '0xdeadbeef' });
    expect(v.ok).toBe(false);
  });
});

describe('tools/onramp', () => {
  const dest = '0x2222222222222222222222222222222222222222' as const;

  it('quote computes 1% fee', async () => {
    const q = await onramp.quote({ usd: '100', destination: dest, asset: 'USDC' });
    expect(q.feeUsd).toBe('1.00');
    expect(q.netDisplay).toBe('99.00 USDC');
  });

  it('buildSession returns a sandbox URL with the destination encoded', async () => {
    const s = await onramp.buildSession({ usd: '50', destination: dest, asset: 'USDC' });
    expect(s.url).toContain('pay.coinbase.com');
    expect(s.url).toContain(encodeURIComponent(dest));
    expect(s.live).toBe(false);
  });

  it('rejects non-positive usd', async () => {
    await expect(
      onramp.quote({ usd: '0', destination: dest, asset: 'USDC' }),
    ).rejects.toThrow();
  });
});

describe('tools/limitless REST quote', () => {
  it('uses fetched price when api configured', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ yesPrice: '0.25', noPrice: '0.75' }), { status: 200 });
    const lim = createLimitless({ apiUrl: 'https://api.limitless.test', fetchImpl: fakeFetch });
    const q = await lim.quote({ stake: '5', marketId: `0x${'b'.repeat(64)}`, outcome: 1 });
    // 5 USDC at 0.25/share = 20 shares ⇒ ~4.0x odds
    expect(q.odds).toBe('4.00x');
  });
});

describe('tools/buildApproveCall', () => {
  it('targets USDC and encodes approve(spender, amount)', () => {
    const c = buildApproveCall(ALLOWED_CONTRACTS.UNISWAP_ROUTER, 1_000_000n);
    expect(c.to.toLowerCase()).toBe(ALLOWED_CONTRACTS.USDC.toLowerCase());
    expect(c.data.startsWith('0x095ea7b3')).toBe(true); // approve selector
    expect(c.value).toBe(0n);
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
