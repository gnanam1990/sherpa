import { describe, it, expect } from 'vitest';
import {
  arbitrumSupply,
  arbitrumWithdraw,
  arbitrumBorrow,
  arbitrumRepay,
  getArbitrumAaveAssets,
  isArbitrumAaveAsset,
  ARBITRUM_AAVE_ASSETS,
} from './arbitrum.js';

const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;

describe('aave/arbitrum', () => {
  it('returns supported assets', () => {
    expect(ARBITRUM_AAVE_ASSETS).toContain('USDC');
    expect(ARBITRUM_AAVE_ASSETS).toContain('USDT');
    expect(ARBITRUM_AAVE_ASSETS).toContain('WETH');
    expect(ARBITRUM_AAVE_ASSETS).toContain('WBTC');
    expect(ARBITRUM_AAVE_ASSETS).toContain('ARB');
  });

  it('getArbitrumAaveAssets returns asset list', () => {
    const assets = getArbitrumAaveAssets();
    expect(assets.length).toBe(5);
  });

  it('isArbitrumAaveAsset returns true for supported', () => {
    expect(isArbitrumAaveAsset('ARB')).toBe(true);
    expect(isArbitrumAaveAsset('WBTC')).toBe(true);
    expect(isArbitrumAaveAsset('DAI')).toBe(false);
  });

  it('arbitrumSupply builds supply tx', async () => {
    const tx = await arbitrumSupply('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(tx.value).toBe(0n);
    expect(tx.sponsorable).toBe(true);
  });

  it('arbitrumWithdraw builds withdraw tx', async () => {
    const tx = await arbitrumWithdraw('WETH', '1', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('arbitrumBorrow builds borrow tx', async () => {
    const tx = await arbitrumBorrow('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('arbitrumRepay builds repay tx', async () => {
    const tx = await arbitrumRepay('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('throws for unsupported asset', async () => {
    await expect(arbitrumSupply('DAI', '100', FAKE_USER)).rejects.toThrow('not found on Arbitrum');
  });
});
