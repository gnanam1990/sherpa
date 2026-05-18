import { describe, test, expect, vi } from 'vitest';
import { detectJurisdiction, isCountryBlocked, DEFAULT_JURISDICTION_CONFIG } from './jurisdiction.js';

describe('detectJurisdiction', () => {
  test('returns not configured when IPINFO_TOKEN is missing', async () => {
    const result = await detectJurisdiction('8.8.8.8');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('IPINFO_TOKEN not configured');
    }
  });

  test('returns jurisdiction info on success', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ip: '8.8.8.8',
        country: 'US',
        region: 'California',
        city: 'Mountain View',
        org: 'AS15169 Google LLC',
        timezone: 'America/Los_Angeles',
      }),
    }));

    const result = await detectJurisdiction('8.8.8.8', {
      ipinfoToken: 'test-token',
      fetch: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.info.country).toBe('US');
      expect(result.info.region).toBe('California');
      expect(result.info.city).toBe('Mountain View');
    }
  });

  test('returns error on API failure', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: false,
      status: 429,
    }));

    const result = await detectJurisdiction('8.8.8.8', {
      ipinfoToken: 'test-token',
      fetch: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('429');
    }
  });

  test('returns error on network failure', async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error('Network error');
    });

    const result = await detectJurisdiction('8.8.8.8', {
      ipinfoToken: 'test-token',
      fetch: mockFetch as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Network error');
    }
  });
});

describe('isCountryBlocked', () => {
  test('returns true for blocked country', () => {
    expect(isCountryBlocked('KP', ['KP', 'IR', 'SY'])).toBe(true);
  });

  test('returns false for non-blocked country', () => {
    expect(isCountryBlocked('US', ['KP', 'IR', 'SY'])).toBe(false);
  });

  test('handles case insensitivity', () => {
    expect(isCountryBlocked('kp', ['KP', 'IR'])).toBe(true);
  });

  test('returns false for empty blocklist', () => {
    expect(isCountryBlocked('US', [])).toBe(false);
  });
});

describe('DEFAULT_JURISDICTION_CONFIG', () => {
  test('has empty blocked countries', () => {
    expect(DEFAULT_JURISDICTION_CONFIG.blockedCountries).toEqual([]);
  });

  test('does not require KYC by default', () => {
    expect(DEFAULT_JURISDICTION_CONFIG.requireKYC).toBe(false);
  });
});
