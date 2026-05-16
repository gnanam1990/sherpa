import { describe, it, expect } from 'vitest';
import { runPipeline } from './pipeline.js';
import type { PendingTx, Address } from './types.js';
import { ALLOWED_CONTRACTS } from './allowlist.js';
import {
  BLOCK_PRICE_IMPACT_BPS,
  MAX_SLIPPAGE_BPS,
} from './rings/slippage.js';

const goodTx: PendingTx = {
  to: ALLOWED_CONTRACTS.USDC,
  data: '0xa9059cbb',
  value: 0n,
  asset: ALLOWED_CONTRACTS.USDC,
  amount: 1_000_000n,
  recipientSource: 'direct',
};

const toHF = (v: number) => BigInt(Math.round(v * 1e18));
const toWei = (v: number) => BigInt(Math.round(v * 1e18));

describe('pipeline integration', () => {
  // ── SendIntent ─────────────────────────────────────────────────────────

  describe('SendIntent', () => {
    it('passes with clean tx (rings 1-7 only)', async () => {
      const result = await runPipeline(goodTx, 'SendIntent');
      expect(result.pass).toBe(true);
      expect(result.healthFactor).toBeUndefined();
      expect(result.slippage).toBeUndefined();
      expect(result.liquidation).toBeUndefined();
    });

    it('fails when allowlist ring fails', async () => {
      const result = await runPipeline(
        { ...goodTx, to: '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead' as Address },
        'SendIntent',
      );
      expect(result.pass).toBe(false);
      expect(result.ringResults.some((r) => !r.ok)).toBe(true);
    });

    it('fails when amount cap ring fails', async () => {
      const result = await runPipeline(
        { ...goodTx, amount: 9_999_999_999n },
        'SendIntent',
      );
      expect(result.pass).toBe(false);
    });

    it('ignores slippage and HF deps for SendIntent', async () => {
      const result = await runPipeline(goodTx, 'SendIntent', {
        slippage: { priceImpactBps: 9999 },
        healthFactor: { intent: 'borrow', currentHF: toHF(1.0), postHF: toHF(0.5) },
      });
      expect(result.pass).toBe(true);
      expect(result.slippage).toBeUndefined();
      expect(result.healthFactor).toBeUndefined();
    });
  });

  // ── SwapIntent ─────────────────────────────────────────────────────────

  describe('SwapIntent', () => {
    it('passes with low slippage swap', async () => {
      const result = await runPipeline(goodTx, 'SwapIntent', {
        slippage: { priceImpactBps: 20 },
      });
      expect(result.pass).toBe(true);
      expect(result.slippage).toBeDefined();
      expect(result.slippage!.pass).toBe(true);
    });

    it('fails when slippage blocks', async () => {
      const result = await runPipeline(goodTx, 'SwapIntent', {
        slippage: { priceImpactBps: BLOCK_PRICE_IMPACT_BPS },
      });
      expect(result.pass).toBe(false);
      expect(result.slippage!.pass).toBe(false);
    });

    it('fails when slippage tolerance too high', async () => {
      const result = await runPipeline(goodTx, 'SwapIntent', {
        slippage: { priceImpactBps: 10, slippageBps: MAX_SLIPPAGE_BPS + 1 },
      });
      expect(result.pass).toBe(false);
    });

    it('fails when rings fail even if slippage passes', async () => {
      const result = await runPipeline(
        { ...goodTx, to: '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead' as Address },
        'SwapIntent',
        { slippage: { priceImpactBps: 10 } },
      );
      expect(result.pass).toBe(false);
    });

    it('no HF or liquidation for SwapIntent', async () => {
      const result = await runPipeline(goodTx, 'SwapIntent', {
        slippage: { priceImpactBps: 10 },
      });
      expect(result.healthFactor).toBeUndefined();
      expect(result.liquidation).toBeUndefined();
    });

    it('swap works without slippage dep (optional)', async () => {
      const result = await runPipeline(goodTx, 'SwapIntent');
      expect(result.pass).toBe(true);
      expect(result.slippage).toBeUndefined();
    });
  });

  // ── BorrowIntent ───────────────────────────────────────────────────────

  describe('BorrowIntent', () => {
    it('passes with safe HF and liquidation', async () => {
      const result = await runPipeline(goodTx, 'BorrowIntent', {
        healthFactor: { intent: 'borrow', currentHF: toHF(2.5), postHF: toHF(2.0) },
        liquidation: {
          currentPriceUSD: 2000,
          collateralAmount: toWei(10),
          borrowAmountUSD: 5000,
          liquidationThreshold: 0.85,
        },
      });
      expect(result.pass).toBe(true);
      expect(result.healthFactor!.pass).toBe(true);
      expect(result.liquidation).toBeDefined();
    });

    it('fails when HF blocks', async () => {
      const result = await runPipeline(goodTx, 'BorrowIntent', {
        healthFactor: { intent: 'borrow', currentHF: toHF(1.3), postHF: toHF(1.1) },
      });
      expect(result.pass).toBe(false);
      expect(result.healthFactor!.pass).toBe(false);
    });

    it('still returns liquidation info when HF blocks', async () => {
      const result = await runPipeline(goodTx, 'BorrowIntent', {
        healthFactor: { intent: 'borrow', currentHF: toHF(1.3), postHF: toHF(1.1) },
        liquidation: {
          currentPriceUSD: 2000,
          collateralAmount: toWei(10),
          borrowAmountUSD: 15000,
          liquidationThreshold: 0.85,
        },
      });
      expect(result.pass).toBe(false);
      expect(result.liquidation).toBeDefined();
    });

    it('no slippage for BorrowIntent', async () => {
      const result = await runPipeline(goodTx, 'BorrowIntent', {
        healthFactor: { intent: 'borrow', currentHF: toHF(2.0), postHF: toHF(1.8) },
      });
      expect(result.slippage).toBeUndefined();
    });

    it('borrow works without HF dep (optional)', async () => {
      const result = await runPipeline(goodTx, 'BorrowIntent');
      expect(result.pass).toBe(true);
      expect(result.healthFactor).toBeUndefined();
    });
  });

  // ── WithdrawIntent ─────────────────────────────────────────────────────

  describe('WithdrawIntent', () => {
    it('passes with safe HF', async () => {
      const result = await runPipeline(goodTx, 'WithdrawIntent', {
        healthFactor: { intent: 'withdraw', currentHF: toHF(3.0), postHF: toHF(2.5) },
      });
      expect(result.pass).toBe(true);
      expect(result.healthFactor!.pass).toBe(true);
    });

    it('fails when withdraw HF too low', async () => {
      const result = await runPipeline(goodTx, 'WithdrawIntent', {
        healthFactor: { intent: 'withdraw', currentHF: toHF(1.6), postHF: toHF(1.49) },
      });
      expect(result.pass).toBe(false);
      expect(result.healthFactor!.pass).toBe(false);
    });

    it('no slippage or liquidation for WithdrawIntent', async () => {
      const result = await runPipeline(goodTx, 'WithdrawIntent', {
        healthFactor: { intent: 'withdraw', currentHF: toHF(2.0), postHF: toHF(1.8) },
      });
      expect(result.slippage).toBeUndefined();
      expect(result.liquidation).toBeUndefined();
    });

    it('withdraw works without HF dep (optional)', async () => {
      const result = await runPipeline(goodTx, 'WithdrawIntent');
      expect(result.pass).toBe(true);
    });
  });

  // ── Cross-intent ───────────────────────────────────────────────────────

  describe('cross-intent behavior', () => {
    it('SwapIntent + BorrowIntent on same tx produce different results', async () => {
      const swapResult = await runPipeline(goodTx, 'SwapIntent', {
        slippage: { priceImpactBps: 10 },
      });
      const borrowResult = await runPipeline(goodTx, 'BorrowIntent', {
        healthFactor: { intent: 'borrow', currentHF: toHF(2.0), postHF: toHF(1.8) },
      });
      expect(swapResult.slippage).toBeDefined();
      expect(swapResult.healthFactor).toBeUndefined();
      expect(borrowResult.healthFactor).toBeDefined();
      expect(borrowResult.slippage).toBeUndefined();
    });

    it('all intents share the same ring 1-7 checks', async () => {
      const badTx = { ...goodTx, amount: 9_999_999_999n };
      const sendResult = await runPipeline(badTx, 'SendIntent');
      const swapResult = await runPipeline(badTx, 'SwapIntent', {
        slippage: { priceImpactBps: 10 },
      });
      expect(sendResult.pass).toBe(false);
      expect(swapResult.pass).toBe(false);
    });

    it('pipeline result includes ringResults array', async () => {
      const result = await runPipeline(goodTx, 'SendIntent');
      expect(Array.isArray(result.ringResults)).toBe(true);
      expect(result.ringResults.length).toBeGreaterThan(0);
    });

    it('ringResults are RingCheckResult objects', async () => {
      const result = await runPipeline(goodTx, 'SendIntent');
      for (const r of result.ringResults) {
        expect(r).toHaveProperty('ok');
        expect(r).toHaveProperty('ring');
      }
    });

    it('combined failure: rings pass but HF blocks', async () => {
      const result = await runPipeline(goodTx, 'BorrowIntent', {
        healthFactor: { intent: 'borrow', currentHF: toHF(1.3), postHF: toHF(1.1) },
      });
      expect(result.ringResults.every((r) => r.ok)).toBe(true);
      expect(result.healthFactor!.pass).toBe(false);
      expect(result.pass).toBe(false);
    });

    it('combined failure: rings pass but slippage blocks', async () => {
      const result = await runPipeline(goodTx, 'SwapIntent', {
        slippage: { priceImpactBps: BLOCK_PRICE_IMPACT_BPS },
      });
      expect(result.ringResults.every((r) => r.ok)).toBe(true);
      expect(result.slippage!.pass).toBe(false);
      expect(result.pass).toBe(false);
    });

    it('pass is false when both rings and HF fail', async () => {
      const result = await runPipeline(
        { ...goodTx, to: '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead' as Address },
        'BorrowIntent',
        { healthFactor: { intent: 'borrow', currentHF: toHF(1.0), postHF: toHF(0.5) } },
      );
      expect(result.pass).toBe(false);
      expect(result.ringResults.some((r) => !r.ok)).toBe(true);
      expect(result.healthFactor!.pass).toBe(false);
    });
  });
});
