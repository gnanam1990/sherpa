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
