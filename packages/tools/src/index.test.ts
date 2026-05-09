import { describe, it, expect } from 'vitest';
import {
  usdc,
  limitless,
  onramp,
  createBasescanIndexer,
  createLimitless,
  emptyIndexer,
  buildApproveCall,
  LimitlessNotConfiguredError,
  fetchPythPriceUsd,
  makeUniswap,
  aerodrome,
  createAerodrome,
  AerodromeNotConfiguredError,
  morpho,
  createMorpho,
  MorphoNotConfiguredError,
  aave,
  createAave,
  AaveNotConfiguredError,
} from './index.js';
import { ALLOWED_CONTRACTS } from '@sherpa/safety';

const FAKE_AERODROME_ROUTER = '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae' as const;
const FAKE_MORPHO = '0xb1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1' as const;
const FAKE_AAVE_POOL = '0xa53a53a53a53a53a53a53a53a53a53a53a53a53a' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;
const FAKE_ORACLE = '0x2222222222222222222222222222222222222222' as const;
const FAKE_IRM = '0x3333333333333333333333333333333333333333' as const;

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
  // The default `uniswap` export has Pyth enabled, which would hit the
  // network. These tests exercise the stub tier with Pyth disabled.
  const stub = makeUniswap({ pyth: false });

  it('quote returns stub ETH out for given USDC in', async () => {
    const q = await stub.quote({ usd: '300', asset: 'ETH', recipient: me });
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    // 300 USDC at 1 ETH = 3000 USDC ⇒ 0.1 ETH = 1e17 wei
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
  });

  it('buildTx targets the router with exactInputSingle calldata', async () => {
    const tx = await stub.buildTx({ usd: '50', asset: 'ETH', recipient: me });
    expect(tx.to.toLowerCase()).toBe(ALLOWED_CONTRACTS.UNISWAP_ROUTER.toLowerCase());
    expect(tx.data.startsWith('0x04e45aaf')).toBe(true);
    expect(tx.value).toBe(0n);
  });

  it('verify rejects wrong selector', async () => {
    const tx = await stub.buildTx({ usd: '1', asset: 'ETH', recipient: me });
    const v = await stub.verify({ ...tx, data: '0xdeadbeef' });
    expect(v.ok).toBe(false);
  });
});

describe('tools/pyth', () => {
  it('parses v2 /updates/price/latest envelope and returns USD price', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          parsed: [
            {
              id: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
              price: { price: '350000000000', conf: '1', expo: -8, publish_time: 1 },
            },
          ],
        }),
        { status: 200 },
      );
    const price = await fetchPythPriceUsd('ETH/USD', { fetchImpl: fakeFetch });
    expect(price).toBe(3500); // 350000000000 * 1e-8 = 3500
  });

  it('also accepts the legacy /api/latest_price_feeds bare-array shape', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify([
          {
            id: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
            price: { price: '410000000000', conf: '1', expo: -8 },
          },
        ]),
        { status: 200 },
      );
    const price = await fetchPythPriceUsd('ETH/USD', { fetchImpl: fakeFetch });
    expect(price).toBe(4100);
  });

  it('returns null on non-2xx (caller falls back to next tier)', async () => {
    const fakeFetch: typeof fetch = async () => new Response('rate limited', { status: 429 });
    expect(await fetchPythPriceUsd('ETH/USD', { fetchImpl: fakeFetch })).toBeNull();
  });

  it('returns null when fetch throws (timeout / network error)', async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error('network down');
    };
    expect(await fetchPythPriceUsd('ETH/USD', { fetchImpl: fakeFetch })).toBeNull();
  });
});

describe('tools/uniswap with Pyth tier', () => {
  const me = '0x1111111111111111111111111111111111111111' as const;

  function pythFetch(priceUsd: number): typeof fetch {
    return async () =>
      new Response(
        JSON.stringify({
          parsed: [
            {
              id: 'eth-usd',
              price: {
                price: String(Math.round(priceUsd * 1e8)),
                conf: '0',
                expo: -8,
              },
            },
          ],
        }),
        { status: 200 },
      );
  }

  it('uses Pyth price when no RPC client is configured', async () => {
    // 100 USDC at $4000/ETH ⇒ 0.025 ETH = 2.5e16 wei.
    const u = makeUniswap({ pyth: { fetchImpl: pythFetch(4000) } });
    const q = await u.quote({ usd: '100', asset: 'ETH', recipient: me });
    expect(q.amountOutBaseUnits).toBe(25_000_000_000_000_000n);
  });

  it('falls back to the 3000-stub when Pyth is unreachable', async () => {
    const flaky: typeof fetch = async () => new Response('boom', { status: 500 });
    const u = makeUniswap({ pyth: { fetchImpl: flaky } });
    // 300 USDC at the 3000 stub ⇒ 0.1 ETH = 1e17 wei.
    const q = await u.quote({ usd: '300', asset: 'ETH', recipient: me });
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
  });

  it('buildTx slippage floor uses the Pyth-derived expected out', async () => {
    const u = makeUniswap({ pyth: { fetchImpl: pythFetch(4000) } });
    const tx = await u.buildTx({ usd: '100', asset: 'ETH', recipient: me });
    expect(tx.to.toLowerCase()).toBe(ALLOWED_CONTRACTS.UNISWAP_ROUTER.toLowerCase());
    expect(tx.data.startsWith('0x04e45aaf')).toBe(true);
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

describe('tools/limitless findMarket', () => {
  const sampleRow = (id: string, title: string, volume: number) => ({
    id,
    title,
    volume,
  });

  it('returns [] when no apiUrl configured', async () => {
    const lim = createLimitless();
    expect(await lim.findMarket({ predicate: 'eth tops 5k' })).toEqual([]);
  });

  it('hits /markets with search/limit/sortBy and parses bare-array response', async () => {
    let capturedUrl = '';
    const fakeFetch: typeof fetch = async (input) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify([
          sampleRow(`0x${'a'.repeat(64)}`, 'ETH > 5k by EOY', 12000),
          sampleRow(`0x${'b'.repeat(64)}`, 'ETH > 5k Dec 31', 4000),
        ]),
        { status: 200 },
      );
    };
    const lim = createLimitless({ apiUrl: 'https://api.limitless.test', fetchImpl: fakeFetch });
    const out = await lim.findMarket({
      predicate: 'eth tops 5k',
      asset: 'ETH',
      threshold: 5000,
    });
    expect(capturedUrl).toContain('/markets?');
    expect(capturedUrl).toContain('search=eth+tops+5k');
    expect(capturedUrl).toContain('limit=10');
    expect(capturedUrl).toContain('sortBy=volume');
    expect(capturedUrl).toContain('asset=ETH');
    expect(capturedUrl).toContain('threshold=5000');
    expect(out.length).toBe(2);
    expect(out[0]?.volume).toBe(12000);
  });

  it('also accepts a {markets:[...]} envelope and skips malformed ids', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          markets: [
            sampleRow(`0x${'c'.repeat(64)}`, 'ok', 1),
            sampleRow('0xnotbytes32', 'malformed id', 99),
            { marketId: `0x${'d'.repeat(64)}`, question: 'alt-key shape', volumeUsd: '42' },
          ],
        }),
        { status: 200 },
      );
    const lim = createLimitless({ apiUrl: 'https://api.limitless.test', fetchImpl: fakeFetch });
    const out = await lim.findMarket({ predicate: 'p' });
    expect(out.length).toBe(2);
    expect(out[1]?.title).toBe('alt-key shape');
    expect(out[1]?.volume).toBe(42);
  });

  it('caches results for 5 minutes by query', async () => {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify([sampleRow(`0x${'e'.repeat(64)}`, 't', 1)]), {
        status: 200,
      });
    };
    let nowMs = 1_000_000;
    const lim = createLimitless({
      apiUrl: 'https://api.limitless.test',
      fetchImpl: fakeFetch,
      now: () => nowMs,
    });
    await lim.findMarket({ predicate: 'q1' });
    await lim.findMarket({ predicate: 'q1' });
    expect(calls).toBe(1); // cache hit
    await lim.findMarket({ predicate: 'q2' });
    expect(calls).toBe(2); // different key, miss
    nowMs += 5 * 60 * 1000 + 1; // past TTL
    await lim.findMarket({ predicate: 'q1' });
    expect(calls).toBe(3); // expired, refetched
  });

  it('throws on non-2xx', async () => {
    const fakeFetch: typeof fetch = async () => new Response('boom', { status: 500 });
    const lim = createLimitless({ apiUrl: 'https://api.limitless.test', fetchImpl: fakeFetch });
    await expect(lim.findMarket({ predicate: 'q' })).rejects.toThrow(/findMarket api 500/);
  });
});

describe('tools/limitless factoryAddress override', () => {
  it('exposes the configured factoryAddress on the adapter', () => {
    const fake = '0xabababababababababababababababababababab' as const;
    const lim = createLimitless({ factoryAddress: fake });
    expect(lim.factoryAddress).toBe(fake);
  });

  it('default adapter has factoryAddress=undefined (production gate)', () => {
    expect(limitless.factoryAddress).toBeUndefined();
  });

  it('configured adapter builds tx without throwing', async () => {
    const fake = '0xabababababababababababababababababababab' as const;
    const lim = createLimitless({ factoryAddress: fake });
    const tx = await lim.buildTx({
      stake: '1',
      marketId: `0x${'a'.repeat(64)}`,
      outcome: 0,
    });
    expect(tx.to).toBe(fake);
    const v = await lim.verify(tx);
    expect(v.ok).toBe(true);
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

describe('tools/aerodrome', () => {
  it('default adapter has routerAddress=undefined (production gate)', () => {
    expect(aerodrome.routerAddress).toBeUndefined();
  });

  it('buildTx throws AerodromeNotConfiguredError when router unset', async () => {
    await expect(
      aerodrome.buildTx({
        amountIn: '100',
        fromAsset: 'USDC',
        toAsset: 'ETH',
        recipient: FAKE_USER,
      }),
    ).rejects.toBeInstanceOf(AerodromeNotConfiguredError);
  });

  it('configured adapter exposes routerAddress and builds tx', async () => {
    const a = createAerodrome({ routerAddress: FAKE_AERODROME_ROUTER, pyth: false });
    expect(a.routerAddress).toBe(FAKE_AERODROME_ROUTER);
    const tx = await a.buildTx({
      amountIn: '100',
      fromAsset: 'USDC',
      toAsset: 'ETH',
      recipient: FAKE_USER,
    });
    expect(tx.to).toBe(FAKE_AERODROME_ROUTER);
    expect(tx.value).toBe(0n);
    expect(tx.sponsorable).toBe(true);
    const v = await a.verify(tx);
    expect(v.ok).toBe(true);
  });

  it('quote uses 3000-stub when Pyth disabled (USDC→ETH)', async () => {
    const a = createAerodrome({ routerAddress: FAKE_AERODROME_ROUTER, pyth: false });
    const q = await a.quote({
      amountIn: '300',
      fromAsset: 'USDC',
      toAsset: 'ETH',
      recipient: FAKE_USER,
    });
    expect(q.amountInBaseUnits).toBe(300_000_000n);
    // 300 USDC at 3000 USD/ETH ⇒ 0.1 ETH = 1e17 wei
    expect(q.amountOutBaseUnits).toBe(100_000_000_000_000_000n);
    expect(q.route).toContain('USDC->ETH');
  });

  it('quote handles ETH→USDC direction symmetrically', async () => {
    const a = createAerodrome({ routerAddress: FAKE_AERODROME_ROUTER, pyth: false });
    const q = await a.quote({
      amountIn: '0.1',
      fromAsset: 'ETH',
      toAsset: 'USDC',
      recipient: FAKE_USER,
    });
    expect(q.amountInBaseUnits).toBe(100_000_000_000_000_000n);
    // 0.1 ETH at 3000 USD/ETH ⇒ 300 USDC = 300_000_000 (6dp)
    expect(q.amountOutBaseUnits).toBe(300_000_000n);
  });

  it('quote uses Pyth price when configured', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          parsed: [{ id: 'eth', price: { price: '400000000000', conf: '0', expo: -8 } }],
        }),
        { status: 200 },
      );
    const a = createAerodrome({
      routerAddress: FAKE_AERODROME_ROUTER,
      pyth: { fetchImpl: fakeFetch },
    });
    const q = await a.quote({
      amountIn: '100',
      fromAsset: 'USDC',
      toAsset: 'ETH',
      recipient: FAKE_USER,
    });
    // 100 USDC at 4000 USD/ETH ⇒ 0.025 ETH = 2.5e16 wei
    expect(q.amountOutBaseUnits).toBe(25_000_000_000_000_000n);
  });

  it('quote rejects same fromAsset/toAsset', async () => {
    const a = createAerodrome({ routerAddress: FAKE_AERODROME_ROUTER, pyth: false });
    await expect(
      a.quote({ amountIn: '1', fromAsset: 'USDC', toAsset: 'USDC', recipient: FAKE_USER }),
    ).rejects.toThrow();
  });

  it('verify rejects wrong target / non-zero value / wrong selector', async () => {
    const a = createAerodrome({ routerAddress: FAKE_AERODROME_ROUTER, pyth: false });
    const tx = await a.buildTx({
      amountIn: '1',
      fromAsset: 'USDC',
      toAsset: 'ETH',
      recipient: FAKE_USER,
    });
    expect((await a.verify({ ...tx, to: FAKE_USER })).ok).toBe(false);
    expect((await a.verify({ ...tx, value: 1n })).ok).toBe(false);
    expect((await a.verify({ ...tx, data: '0xdeadbeef' })).ok).toBe(false);
  });

  it('configured adapter passes Ring 1 via the extras vouch', async () => {
    // Sanity check: assertAllowlisted is called inside buildTx with the
    // configured router as `extras`, so an unallowlisted address still
    // succeeds without polluting ALLOWED_CONTRACTS globally.
    const a = createAerodrome({ routerAddress: FAKE_AERODROME_ROUTER, pyth: false });
    await expect(
      a.buildTx({
        amountIn: '1',
        fromAsset: 'USDC',
        toAsset: 'ETH',
        recipient: FAKE_USER,
      }),
    ).resolves.toBeDefined();
  });
});

describe('tools/morpho', () => {
  const market = {
    loanToken: ALLOWED_CONTRACTS.USDC,
    collateralToken: ALLOWED_CONTRACTS.WETH,
    oracle: FAKE_ORACLE,
    irm: FAKE_IRM,
    lltv: 860000000000000000n, // 86%
  };

  it('default adapter has morphoAddress=undefined', () => {
    expect(morpho.morphoAddress).toBeUndefined();
  });

  it('buildTx throws MorphoNotConfiguredError when address unset', async () => {
    await expect(
      morpho.buildTx({
        action: 'deposit',
        asset: 'USDC',
        amount: '100',
        recipient: FAKE_USER,
        marketParams: market,
      }),
    ).rejects.toBeInstanceOf(MorphoNotConfiguredError);
  });

  it('configured adapter builds a deposit tx with supply selector', async () => {
    const m = createMorpho({ morphoAddress: FAKE_MORPHO });
    const tx = await m.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '100',
      recipient: FAKE_USER,
      marketParams: market,
    });
    expect(tx.to).toBe(FAKE_MORPHO);
    expect(tx.value).toBe(0n);
    const v = await m.verify(tx);
    expect(v.ok).toBe(true);
  });

  it('configured adapter builds a withdraw tx with withdraw selector', async () => {
    const m = createMorpho({ morphoAddress: FAKE_MORPHO });
    const tx = await m.buildTx({
      action: 'withdraw',
      asset: 'USDC',
      amount: '50',
      recipient: FAKE_USER,
      marketParams: market,
    });
    expect((await m.verify(tx)).ok).toBe(true);
    // Deposit and withdraw selectors are different
    const dep = await m.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '50',
      recipient: FAKE_USER,
      marketParams: market,
    });
    expect(tx.data.slice(0, 10)).not.toBe(dep.data.slice(0, 10));
  });

  it('quote refuses non-USDC asset and mismatched loanToken', async () => {
    const m = createMorpho({ morphoAddress: FAKE_MORPHO });
    await expect(
      m.quote({
        action: 'deposit',
        // @ts-expect-error testing unsupported asset path
        asset: 'DAI',
        amount: '1',
        recipient: FAKE_USER,
        marketParams: market,
      }),
    ).rejects.toThrow(/unsupported asset/);
    await expect(
      m.quote({
        action: 'deposit',
        asset: 'USDC',
        amount: '1',
        recipient: FAKE_USER,
        marketParams: { ...market, loanToken: ALLOWED_CONTRACTS.WETH },
      }),
    ).rejects.toThrow(/loanToken must equal USDC/);
  });

  it('quote display includes APY and amount', async () => {
    const m = createMorpho({ morphoAddress: FAKE_MORPHO, stubSupplyApyBps: 525 });
    const q = await m.quote({
      action: 'deposit',
      asset: 'USDC',
      amount: '100',
      recipient: FAKE_USER,
      marketParams: market,
    });
    expect(q.supplyApyBps).toBe(525);
    expect(q.display).toContain('5.25%');
    expect(q.display).toContain('100');
  });

  it('verify rejects wrong target / non-zero value / unrelated selector', async () => {
    const m = createMorpho({ morphoAddress: FAKE_MORPHO });
    const tx = await m.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '1',
      recipient: FAKE_USER,
      marketParams: market,
    });
    expect((await m.verify({ ...tx, to: FAKE_USER })).ok).toBe(false);
    expect((await m.verify({ ...tx, value: 1n })).ok).toBe(false);
    expect((await m.verify({ ...tx, data: '0xdeadbeef' })).ok).toBe(false);
  });
});

describe('tools/aave', () => {
  it('default adapter has poolAddress=undefined', () => {
    expect(aave.poolAddress).toBeUndefined();
  });

  it('buildTx throws AaveNotConfiguredError when pool unset', async () => {
    await expect(
      aave.buildTx({ action: 'deposit', asset: 'USDC', amount: '100', recipient: FAKE_USER }),
    ).rejects.toBeInstanceOf(AaveNotConfiguredError);
  });

  it('configured adapter builds deposit then withdraw with distinct selectors', async () => {
    const a = createAave({ poolAddress: FAKE_AAVE_POOL });
    const dep = await a.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '100',
      recipient: FAKE_USER,
    });
    const wit = await a.buildTx({
      action: 'withdraw',
      asset: 'USDC',
      amount: '40',
      recipient: FAKE_USER,
    });
    expect(dep.to).toBe(FAKE_AAVE_POOL);
    expect(wit.to).toBe(FAKE_AAVE_POOL);
    expect(dep.data.slice(0, 10)).not.toBe(wit.data.slice(0, 10));
    expect((await a.verify(dep)).ok).toBe(true);
    expect((await a.verify(wit)).ok).toBe(true);
  });

  it('referralCode flows through to calldata when provided', async () => {
    const a = createAave({ poolAddress: FAKE_AAVE_POOL });
    const noRef = await a.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '1',
      recipient: FAKE_USER,
    });
    const withRef = await a.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '1',
      recipient: FAKE_USER,
      referralCode: 42,
    });
    expect(noRef.data).not.toBe(withRef.data);
  });

  it('quote display tags the protocol so a planner can compare', async () => {
    const a = createAave({ poolAddress: FAKE_AAVE_POOL, stubSupplyApyBps: 380 });
    const q = await a.quote({
      action: 'deposit',
      asset: 'USDC',
      amount: '100',
      recipient: FAKE_USER,
    });
    expect(q.supplyApyBps).toBe(380);
    expect(q.display).toContain('Aave');
    expect(q.display).toContain('3.80%');
  });

  it('verify rejects wrong target / non-zero value / unrelated selector', async () => {
    const a = createAave({ poolAddress: FAKE_AAVE_POOL });
    const tx = await a.buildTx({
      action: 'deposit',
      asset: 'USDC',
      amount: '1',
      recipient: FAKE_USER,
    });
    expect((await a.verify({ ...tx, to: FAKE_USER })).ok).toBe(false);
    expect((await a.verify({ ...tx, value: 1n })).ok).toBe(false);
    expect((await a.verify({ ...tx, data: '0xdeadbeef' })).ok).toBe(false);
  });
});
