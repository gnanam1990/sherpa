import { describe, test, expect } from 'vitest';
import { resolveToken, getTokensForChain } from './registry.js';

describe('chain-specific token resolution', () => {
  test('resolves USDC on sepolia', () => {
    const token = resolveToken('USDC', 84532);
    expect(token?.address).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(token?.chainId).toBe(84532);
  });

  test('resolves USDC on mainnet', () => {
    const token = resolveToken('USDC', 8453);
    expect(token?.address).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(token?.chainId).toBe(8453);
  });

  test('resolves ETH on mainnet (aliased to WETH)', () => {
    const token = resolveToken('ETH', 8453);
    expect(token?.address).toBe('0x4200000000000000000000000000000000000006');
    expect(token?.symbol).toBe('WETH');
  });

  test('resolves WETH on mainnet', () => {
    const token = resolveToken('WETH', 8453);
    expect(token?.address).toBe('0x4200000000000000000000000000000000000006');
  });

  test('resolves USDT on mainnet', () => {
    const token = resolveToken('USDT', 8453);
    expect(token?.address).toBe('0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2');
    expect(token?.decimals).toBe(6);
  });

  test('resolves cbBTC on mainnet', () => {
    const token = resolveToken('cbBTC', 8453);
    expect(token?.address).toBe('0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf');
    expect(token?.decimals).toBe(8);
  });

  test('returns undefined for unknown token', () => {
    expect(resolveToken('UNKNOWN', 8453)).toBeUndefined();
  });

  test('returns undefined for mainnet-only token on sepolia', () => {
    expect(resolveToken('USDT', 84532)).toBeUndefined();
  });

  test('defaults to sepolia when chainId omitted', () => {
    const token = resolveToken('USDC');
    expect(token?.address).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  });

  test('case-insensitive lookup', () => {
    expect(resolveToken('usdc', 8453)?.address).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(resolveToken('Usdc', 8453)?.address).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  });
});

describe('getTokensForChain', () => {
  test('returns mainnet tokens', () => {
    const tokens = getTokensForChain(8453);
    expect(tokens.length).toBe(5);
    expect(tokens.some((t) => t.symbol === 'USDC')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'USDT')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'cbBTC')).toBe(true);
  });

  test('returns sepolia tokens', () => {
    const tokens = getTokensForChain(84532);
    expect(tokens.length).toBe(3);
    expect(tokens.some((t) => t.symbol === 'USDC')).toBe(true);
  });

  test('returns arbitrum tokens', () => {
    const tokens = getTokensForChain(42161);
    expect(tokens.length).toBe(6);
    expect(tokens.some((t) => t.symbol === 'USDC')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'ARB')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'USDT')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'WBTC')).toBe(true);
  });

  test('returns optimism tokens', () => {
    const tokens = getTokensForChain(10);
    expect(tokens.length).toBe(5);
    expect(tokens.some((t) => t.symbol === 'USDC')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'OP')).toBe(true);
  });
});

describe('arbitrum token resolution', () => {
  test('resolves USDC on arbitrum', () => {
    const token = resolveToken('USDC', 42161);
    expect(token?.address).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
    expect(token?.decimals).toBe(6);
    expect(token?.chainId).toBe(42161);
  });

  test('resolves WETH on arbitrum', () => {
    const token = resolveToken('WETH', 42161);
    expect(token?.address).toBe('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');
  });

  test('resolves ARB on arbitrum', () => {
    const token = resolveToken('ARB', 42161);
    expect(token?.address).toBe('0x912CE59144191C1204E64559FE8253a0e49E6548');
    expect(token?.decimals).toBe(18);
  });

  test('resolves ETH alias to WETH on arbitrum', () => {
    const token = resolveToken('ETH', 42161);
    expect(token?.address).toBe('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');
    expect(token?.symbol).toBe('WETH');
  });
});

describe('optimism token resolution', () => {
  test('resolves USDC on optimism', () => {
    const token = resolveToken('USDC', 10);
    expect(token?.address).toBe('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85');
    expect(token?.decimals).toBe(6);
    expect(token?.chainId).toBe(10);
  });

  test('resolves WETH on optimism', () => {
    const token = resolveToken('WETH', 10);
    expect(token?.address).toBe('0x4200000000000000000000000000000000000006');
  });

  test('resolves OP on optimism', () => {
    const token = resolveToken('OP', 10);
    expect(token?.address).toBe('0x4200000000000000000000000000000000000042');
    expect(token?.decimals).toBe(18);
  });

  test('returns undefined for ARB on optimism', () => {
    expect(resolveToken('ARB', 10)).toBeUndefined();
  });
});

describe('multi-chain token resolution', () => {
  test('resolves USDC on Arbitrum (chainId 42161)', () => {
    const token = resolveToken('USDC', 42161);
    expect(token?.address).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
    expect(token?.chainId).toBe(42161);
  });

  test('resolves USDC on Optimism (chainId 10)', () => {
    const token = resolveToken('USDC', 10);
    expect(token?.address).toBe('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85');
    expect(token?.chainId).toBe(10);
  });

  test('resolves ARB on Arbitrum', () => {
    const token = resolveToken('ARB', 42161);
    expect(token?.symbol).toBe('ARB');
  });

  test('resolves OP on Optimism', () => {
    const token = resolveToken('OP', 10);
    expect(token?.symbol).toBe('OP');
  });

  test('getTokensForChain returns Arbitrum tokens', () => {
    const tokens = getTokensForChain(42161);
    expect(tokens.length).toBeGreaterThanOrEqual(4);
  });

  test('getTokensForChain returns Optimism tokens', () => {
    const tokens = getTokensForChain(10);
    expect(tokens.length).toBeGreaterThanOrEqual(3);
  });
});
