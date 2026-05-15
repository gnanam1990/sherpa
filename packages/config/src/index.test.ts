import { describe, it, expect } from 'vitest';
import { loadConfig } from './index.js';

describe('loadConfig', () => {
  it('treats empty DATABASE_URL/SUPABASE_SERVICE_KEY as absent (regression: PR #10 review bug 2)', () => {
    // Mirrors the .env.example default — operator unsets feature flags but
    // leaves the empty `DATABASE_URL=` line in place. Pre-fix: this threw
    // because `.optional()` only allows undefined, not ''.
    const cfg = loadConfig({
      SHERPA_USE_REAL_DB: 'false',
      DATABASE_URL: '',
      SUPABASE_SERVICE_KEY: '',
    });
    expect(cfg.useRealDb).toBe(false);
    expect(cfg.databaseUrl).toBeUndefined();
    expect(cfg.supabaseServiceKey).toBeUndefined();
  });

  it('still requires DATABASE_URL when SHERPA_USE_REAL_DB=true', () => {
    expect(() => loadConfig({ SHERPA_USE_REAL_DB: 'true', DATABASE_URL: '' })).toThrow(
      /DATABASE_URL is required/,
    );
  });

  it('passes through a real DATABASE_URL', () => {
    const cfg = loadConfig({
      SHERPA_USE_REAL_DB: 'true',
      DATABASE_URL: 'postgres://u:p@db.example.com:6543/postgres',
      SUPABASE_SERVICE_KEY: 'svc-key',
    });
    expect(cfg.useRealDb).toBe(true);
    expect(cfg.databaseUrl).toContain('db.example.com');
    expect(cfg.supabaseServiceKey).toBe('svc-key');
  });

  it('rejects malformed DATABASE_URL', () => {
    expect(() => loadConfig({ SHERPA_USE_REAL_DB: 'true', DATABASE_URL: 'not-a-url' })).toThrow();
  });

  it('defaults empty SMOKE_API_URL to localhost API', () => {
    const cfg = loadConfig({ SMOKE_API_URL: '' });
    expect(cfg.smokeApiUrl).toBe('http://localhost:3001');
  });

  it('passes through a valid SMOKE_API_URL override', () => {
    const cfg = loadConfig({ SMOKE_API_URL: 'https://preview.example.com' });
    expect(cfg.smokeApiUrl).toBe('https://preview.example.com');
  });

  it('loadConfig parses Aave env vars', () => {
    const cfg = loadConfig({
      AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
    });
    expect(cfg.aavePoolAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('loadConfig treats empty AAVE_POOL_ADDRESS as undefined', () => {
    const cfg = loadConfig({ AAVE_POOL_ADDRESS: '' });
    expect(cfg.aavePoolAddress).toBeUndefined();
  });

  it('loadConfig treats missing AAVE_POOL_ADDRESS as undefined', () => {
    const cfg = loadConfig({});
    expect(cfg.aavePoolAddress).toBeUndefined();
  });
});

describe('mainnet config', () => {
  const MAINNET_REQUIRED = {
    AERODROME_ROUTER_ADDRESS: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    AAVE_POOL_ADDRESS: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
    TENDERLY_API_KEY: 'test-key',
  };

  it('SHERPA_CHAIN=base-mainnet sets isMainnet=true', () => {
    const cfg = loadConfig({ SHERPA_CHAIN: 'base-mainnet', ...MAINNET_REQUIRED });
    expect(cfg.isMainnet).toBe(true);
  });

  it('SHERPA_CHAIN=base-mainnet derives chainId 8453', () => {
    const cfg = loadConfig({ SHERPA_CHAIN: 'base-mainnet', ...MAINNET_REQUIRED });
    expect(cfg.chainId).toBe(8453);
  });

  it('SHERPA_CHAIN=base-sepolia derives chainId 84532', () => {
    const cfg = loadConfig({ SHERPA_CHAIN: 'base-sepolia' });
    expect(cfg.chainId).toBe(84532);
  });

  it('simulationFailOpen defaults to false on mainnet', () => {
    const cfg = loadConfig({ SHERPA_CHAIN: 'base-mainnet', ...MAINNET_REQUIRED });
    expect(cfg.simulationFailOpen).toBe(false);
  });

  it('simulationFailOpen defaults to true on sepolia', () => {
    const cfg = loadConfig({ SHERPA_CHAIN: 'base-sepolia' });
    expect(cfg.simulationFailOpen).toBe(true);
  });
});

describe('fee config', () => {
  it('defaults: fee disabled, 10 bps, no treasury', () => {
    const cfg = loadConfig({});
    expect(cfg.feeEnabled).toBe(false);
    expect(cfg.feeBps).toBe(10);
    expect(cfg.feeTreasuryAddress).toBeUndefined();
  });

  it('parses SHERPA_FEE_ENABLED=true', () => {
    const cfg = loadConfig({ SHERPA_FEE_ENABLED: 'true' });
    expect(cfg.feeEnabled).toBe(true);
  });

  it('parses SHERPA_FEE_BPS=25', () => {
    const cfg = loadConfig({ SHERPA_FEE_BPS: '25' });
    expect(cfg.feeBps).toBe(25);
  });

  it('parses SHERPA_FEE_TREASURY_ADDRESS', () => {
    const treasury = '0x1234567890abcdef1234567890abcdef12345678';
    const cfg = loadConfig({ SHERPA_FEE_TREASURY_ADDRESS: treasury });
    expect(cfg.feeTreasuryAddress).toBe(treasury);
  });
});

describe('mainnet config', () => {
  it('defaults to base-sepolia', () => {
    const cfg = loadConfig({});
    expect(cfg.chainEnv).toBe('base-sepolia');
    expect(cfg.isMainnet).toBe(false);
  });

  it('parses SHERPA_CHAIN=base-mainnet', () => {
    const cfg = loadConfig({
      SHERPA_CHAIN: 'base-mainnet',
      AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
      AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      TENDERLY_API_KEY: 'test-key',
    });
    expect(cfg.chainEnv).toBe('base-mainnet');
    expect(cfg.isMainnet).toBe(true);
  });

  it('derives chainId 84532 for sepolia', () => {
    const cfg = loadConfig({});
    expect(cfg.chainId).toBe(84532);
  });

  it('derives chainId 8453 for mainnet', () => {
    const cfg = loadConfig({
      SHERPA_CHAIN: 'base-mainnet',
      AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
      AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      TENDERLY_API_KEY: 'test-key',
    });
    expect(cfg.chainId).toBe(8453);
  });

  it('rejects mismatched paymaster URL (mainnet config + sepolia URL)', () => {
    expect(() =>
      loadConfig({
        SHERPA_CHAIN: 'base-mainnet',
        SHERPA_PAYMASTER_URL: 'https://paymaster.sepolia.example.com',
        AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
        AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        TENDERLY_API_KEY: 'test-key',
      }),
    ).toThrow(/must contain "mainnet"/);
  });

  it('rejects mismatched paymaster URL (sepolia config + mainnet URL)', () => {
    expect(() =>
      loadConfig({
        SHERPA_PAYMASTER_URL: 'https://paymaster.mainnet.example.com',
      }),
    ).toThrow(/must contain "sepolia"/);
  });

  it('defaults simulationFailOpen to true on sepolia', () => {
    const cfg = loadConfig({});
    expect(cfg.simulationFailOpen).toBe(true);
  });

  it('defaults simulationFailOpen to false on mainnet', () => {
    const cfg = loadConfig({
      SHERPA_CHAIN: 'base-mainnet',
      AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
      AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      TENDERLY_API_KEY: 'test-key',
    });
    expect(cfg.simulationFailOpen).toBe(false);
  });

  it('allows explicit SHERPA_SIMULATION_FAIL_OPEN override', () => {
    const cfg = loadConfig({ SHERPA_SIMULATION_FAIL_OPEN: 'true' });
    expect(cfg.simulationFailOpen).toBe(true);
  });

  it('requires AERODROME_ROUTER_ADDRESS on mainnet', () => {
    expect(() =>
      loadConfig({
        SHERPA_CHAIN: 'base-mainnet',
        AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        TENDERLY_API_KEY: 'test-key',
      }),
    ).toThrow(/AERODROME_ROUTER_ADDRESS required for mainnet/);
  });

  it('requires AAVE_POOL_ADDRESS on mainnet', () => {
    expect(() =>
      loadConfig({
        SHERPA_CHAIN: 'base-mainnet',
        AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
        SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        TENDERLY_API_KEY: 'test-key',
      }),
    ).toThrow(/AAVE_POOL_ADDRESS required for mainnet/);
  });

  it('requires SHERPA_FEE_TREASURY_ADDRESS on mainnet', () => {
    expect(() =>
      loadConfig({
        SHERPA_CHAIN: 'base-mainnet',
        AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
        AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        TENDERLY_API_KEY: 'test-key',
      }),
    ).toThrow(/SHERPA_FEE_TREASURY_ADDRESS required for mainnet/);
  });

  it('requires TENDERLY_API_KEY on mainnet', () => {
    expect(() =>
      loadConfig({
        SHERPA_CHAIN: 'base-mainnet',
        AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
        AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
        SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      }),
    ).toThrow(/TENDERLY_API_KEY required for mainnet/);
  });

  it('allows mainnet with all required addresses', () => {
    const cfg = loadConfig({
      SHERPA_CHAIN: 'base-mainnet',
      AERODROME_ROUTER_ADDRESS: '0xaeae00aeae00aeae00aeae00aeae00aeae00aeae',
      AAVE_POOL_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      SHERPA_FEE_TREASURY_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
      TENDERLY_API_KEY: 'test-key',
    });
    expect(cfg.isMainnet).toBe(true);
    expect(cfg.aerodromeRouterAddress).toBe('0xaeae00aeae00aeae00aeae00aeae00aeae00aeae');
  });
});
