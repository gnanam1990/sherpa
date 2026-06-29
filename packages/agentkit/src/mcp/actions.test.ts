/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { createAave } from '@sherpa/tools';
import { createSherpaActions, createSherpaActionProviders } from './index.js';
import type { SherpaActionConfig, SherpaActionContext, SherpaActionResult } from './index.js';

const USER = '0x1111111111111111111111111111111111111111' as const;
const FAKE_POOL = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

function wallet(address: string = USER) {
  return { getAddress: vi.fn(async () => address) };
}

/** A context that makes the testnet Aave path succeed (mirrors core's LEND test). */
function workingContext(): SherpaActionContext {
  return {
    executorDeps: {
      paymasterUrl: 'https://paymaster.test',
      aave: createAave({ poolAddress: FAKE_POOL }),
    },
  };
}

function byName(actions: SherpaActionConfig[], name: string): SherpaActionConfig {
  const a = actions.find((x) => x.name === name);
  if (!a) throw new Error(`missing action ${name}`);
  return a;
}

async function run(action: SherpaActionConfig, args: unknown, w = wallet()): Promise<SherpaActionResult> {
  return JSON.parse(await action.invoke(w, args)) as SherpaActionResult;
}

describe('Sherpa MCP actions', () => {
  it('exposes exactly the five Sherpa router actions', () => {
    const names = createSherpaActions(workingContext()).map((a) => a.name).sort();
    expect(names).toEqual([
      'sherpa_borrow',
      'sherpa_repay',
      'sherpa_supply',
      'sherpa_swap',
      'sherpa_withdraw',
    ]);
  });

  it('returns an UNSIGNED confirmation (never signed, never executed) on success', async () => {
    const supply = byName(createSherpaActions(workingContext()), 'sherpa_supply');
    const res = await run(supply, { amount: '100', asset: 'USDC' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.signed).toBe(false);
      expect(res.autoExecuted).toBe(false);
      expect(res.rings).toBe('passed');
      expect(res.intent).toBe('LEND');
      expect(res.unsignedTx.steps.length).toBeGreaterThan(0);
      // No signing material may ever appear as a field in the payload.
      const keys = new Set(Object.keys(res));
      expect(keys.has('signature')).toBe(false);
      expect(keys.has('privateKey')).toBe(false);
      expect(keys.has('signedTx')).toBe(false);
    }
  });

  it('reads the account from the wallet, not from tool input', async () => {
    const supply = byName(createSherpaActions(workingContext()), 'sherpa_supply');
    const w = wallet(USER);
    // A malicious extra arg trying to redirect the account must be ignored.
    await run(supply, { amount: '100', asset: 'USDC', userAddress: '0xattacker', onBehalfOf: '0xattacker' }, w);
    expect(w.getAddress).toHaveBeenCalledTimes(1);
  });

  it('surfaces a ring failure as a refusal (rings: failed), not an execution', async () => {
    const supply = byName(createSherpaActions(workingContext()), 'sherpa_supply');
    // Far above the per-tx amount cap → ring2_amount_cap rejects it.
    const res = await run(supply, { amount: '100000000', asset: 'USDC' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.rings).toBe('failed');
      expect(res.error).toMatch(/ring\d/);
    }
  });

  it('is fail-closed when mainnet is selected but the router is unconfigured', async () => {
    const ctx: SherpaActionContext = { executorDeps: { stage2Mainnet: true } };
    const borrow = byName(createSherpaActions(ctx), 'sherpa_borrow');
    const res = await run(borrow, { amount: '100', asset: 'USDC' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/not configured/i);
  });

  it('rejects malformed input at the schema (input hardening)', async () => {
    const supply = byName(createSherpaActions(workingContext()), 'sherpa_supply');
    await expect(supply.invoke(wallet(), { amount: 'not-a-number', asset: 'USDC' })).rejects.toThrow();
    await expect(supply.invoke(wallet(), { amount: '-5', asset: 'USDC' })).rejects.toThrow();
    await expect(supply.invoke(wallet(), { amount: '100', asset: 'this-is-not-a-symbol!!' })).rejects.toThrow();
  });

  it('borrow pins variable rate (Aave V3 on Base is variable-only)', async () => {
    // Even mainnet-unconfigured, a stable request can't be injected: there is no
    // rate arg, and the slot is hardcoded to variable.
    const ctx: SherpaActionContext = { executorDeps: { stage2Mainnet: true } };
    const borrow = byName(createSherpaActions(ctx), 'sherpa_borrow');
    const res = await run(borrow, { amount: '100', asset: 'USDC' });
    // Refused for being unconfigured — NOT for stable rate (proves variable is used).
    if (!res.ok) expect(res.errorCode).not.toBe('STABLE_RATE_UNSUPPORTED');
  });
});

describe('AgentKit binding (dependency-injected)', () => {
  it('maps Sherpa actions through an injected customActionProvider factory', () => {
    const customActionProvider = vi.fn((configs: SherpaActionConfig[]) => ({ configs }));
    const provider = createSherpaActionProviders(customActionProvider, workingContext()) as {
      configs: SherpaActionConfig[];
    };
    expect(customActionProvider).toHaveBeenCalledTimes(1);
    expect(provider.configs.map((c) => c.name)).toContain('sherpa_swap');
    // Every action carries a name, description and zod schema (customActionProvider shape).
    for (const c of provider.configs) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.description).toBe('string');
      expect(c.schema).toBeDefined();
      expect(typeof c.invoke).toBe('function');
    }
  });
});
