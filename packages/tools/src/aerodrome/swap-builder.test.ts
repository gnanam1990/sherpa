import { describe, it, expect } from 'vitest';
import { buildSwapCall, SWAP_EXACT_TOKENS_SELECTOR } from './swap-builder.js';
import { buildSwapWithFee } from './swap-builder.js';
import { verifySwap } from './verify.js';
import { ALLOWED_CONTRACTS } from '@sherpa/safety';

const FAKE_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;

describe('aerodrome/swap-builder', () => {
  it('builds USDC→ETH swap calldata', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '100', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    expect(result.to).toBe(FAKE_ROUTER);
    expect(result.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)).toBe(true);
    expect(result.value).toBe(0n);
    expect(result.sponsorable).toBe(true);
  });

  it('includes quote metadata in result', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '100', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    expect(result.quote.amountInBaseUnits).toBe(100_000_000n);
    expect(result.quote.fromAsset).toBe('USDC');
    expect(result.quote.toAsset).toBe('ETH');
    expect(result.quote.minOutAmount).toBeGreaterThan(0n);
  });

  it('route has correct token addresses', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '10', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    expect(result.route.from.toLowerCase()).toBe(
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e'.toLowerCase(),
    );
    // ETH maps to WETH address
    expect(result.route.to.toLowerCase()).toBe(
      '0x4200000000000000000000000000000000000006'.toLowerCase(),
    );
    expect(result.route.stable).toBe(false);
  });

  it('throws AerodromeNotConfiguredError when router unset', async () => {
    await expect(
      buildSwapCall('USDC', 'ETH', '100', FAKE_USER, { pyth: false }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('verify accepts a valid swap tx', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    const v = await verifySwap(
      { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable },
      { routerAddress: FAKE_ROUTER },
    );
    expect(v.ok).toBe(true);
  });

  it('verify rejects wrong target', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    const v = await verifySwap(
      { ...result, to: FAKE_USER },
      { routerAddress: FAKE_ROUTER },
    );
    expect(v.ok).toBe(false);
  });

  it('verify rejects non-zero value', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    const v = await verifySwap(
      { ...result, value: 1n },
      { routerAddress: FAKE_ROUTER },
    );
    expect(v.ok).toBe(false);
  });

  it('verify rejects wrong selector', async () => {
    const result = await buildSwapCall('USDC', 'ETH', '1', FAKE_USER, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    const v = await verifySwap(
      { ...result, data: '0xdeadbeef' },
      { routerAddress: FAKE_ROUTER },
    );
    expect(v.ok).toBe(false);
  });
});

describe('buildSwapWithFee', () => {
  const TREASURY = '0x2222222222222222222222222222222222222222' as const;

  it('with fee enabled produces 2-call sequence (swap + fee transfer)', async () => {
    const result = await buildSwapWithFee('USDC', 'ETH', '100', FAKE_USER, 10, TREASURY, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    expect(result.calls.length).toBe(2);
    expect(result.calls[0]!.to).toBe(FAKE_ROUTER);
    expect(result.calls[1]!.to).toBe(ALLOWED_CONTRACTS.WETH);
  });

  it('without fee produces 1-call sequence (swap only)', async () => {
    const result = await buildSwapWithFee('USDC', 'ETH', '100', FAKE_USER, 0, TREASURY, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    expect(result.calls.length).toBe(1);
    expect(result.calls[0]!.to).toBe(FAKE_ROUTER);
  });

  it('fee amount is correctly computed', async () => {
    const result = await buildSwapWithFee('USDC', 'ETH', '100', FAKE_USER, 10, TREASURY, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    const expectedFee = (result.quote.amountOutBaseUnits * 10n) / 10000n;
    expect(result.calls[1]!.value).toBe(0n);
    expect(expectedFee).toBeGreaterThan(0n);
  });

  it('fee transfer encodes treasury as recipient', async () => {
    const { decodeFunctionData } = await import('viem');
    const result = await buildSwapWithFee('USDC', 'ETH', '100', FAKE_USER, 10, TREASURY, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    const feeCall = result.calls[1]!;
    const decoded = decodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      data: feeCall.data,
    });
    expect(decoded.args![0].toLowerCase()).toBe(TREASURY.toLowerCase());
  });

  it('zero fee bps produces no fee call', async () => {
    const result = await buildSwapWithFee('USDC', 'ETH', '100', FAKE_USER, 0, TREASURY, {
      routerAddress: FAKE_ROUTER,
      pyth: false,
    });
    expect(result.calls.length).toBe(1);
  });
});
