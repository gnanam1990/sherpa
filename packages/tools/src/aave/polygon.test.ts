import { describe, it, expect } from 'vitest';
import {
  polygonSupply,
  polygonWithdraw,
  polygonBorrow,
  polygonRepay,
  getPolygonAaveAssets,
  isPolygonAaveAsset,
  getPolygonAaveDeps,
  POLYGON_AAVE_ASSETS,
} from './polygon.js';

const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;

describe('aave/polygon', () => {
  it('returns supported assets', () => {
    expect(POLYGON_AAVE_ASSETS).toContain('USDC');
    expect(POLYGON_AAVE_ASSETS).toContain('USDT');
    expect(POLYGON_AAVE_ASSETS).toContain('WETH');
    expect(POLYGON_AAVE_ASSETS).toContain('WMATIC');
  });

  it('getPolygonAaveAssets returns asset list', () => {
    const assets = getPolygonAaveAssets();
    expect(assets.length).toBe(4);
  });

  it('isPolygonAaveAsset returns true for supported', () => {
    expect(isPolygonAaveAsset('USDC')).toBe(true);
    expect(isPolygonAaveAsset('usdc')).toBe(true);
    expect(isPolygonAaveAsset('DAI')).toBe(false);
  });

  it('getPolygonAaveDeps returns pool address', () => {
    const deps = getPolygonAaveDeps();
    expect(deps.poolAddress).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(deps.dataProviderAddress).toBe('0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C');
  });

  it('polygonSupply builds supply tx', async () => {
    const tx = await polygonSupply('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(tx.value).toBe(0n);
    expect(tx.sponsorable).toBe(true);
  });

  it('polygonWithdraw builds withdraw tx', async () => {
    const tx = await polygonWithdraw('USDC', '50', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(tx.value).toBe(0n);
  });

  it('polygonBorrow builds borrow tx', async () => {
    const tx = await polygonBorrow('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
    expect(tx.sponsorable).toBe(true);
  });

  it('polygonRepay builds repay tx', async () => {
    const tx = await polygonRepay('USDC', '100', FAKE_USER);
    expect(tx.to).toBe('0x794a61358D6845594F94dc1DB02A252b5b4814aD');
  });

  it('throws for unsupported asset', async () => {
    await expect(polygonSupply('DAI', '100', FAKE_USER)).rejects.toThrow('not found on Polygon');
  });
});
