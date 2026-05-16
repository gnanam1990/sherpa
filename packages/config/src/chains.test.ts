import { describe, test, expect } from 'vitest';
import {
  CHAIN_CONFIGS,
  getChainConfig,
  getDexRouter,
  getAavePool,
  getAaveDataProvider,
  getSupportedChainIds,
  isChainSupported,
  getChainName,
  chainNameToId,
} from './chains.js';

describe('chains config', () => {
  test('CHAIN_CONFIGS has 4 chains', () => {
    expect(Object.keys(CHAIN_CONFIGS).length).toBe(4);
  });

  test('base config has correct chainId', () => {
    expect(CHAIN_CONFIGS[8453].chainId).toBe(8453);
    expect(CHAIN_CONFIGS[8453].shortName).toBe('base');
  });

  test('polygon config has correct chainId', () => {
    expect(CHAIN_CONFIGS[137].chainId).toBe(137);
    expect(CHAIN_CONFIGS[137].shortName).toBe('polygon');
  });

  test('optimism config has correct chainId', () => {
    expect(CHAIN_CONFIGS[10].chainId).toBe(10);
    expect(CHAIN_CONFIGS[10].shortName).toBe('optimism');
  });

  test('arbitrum config has correct chainId', () => {
    expect(CHAIN_CONFIGS[42161].chainId).toBe(42161);
    expect(CHAIN_CONFIGS[42161].shortName).toBe('arbitrum');
  });

  test('getChainConfig returns correct config', () => {
    const config = getChainConfig(137);
    expect(config.name).toBe('Polygon');
    expect(config.dex.name).toBe('QuickSwap');
  });

  test('getDexRouter returns router address', () => {
    expect(getDexRouter(8453)).toBe('0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43');
    expect(getDexRouter(137)).toBe('0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff');
    expect(getDexRouter(10)).toBe('0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858');
    expect(getDexRouter(42161)).toBe('0xc873fEcbd354f5A56E00E710B90EF4201db2448d');
  });

  test('getAavePool returns pool address for all chains', () => {
    expect(getAavePool(8453)).toBe('0xA238Dd80C259a72e81d7e4664a9801593F98d1c5');
    expect(getAavePool(137)).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(getAavePool(10)).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(getAavePool(42161)).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  test('getAaveDataProvider returns provider for all chains', () => {
    expect(getAaveDataProvider(8453)).toBeDefined();
    expect(getAaveDataProvider(137)).toBeDefined();
    expect(getAaveDataProvider(10)).toBeDefined();
    expect(getAaveDataProvider(42161)).toBeDefined();
  });

  test('getSupportedChainIds returns all 4', () => {
    const ids = getSupportedChainIds();
    expect(ids).toContain(8453);
    expect(ids).toContain(137);
    expect(ids).toContain(10);
    expect(ids).toContain(42161);
  });

  test('isChainSupported returns true for supported', () => {
    expect(isChainSupported(8453)).toBe(true);
    expect(isChainSupported(137)).toBe(true);
    expect(isChainSupported(10)).toBe(true);
    expect(isChainSupported(42161)).toBe(true);
    expect(isChainSupported(999)).toBe(false);
  });

  test('getChainName returns short name', () => {
    expect(getChainName(8453)).toBe('base');
    expect(getChainName(137)).toBe('polygon');
    expect(getChainName(10)).toBe('optimism');
    expect(getChainName(42161)).toBe('arbitrum');
  });

  test('chainNameToId resolves names', () => {
    expect(chainNameToId('base')).toBe(8453);
    expect(chainNameToId('polygon')).toBe(137);
    expect(chainNameToId('optimism')).toBe(10);
    expect(chainNameToId('arbitrum')).toBe(42161);
    expect(chainNameToId('arb')).toBe(42161);
    expect(chainNameToId('op')).toBe(10);
    expect(chainNameToId('matic')).toBe(137);
    expect(chainNameToId('unknown')).toBeUndefined();
  });

  test('all chains have bridge config', () => {
    for (const config of Object.values(CHAIN_CONFIGS)) {
      expect(config.bridge.across).toBeDefined();
    }
  });

  test('polygon and L2 chains have layerzero config', () => {
    expect(CHAIN_CONFIGS[137].bridge.layerZero).toBeDefined();
    expect(CHAIN_CONFIGS[10].bridge.layerZero).toBeDefined();
    expect(CHAIN_CONFIGS[42161].bridge.layerZero).toBeDefined();
  });

  test('wrapped native addresses are valid', () => {
    for (const config of Object.values(CHAIN_CONFIGS)) {
      expect(config.wrappedNative).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  test('usdc addresses are valid', () => {
    for (const config of Object.values(CHAIN_CONFIGS)) {
      expect(config.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });
});
