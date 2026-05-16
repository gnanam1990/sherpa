import { describe, test, expect } from 'vitest';
import {
  detectChain,
  detectAllChains,
  parseBridgeIntent,
  hasChainMention,
  extractChainFromIntent,
} from './cross-chain.js';

describe('parser/cross-chain', () => {
  test('detectChain finds polygon in "send 5 usdc on polygon"', () => {
    const result = detectChain('send 5 usdc on polygon');
    expect(result).toBeDefined();
    expect(result!.chainId).toBe(137);
    expect(result!.chainName).toBe('polygon');
  });

  test('detectChain finds optimism in "swap on optimism"', () => {
    const result = detectChain('swap on optimism');
    expect(result).toBeDefined();
    expect(result!.chainId).toBe(10);
  });

  test('detectChain finds arbitrum in "bridge to arbitrum"', () => {
    const result = detectChain('bridge to arbitrum');
    expect(result).toBeDefined();
    expect(result!.chainId).toBe(42161);
  });

  test('detectChain finds base', () => {
    const result = detectChain('lend on base');
    expect(result).toBeDefined();
    expect(result!.chainId).toBe(8453);
  });

  test('detectChain returns undefined for no chain mention', () => {
    expect(detectChain('send 5 usdc')).toBeUndefined();
  });

  test('detectAllChains finds multiple chains', () => {
    const chains = detectAllChains('bridge from base to polygon');
    expect(chains.length).toBeGreaterThanOrEqual(2);
    const ids = chains.map((c) => c.chainId);
    expect(ids).toContain(8453);
    expect(ids).toContain(137);
  });

  test('hasChainMention returns true when chain present', () => {
    expect(hasChainMention('send on polygon')).toBe(true);
    expect(hasChainMention('lend usdc on arbitrum')).toBe(true);
    expect(hasChainMention('send 5 usdc')).toBe(false);
  });

  test('extractChainFromIntent returns chain info', () => {
    const result = extractChainFromIntent('swap on optimism');
    expect(result.chainId).toBe(10);
    expect(result.chainName).toBe('optimism');
  });

  test('parseBridgeIntent parses "bridge 10 usdc to polygon"', () => {
    const intent = parseBridgeIntent('bridge 10 usdc to polygon');
    expect(intent).toBeDefined();
    expect(intent!.type).toBe('bridge');
    expect(intent!.asset).toBe('USDC');
    expect(intent!.amount).toBe('10');
    expect(intent!.destinationChain?.chainId).toBe(137);
  });

  test('parseBridgeIntent parses "transfer 100 usdc to optimism"', () => {
    const intent = parseBridgeIntent('transfer 100 usdc to optimism');
    expect(intent).toBeDefined();
    expect(intent!.type).toBe('bridge');
    expect(intent!.asset).toBe('USDC');
    expect(intent!.amount).toBe('100');
    expect(intent!.destinationChain?.chainId).toBe(10);
  });

  test('parseBridgeIntent parses "move 50 usdt to arbitrum"', () => {
    const intent = parseBridgeIntent('move 50 usdt to arbitrum');
    expect(intent).toBeDefined();
    expect(intent!.asset).toBe('USDT');
    expect(intent!.destinationChain?.chainId).toBe(42161);
  });

  test('parseBridgeIntent returns undefined for non-bridge text', () => {
    expect(parseBridgeIntent('send 5 usdc')).toBeUndefined();
  });
});
