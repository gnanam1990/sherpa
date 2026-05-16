import { describe, it, expect } from 'vitest';
import {
  optimismSupply,
  optimismWithdraw,
  optimismBorrow,
  optimismRepay,
  getOptimismAaveAssets,
  isOptimismAaveAsset,
  OPTIMISM_AAVE_ASSETS,
} from './optimism.js';

const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;

describe('aave/optimism', () => {
  it('returns supported assets', () => {
    expect(OPTIMISM_AAVE_ASSETS).toContain('USDC');
    expect(OPTIMISM_AAVE_ASSETS).toContain('USDT');
    expect(OPTIMISM_AAVE_ASSETS).toContain('WETH');
    expect(OPTIMISM_AAVE_ASSETS).toContain('OP');
  });

  it('getOptimismAaveAssets returns asset list', () => {
    const assets = getOptimismAaveAssets();
    expect(assets.length).toBe(4);
  });

  it('isOptimismAaveAsset returns true for supported', () => {
    expect(isOptimismAaveAsset('USDC')).toBe(true);
    expect(isOptimismAaveAsset('OP')).toBe(true);
    expect(isOptimismAaveAsset('ARB')).toBe(false);
  });

  it('optimismSupply builds supply tx', async () => {
    const tx = await optimismSupply('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(tx.value).toBe(0n);
    expect(tx.sponsorable).toBe(true);
  });

  it('optimismWithdraw builds withdraw tx', async () => {
    const tx = await optimismWithdraw('WETH', '1', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('optimismBorrow builds borrow tx', async () => {
    const tx = await optimismBorrow('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('optimismRepay builds repay tx', async () => {
    const tx = await optimismRepay('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('throws for unsupported asset', async () => {
    await expect(optimismSupply('ARB', '100', FAKE_USER)).rejects.toThrow('not found on Optimism');
  });
});
