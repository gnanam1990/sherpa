import { describe, it, expect } from 'vitest';
import { loadConfig } from './index.js';

describe('stage2 feature flags', () => {
  it('defaults SHERPA_STAGE_2_ENABLED to false', () => {
    const cfg = loadConfig({});
    expect(cfg.stage2Enabled).toBe(false);
  });

  it('defaults NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED to false', () => {
    const cfg = loadConfig({});
    expect(cfg.stage2PublicEnabled).toBe(false);
  });

  it('parses SHERPA_STAGE_2_ENABLED=true', () => {
    const cfg = loadConfig({ SHERPA_STAGE_2_ENABLED: 'true' });
    expect(cfg.stage2Enabled).toBe(true);
  });

  it('parses SHERPA_STAGE_2_ENABLED=false', () => {
    const cfg = loadConfig({ SHERPA_STAGE_2_ENABLED: 'false' });
    expect(cfg.stage2Enabled).toBe(false);
  });

  it('parses NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED=true', () => {
    const cfg = loadConfig({ NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED: 'true' });
    expect(cfg.stage2PublicEnabled).toBe(true);
  });

  it('parses NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED=false', () => {
    const cfg = loadConfig({ NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED: 'false' });
    expect(cfg.stage2PublicEnabled).toBe(false);
  });

  it('treats empty SHERPA_STAGE_2_ENABLED as false', () => {
    const cfg = loadConfig({ SHERPA_STAGE_2_ENABLED: '' });
    expect(cfg.stage2Enabled).toBe(false);
  });

  it('treats empty NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED as false', () => {
    const cfg = loadConfig({ NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED: '' });
    expect(cfg.stage2PublicEnabled).toBe(false);
  });

  it('allows independent control of server and public flags', () => {
    const cfg = loadConfig({
      SHERPA_STAGE_2_ENABLED: 'true',
      NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED: 'false',
    });
    expect(cfg.stage2Enabled).toBe(true);
    expect(cfg.stage2PublicEnabled).toBe(false);
  });

  it('stage2 flags do not affect other config fields', () => {
    const cfg = loadConfig({
      SHERPA_STAGE_2_ENABLED: 'true',
      SHERPA_CHAIN: 'base-sepolia',
    });
    expect(cfg.stage2Enabled).toBe(true);
    expect(cfg.chainEnv).toBe('base-sepolia');
    expect(cfg.isMainnet).toBe(false);
  });

  it('stage2Enabled is independent of mainnet config', () => {
    const cfg = loadConfig({
      SHERPA_CHAIN: 'base-mainnet',
      SHERPA_STAGE_2_ENABLED: 'false',
      AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
      AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      TENDERLY_API_KEY: 'test-key',
    });
    expect(cfg.stage2Enabled).toBe(false);
    expect(cfg.isMainnet).toBe(true);
  });
});
