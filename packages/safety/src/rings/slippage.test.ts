import { describe, it, expect } from 'vitest';
import {
  checkSlippage,
  MAX_SLIPPAGE_BPS,
  WARN_PRICE_IMPACT_BPS,
  BLOCK_PRICE_IMPACT_BPS,
  DEFAULT_SLIPPAGE_BPS,
} from './slippage.js';

describe('slippage ring', () => {
  // ── Basic pass/fail ────────────────────────────────────────────────────

  describe('pass conditions', () => {
    it('passes with low price impact and default slippage', () => {
      const result = checkSlippage({ priceImpactBps: 10 });
      expect(result.pass).toBe(true);
      expect(result.slippageBps).toBe(DEFAULT_SLIPPAGE_BPS);
    });

    it('passes with custom slippage within bounds', () => {
      const result = checkSlippage({ priceImpactBps: 50, slippageBps: 200 });
      expect(result.pass).toBe(true);
      expect(result.slippageBps).toBe(200);
    });

    it('passes with zero price impact', () => {
      const result = checkSlippage({ priceImpactBps: 0 });
      expect(result.pass).toBe(true);
    });

    it('passes at exact MAX_SLIPPAGE_BPS', () => {
      const result = checkSlippage({ priceImpactBps: 10, slippageBps: MAX_SLIPPAGE_BPS });
      expect(result.pass).toBe(true);
    });

    it('passes with price impact just below block threshold', () => {
      const result = checkSlippage({ priceImpactBps: BLOCK_PRICE_IMPACT_BPS - 1 });
      expect(result.pass).toBe(true);
    });
  });

  // ── Hard block conditions ──────────────────────────────────────────────

  describe('block conditions', () => {
    it('blocks when price impact >= BLOCK_PRICE_IMPACT_BPS (15%)', () => {
      const result = checkSlippage({ priceImpactBps: BLOCK_PRICE_IMPACT_BPS });
      expect(result.pass).toBe(false);
      expect(result.blockReason).toContain('Price impact');
    });

    it('blocks when price impact is 100%', () => {
      const result = checkSlippage({ priceImpactBps: 10000 });
      expect(result.pass).toBe(false);
      expect(result.blockReason).toBeDefined();
    });

    it('blocks when slippage tolerance > MAX_SLIPPAGE_BPS', () => {
      const result = checkSlippage({ priceImpactBps: 10, slippageBps: MAX_SLIPPAGE_BPS + 1 });
      expect(result.pass).toBe(false);
      expect(result.blockReason).toContain('Slippage tolerance');
    });

    it('blocks when slippage is extremely high', () => {
      const result = checkSlippage({ priceImpactBps: 5, slippageBps: 5000 });
      expect(result.pass).toBe(false);
    });
  });

  // ── Warnings ───────────────────────────────────────────────────────────

  describe('warnings', () => {
    it('warns when price impact >= WARN_PRICE_IMPACT_BPS (5%)', () => {
      const result = checkSlippage({ priceImpactBps: WARN_PRICE_IMPACT_BPS });
      expect(result.pass).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('risky');
    });

    it('warns dangerous when price impact >= block threshold', () => {
      const result = checkSlippage({ priceImpactBps: BLOCK_PRICE_IMPACT_BPS });
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('dangerous');
    });

    it('warns risky when slippage > MAX_SLIPPAGE_BPS', () => {
      const result = checkSlippage({ priceImpactBps: 10, slippageBps: MAX_SLIPPAGE_BPS + 1 });
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('risky');
    });

    it('warns caution for moderate price impact', () => {
      const result = checkSlippage({ priceImpactBps: 150 });
      expect(result.pass).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('caution');
    });

    it('no warning for minimal price impact', () => {
      const result = checkSlippage({ priceImpactBps: 50 });
      expect(result.pass).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  // ── Defaults ───────────────────────────────────────────────────────────

  describe('default behavior', () => {
    it('uses DEFAULT_SLIPPAGE_BPS when not specified', () => {
      const result = checkSlippage({ priceImpactBps: 10 });
      expect(result.slippageBps).toBe(DEFAULT_SLIPPAGE_BPS);
    });

    it('DEFAULT_SLIPPAGE_BPS is 100 (1%)', () => {
      expect(DEFAULT_SLIPPAGE_BPS).toBe(100);
    });
  });

  // ── Result shape ───────────────────────────────────────────────────────

  describe('result shape', () => {
    it('always includes priceImpactBps and slippageBps', () => {
      const result = checkSlippage({ priceImpactBps: 25 });
      expect(result).toHaveProperty('priceImpactBps');
      expect(result).toHaveProperty('slippageBps');
      expect(result).toHaveProperty('pass');
    });

    it('blockReason present when blocked', () => {
      const result = checkSlippage({ priceImpactBps: BLOCK_PRICE_IMPACT_BPS });
      expect(result.blockReason).toBeDefined();
      expect(typeof result.blockReason).toBe('string');
    });

    it('blockReason absent when passing', () => {
      const result = checkSlippage({ priceImpactBps: 10 });
      expect(result.blockReason).toBeUndefined();
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('throws for negative priceImpactBps', () => {
      expect(() => checkSlippage({ priceImpactBps: -1 })).toThrow('priceImpactBps must be non-negative');
    });

    it('throws for negative slippageBps', () => {
      expect(() => checkSlippage({ priceImpactBps: 10, slippageBps: -1 })).toThrow('slippageBps must be non-negative');
    });

    it('handles price impact of exactly 1 bps', () => {
      const result = checkSlippage({ priceImpactBps: 1 });
      expect(result.pass).toBe(true);
    });
  });
});
