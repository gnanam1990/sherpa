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

describe('polygon token resolution', () => {
  test('resolves USDC on polygon', () => {
    const token = resolveToken('USDC', 137);
    expect(token?.address).toBe('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
    expect(token?.decimals).toBe(6);
    expect(token?.chainId).toBe(137);
  });

  test('resolves USDT on polygon', () => {
    const token = resolveToken('USDT', 137);
    expect(token?.address).toBe('0xc2132D05D31c914a87C6611C10748AEb04B58e8F');
    expect(token?.decimals).toBe(6);
    expect(token?.chainId).toBe(137);
  });

  test('resolves WMATIC on polygon', () => {
    const token = resolveToken('WMATIC', 137);
    expect(token?.address).toBe('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    expect(token?.decimals).toBe(18);
  });

  test('resolves MATIC as native on polygon', () => {
    const token = resolveToken('MATIC', 137);
    expect(token?.address).toBe('native');
    expect(token?.decimals).toBe(18);
  });

  test('getTokensForChain returns polygon tokens', () => {
    const tokens = getTokensForChain(137);
    expect(tokens.length).toBe(5);
    expect(tokens.some((t) => t.symbol === 'USDC')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'MATIC')).toBe(true);
  });
});

describe('avalanche token resolution', () => {
  test('resolves USDC on avalanche', () => {
    const token = resolveToken('USDC', 43114);
    expect(token?.address).toBe('0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E');
    expect(token?.decimals).toBe(6);
    expect(token?.chainId).toBe(43114);
  });

  test('resolves USDT on avalanche', () => {
    const token = resolveToken('USDT', 43114);
    expect(token?.address).toBe('0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7');
    expect(token?.decimals).toBe(6);
    expect(token?.chainId).toBe(43114);
  });

  test('resolves WETH on avalanche', () => {
    const token = resolveToken('WETH', 43114);
    expect(token?.address).toBe('0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB');
    expect(token?.decimals).toBe(18);
    expect(token?.chainId).toBe(43114);
  });

  test('resolves WAVAX on avalanche', () => {
    const token = resolveToken('WAVAX', 43114);
    expect(token?.address).toBe('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7');
    expect(token?.decimals).toBe(18);
    expect(token?.chainId).toBe(43114);
  });

  test('resolves AVAX as native on avalanche', () => {
    const token = resolveToken('AVAX', 43114);
    expect(token?.address).toBe('native');
    expect(token?.decimals).toBe(18);
    expect(token?.chainId).toBe(43114);
  });

  test('getTokensForChain returns avalanche tokens', () => {
    const tokens = getTokensForChain(43114);
    expect(tokens.length).toBe(5);
    expect(tokens.some((t) => t.symbol === 'USDC')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'AVAX')).toBe(true);
    expect(tokens.some((t) => t.symbol === 'WAVAX')).toBe(true);
  });

  test('returns undefined for avalanche-only token on mainnet', () => {
    expect(resolveToken('WAVAX', 8453)).toBeUndefined();
  });
});
