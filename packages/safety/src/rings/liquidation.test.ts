import { describe, it, expect } from 'vitest';
import {
  calculateLiquidationPrice,
  WARN_BUFFER_PERCENT,
} from './liquidation.js';

describe('liquidation ring', () => {
  const toWei = (v: number) => BigInt(Math.round(v * 1e18));

  // ── Basic calculation ──────────────────────────────────────────────────

  describe('liquidation price calculation', () => {
    it('calculates liquidation price correctly', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 12000,
        liquidationThreshold: 0.85,
      });
      // liqPrice = 12000 / (10 * 0.85) = 1411.76
      expect(result.liquidationPriceUSD).toBeCloseTo(1411.76, 0);
      expect(result.currentPriceUSD).toBe(2000);
    });

    it('calculates buffer percentage correctly', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 12000,
        liquidationThreshold: 0.85,
      });
      // buffer = (2000 - 1411.76) / 2000 * 100 = 29.4%
      expect(result.bufferPercent).toBeCloseTo(29.4, 0);
    });

    it('no warning when buffer >= 20%', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 10000,
        liquidationThreshold: 0.85,
      });
      // liqPrice = 10000 / (10 * 0.85) = 1176.47
      // buffer = (2000 - 1176.47) / 2000 * 100 = 41.2%
      expect(result.warning).toBeUndefined();
    });

    it('returns currentPriceUSD in result', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 3500,
        collateralAmount: toWei(5),
        borrowAmountUSD: 10000,
        liquidationThreshold: 0.8,
      });
      expect(result.currentPriceUSD).toBe(3500);
    });
  });

  // ── Warnings ───────────────────────────────────────────────────────────

  describe('warnings', () => {
    it('warns caution when buffer < 20%', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 15000,
        liquidationThreshold: 0.85,
      });
      // liqPrice = 15000 / (10 * 0.85) = 1764.71
      // buffer = (2000 - 1764.71) / 2000 * 100 = 11.8%
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('caution');
    });

    it('warns risky when buffer < 10%', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 16500,
        liquidationThreshold: 0.85,
      });
      // liqPrice = 16500 / (10 * 0.85) = 1941.18
      // buffer = (2000 - 1941.18) / 2000 * 100 = 2.9%
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('dangerous');
    });

    it('warns dangerous when buffer < 5%', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 16800,
        liquidationThreshold: 0.85,
      });
      // liqPrice = 16800 / (10 * 0.85) = 1976.47
      // buffer = (2000 - 1976.47) / 2000 * 100 = 1.2%
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('dangerous');
    });

    it('warns dangerous when below liquidation price', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 1000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 12000,
        liquidationThreshold: 0.85,
      });
      // liqPrice = 12000 / (10 * 0.85) = 1411.76
      // buffer = (1000 - 1411.76) / 1000 * 100 = -41.2%
      expect(result.warning).toBeDefined();
      expect(result.warning!.level).toBe('dangerous');
      expect(result.bufferPercent).toBeLessThan(0);
    });

    it('no warning when buffer >= 20%', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 3000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 10000,
        liquidationThreshold: 0.8,
      });
      // liqPrice = 10000 / (10 * 0.8) = 1250
      // buffer = (3000 - 1250) / 3000 * 100 = 58.3%
      expect(result.warning).toBeUndefined();
    });
  });

  // ── Informational only ─────────────────────────────────────────────────

  describe('informational behavior', () => {
    it('never blocks (no pass field)', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 1000,
        collateralAmount: toWei(1),
        borrowAmountUSD: 10000,
        liquidationThreshold: 0.85,
      });
      // Even with extreme negative buffer, there's no "pass" field
      expect(result).not.toHaveProperty('pass');
    });

    it('always returns liquidationPriceUSD and bufferPercent', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(5),
        borrowAmountUSD: 5000,
        liquidationThreshold: 0.75,
      });
      expect(result).toHaveProperty('liquidationPriceUSD');
      expect(result).toHaveProperty('bufferPercent');
      expect(typeof result.liquidationPriceUSD).toBe('number');
      expect(typeof result.bufferPercent).toBe('number');
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('throws for non-positive currentPriceUSD', () => {
      expect(() =>
        calculateLiquidationPrice({
          currentPriceUSD: 0,
          collateralAmount: toWei(10),
          borrowAmountUSD: 5000,
          liquidationThreshold: 0.85,
        }),
      ).toThrow('currentPriceUSD must be positive');
    });

    it('throws for negative currentPriceUSD', () => {
      expect(() =>
        calculateLiquidationPrice({
          currentPriceUSD: -100,
          collateralAmount: toWei(10),
          borrowAmountUSD: 5000,
          liquidationThreshold: 0.85,
        }),
      ).toThrow('currentPriceUSD must be positive');
    });

    it('throws for non-positive collateralAmount', () => {
      expect(() =>
        calculateLiquidationPrice({
          currentPriceUSD: 2000,
          collateralAmount: 0n,
          borrowAmountUSD: 5000,
          liquidationThreshold: 0.85,
        }),
      ).toThrow('collateralAmount must be positive');
    });

    it('throws for negative borrowAmountUSD', () => {
      expect(() =>
        calculateLiquidationPrice({
          currentPriceUSD: 2000,
          collateralAmount: toWei(10),
          borrowAmountUSD: -1,
          liquidationThreshold: 0.85,
        }),
      ).toThrow('borrowAmountUSD must be non-negative');
    });

    it('throws for invalid liquidationThreshold', () => {
      expect(() =>
        calculateLiquidationPrice({
          currentPriceUSD: 2000,
          collateralAmount: toWei(10),
          borrowAmountUSD: 5000,
          liquidationThreshold: 0,
        }),
      ).toThrow('liquidationThreshold must be in (0, 1]');

      expect(() =>
        calculateLiquidationPrice({
          currentPriceUSD: 2000,
          collateralAmount: toWei(10),
          borrowAmountUSD: 5000,
          liquidationThreshold: 1.5,
        }),
      ).toThrow('liquidationThreshold must be in (0, 1]');
    });

    it('handles zero borrowAmountUSD (no debt)', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 0,
        liquidationThreshold: 0.85,
      });
      expect(result.liquidationPriceUSD).toBe(0);
      expect(result.bufferPercent).toBe(100);
      expect(result.warning).toBeUndefined();
    });

    it('handles liquidationThreshold of 1.0 (100%)', () => {
      const result = calculateLiquidationPrice({
        currentPriceUSD: 2000,
        collateralAmount: toWei(10),
        borrowAmountUSD: 10000,
        liquidationThreshold: 1.0,
      });
      // liqPrice = 10000 / (10 * 1.0) = 1000
      expect(result.liquidationPriceUSD).toBeCloseTo(1000, 0);
    });
  });
});
