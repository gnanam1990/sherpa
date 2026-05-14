import { describe, it, expect, vi } from 'vitest';
import { shouldSimulate, createSimulationCallback } from './planner.js';
import type { ParsedIntent } from '@sherpa/core';
import type { PendingTx } from '@sherpa/safety';
import type { Simulator } from '@sherpa/tools';

function makeIntent(intent: string): ParsedIntent {
  return { intent: intent as ParsedIntent['intent'], confidence: 1, raw: '', slots: {} };
}

const PENDING_TX: PendingTx = {
  to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  data: '0xa9059cbb',
  value: 0n,
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  amount: 1_000_000n,
  recipientSource: 'direct',
};

describe('agentkit/shouldSimulate', () => {
  it('returns true for SEND', () => {
    expect(shouldSimulate(makeIntent('SEND'))).toBe(true);
  });

  it('returns true for BUY', () => {
    expect(shouldSimulate(makeIntent('BUY'))).toBe(true);
  });

  it('returns true for all Stage 2 DeFi intents', () => {
    for (const intent of ['SWAP', 'LEND', 'BORROW', 'STAKE', 'BRIDGE', 'LP', 'DEPOSIT', 'BET']) {
      expect(shouldSimulate(makeIntent(intent))).toBe(true);
    }
  });

  it('returns false for BALANCE', () => {
    expect(shouldSimulate(makeIntent('BALANCE'))).toBe(false);
  });

  it('returns false for HISTORY', () => {
    expect(shouldSimulate(makeIntent('HISTORY'))).toBe(false);
  });

  it('returns false for unknown intents', () => {
    expect(shouldSimulate(makeIntent('UNKNOWN'))).toBe(false);
  });
});

describe('agentkit/createSimulationCallback', () => {
  function mockSimulator(result: { ok: boolean; gasEstimate?: bigint; errorCode?: string; errorMessage?: string }): Simulator {
    return {
      simulate: vi.fn().mockResolvedValue(
        result.ok
          ? { ok: true, gasEstimate: result.gasEstimate ?? 50000n, simulatedAt: Date.now() }
          : { ok: false, errorCode: result.errorCode, errorMessage: result.errorMessage },
      ),
    };
  }

  const TENDERLY_CONFIG = { apiKey: 'test', user: 'test', project: 'test' };

  it('returns gas estimate on successful simulation', async () => {
    const sim = mockSimulator({ ok: true, gasEstimate: 75000n });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gasEstimate).toBe(75000n);
  });

  it('rejects SIMULATION_REVERT regardless of fail-open', async () => {
    const sim = mockSimulator({ ok: false, errorCode: 'SIMULATION_REVERT', errorMessage: 'reverted' });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim, failOpen: true });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('SIMULATION_REVERT');
  });

  it('rejects INSUFFICIENT_FUNDS_FOR_GAS regardless of fail-open', async () => {
    const sim = mockSimulator({ ok: false, errorCode: 'INSUFFICIENT_FUNDS_FOR_GAS', errorMessage: 'no funds' });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim, failOpen: true });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('INSUFFICIENT_FUNDS_FOR_GAS');
  });

  it('fail-open: NETWORK_ERROR returns ok=true with 0n gas', async () => {
    const sim = mockSimulator({ ok: false, errorCode: 'NETWORK_ERROR', errorMessage: 'ECONNREFUSED' });
    const log = { warn: vi.fn() };
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim, failOpen: true, log });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gasEstimate).toBe(0n);
    expect(log.warn).toHaveBeenCalledWith('simulation_fail_open', expect.objectContaining({ errorCode: 'NETWORK_ERROR' }));
  });

  it('fail-open: TIMEOUT returns ok=true with 0n gas', async () => {
    const sim = mockSimulator({ ok: false, errorCode: 'TIMEOUT', errorMessage: 'timed out' });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim, failOpen: true });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.gasEstimate).toBe(0n);
  });

  it('fail-closed: NETWORK_ERROR rejects', async () => {
    const sim = mockSimulator({ ok: false, errorCode: 'NETWORK_ERROR', errorMessage: 'ECONNREFUSED' });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim, failOpen: false });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('NETWORK_ERROR');
  });

  it('fail-closed: TIMEOUT rejects', async () => {
    const sim = mockSimulator({ ok: false, errorCode: 'TIMEOUT', errorMessage: 'timed out' });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim, failOpen: false });
    const result = await cb(PENDING_TX);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('TIMEOUT');
  });

  it('passes PendingTx fields to simulator as a call', async () => {
    const sim = mockSimulator({ ok: true });
    const cb = createSimulationCallback(TENDERLY_CONFIG, { simulator: sim });
    await cb(PENDING_TX);

    expect(sim.simulate).toHaveBeenCalledWith(
      [{ to: PENDING_TX.to, data: PENDING_TX.data, value: PENDING_TX.value }],
      PENDING_TX.to,
    );
  });
});
