import { describe, it, expect } from 'vitest';
import {
  checkHealthFactor,
  MIN_HF_BORROW,
  MIN_HF_WITHDRAW,
} from './health-factor.js';

describe('health-factor ring', () => {
  const toHF = (v: number) => BigInt(Math.round(v * 1e18));

  // ── Borrow intent ──────────────────────────────────────────────────────

  describe('borrow intent', () => {
    it('passes when post-HF is well above minimum', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(2.5),
        postHF: toHF(2.0),
      });
      expect(result.pass).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('passes at exact MIN_HF_BORROW', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.5),
        postHF: MIN_HF_BORROW,
      });
      expect(result.pass).toBe(true);
    });

    it('blocks when post-HF < MIN_HF_BORROW', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.3),
        postHF: toHF(1.19),
      });
      expect(result.pass).toBe(false);
      expect(result.blockReason).toBeDefined();
      expect(result.blockReason).toContain('below the minimum');
      expect(result.severity).toBe('critical');
    });

    it('blocks when post-HF is exactly 1.0', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.2),
        postHF: toHF(1.0),
      });
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('blocks when post-HF is 0 (fully liquidatable)', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.0),
        postHF: 0n,
      });
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('emits warning when post-HF between MIN and WARN threshold', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.6),
        postHF: toHF(1.45),
      });
      expect(result.pass).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('caution');
      expect(result.severity).toBe('warning');
    });

    it('emits caution warning near the danger zone', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.6),
        postHF: toHF(1.48),
      });
      expect(result.pass).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('caution');
    });

    it('no warning when post-HF >= WARN threshold', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(3.0),
        postHF: toHF(2.0),
      });
      expect(result.pass).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('includes currentHF and postHF in result', () => {
      const current = toHF(2.0);
      const post = toHF(1.8);
      const result = checkHealthFactor({ intent: 'borrow', currentHF: current, postHF: post });
      expect(result.currentHF).toBe(current);
      expect(result.postHF).toBe(post);
    });

    it('dangerous warning when post-HF < MIN_HF_BORROW', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.3),
        postHF: toHF(1.1),
      });
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('dangerous');
    });
  });

  // ── Withdraw intent ────────────────────────────────────────────────────

  describe('withdraw intent', () => {
    it('passes when post-HF is well above withdraw minimum', () => {
      const result = checkHealthFactor({
        intent: 'withdraw',
        currentHF: toHF(3.0),
        postHF: toHF(2.5),
      });
      expect(result.pass).toBe(true);
    });

    it('passes at exact MIN_HF_WITHDRAW', () => {
      const result = checkHealthFactor({
        intent: 'withdraw',
        currentHF: toHF(2.0),
        postHF: MIN_HF_WITHDRAW,
      });
      expect(result.pass).toBe(true);
    });

    it('blocks when post-HF < MIN_HF_WITHDRAW', () => {
      const result = checkHealthFactor({
        intent: 'withdraw',
        currentHF: toHF(1.6),
        postHF: toHF(1.49),
      });
      expect(result.pass).toBe(false);
      expect(result.blockReason).toContain('withdrawal');
      expect(result.severity).toBe('critical');
    });

    it('blocks when post-HF just below 1.5', () => {
      const result = checkHealthFactor({
        intent: 'withdraw',
        currentHF: toHF(1.55),
        postHF: toHF(1.499),
      });
      expect(result.pass).toBe(false);
    });

    it('uses stricter threshold than borrow', () => {
      // HF 1.15 should fail borrow (< 1.2) and fail withdraw (< 1.5)
      const borrowResult = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.3),
        postHF: toHF(1.15),
      });
      const withdrawResult = checkHealthFactor({
        intent: 'withdraw',
        currentHF: toHF(1.6),
        postHF: toHF(1.45),
      });
      expect(borrowResult.pass).toBe(false); // < 1.2
      expect(withdrawResult.pass).toBe(false); // < 1.5
    });

    it('blocks with warning when post-HF below withdraw threshold', () => {
      const result = checkHealthFactor({
        intent: 'withdraw',
        currentHF: toHF(1.55),
        postHF: toHF(1.48),
      });
      expect(result.pass).toBe(false);
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('caution');
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('throws for negative currentHF', () => {
      expect(() =>
        checkHealthFactor({ intent: 'borrow', currentHF: -1n, postHF: toHF(1.5) }),
      ).toThrow('currentHF must be non-negative');
    });

    it('throws for negative postHF', () => {
      expect(() =>
        checkHealthFactor({ intent: 'borrow', currentHF: toHF(2.0), postHF: -1n }),
      ).toThrow('postHF must be non-negative');
    });

    it('handles zero currentHF (no collateral)', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: 0n,
        postHF: 0n,
      });
      expect(result.pass).toBe(false);
      expect(result.severity).toBe('critical');
    });

    it('handles very large HF values', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: 1000000000000000000000n, // 1000e18
        postHF: 500000000000000000000n,      // 500e18
      });
      expect(result.pass).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('result always has currentHF and postHF', () => {
      const result = checkHealthFactor({
        intent: 'borrow',
        currentHF: toHF(1.5),
        postHF: toHF(1.1),
      });
      expect(result).toHaveProperty('currentHF');
      expect(result).toHaveProperty('postHF');
    });
  });
});
