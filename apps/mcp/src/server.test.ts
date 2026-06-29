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
import type { SherpaClient } from '@sherpa/sdk';
import { buildToolList, dispatchToolCall } from './server.js';
import { McpSession, type SignatureVerifier } from './auth.js';
import type { ToolContext } from './tools.js';

const USER = '0x1111111111111111111111111111111111111111';

const passingVerifier: SignatureVerifier = { verify: vi.fn(async () => true) };
const failingVerifier: SignatureVerifier = { verify: vi.fn(async () => false) };

function fakeClient() {
  return {
    parse: vi.fn(async (req) => ({ intent: 'LEND', params: req, confidence: 1, riskLevel: 'low' })),
    plan: vi.fn(async () => ({ steps: ['approve', 'supply'], confirmationCard: { intent: 'LEND' } })),
    getBalance: vi.fn(async (address) => ({ address, ethWei: '0', ethDisplay: '0', usdcBaseUnits: '0', usdcDisplay: '0' })),
    getPositions: vi.fn(async (address) => ({ address, hasPosition: false, healthFactor: '0', totalCollateralBase: '0', totalDebtBase: '0', availableBorrowsBase: '0' })),
    getPortfolio: vi.fn(async (address) => ({ address, chains: [], totalValueUsd: '0', lastUpdated: 'now' })),
    checkSafety: vi.fn(async () => ({ safe: true, riskLevel: 'low', warnings: [], ringResults: [] })),
    signIntent: vi.fn(async () => ({ token: 'tok', signUrl: 'https://web/sign?token=tok', expiresAt: '2026-06-29T00:05:00Z' })),
  };
}

function ctxWith(client: ReturnType<typeof fakeClient>, verifier = passingVerifier): ToolContext {
  return { client: client as unknown as SherpaClient, session: new McpSession(verifier) };
}

async function call(name: string, args: unknown, ctx: ToolContext) {
  const res = await dispatchToolCall(name, args, ctx);
  return { isError: res.isError ?? false, body: JSON.parse(res.content[0]!.text) as Record<string, unknown> };
}

describe('Sherpa MCP — tool list', () => {
  it('lists the seven tools with input schemas and read-only annotations', () => {
    const { tools } = buildToolList();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'sherpa_authenticate',
      'sherpa_balance',
      'sherpa_parse',
      'sherpa_plan',
      'sherpa_portfolio',
      'sherpa_positions',
      'sherpa_safety_check',
    ]);
    for (const t of tools) expect(t.inputSchema).toBeDefined();
    const readOnly = Object.fromEntries(tools.map((t) => [t.name, t.annotations.readOnlyHint]));
    expect(readOnly['sherpa_balance']).toBe(true);
    expect(readOnly['sherpa_plan']).toBe(false);
    expect(readOnly['sherpa_authenticate']).toBe(false);
  });
});

describe('Sherpa MCP — auth gating', () => {
  it('rejects read tools before authentication', async () => {
    const { isError, body } = await call('sherpa_balance', {}, ctxWith(fakeClient()));
    expect(isError).toBe(true);
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('binds the session on a valid Base Account signature', async () => {
    const ctx = ctxWith(fakeClient());
    const { isError, body } = await call(
      'sherpa_authenticate',
      { address: USER, message: 'Sign in to Sherpa', signature: '0xabc' },
      ctx,
    );
    expect(isError).toBe(false);
    expect(body.authenticated).toBe(true);
    expect(ctx.session.address).toBe(USER.toLowerCase());
  });

  it('refuses a bad signature', async () => {
    const ctx = ctxWith(fakeClient(), failingVerifier);
    const { isError } = await call(
      'sherpa_authenticate',
      { address: USER, message: 'm', signature: '0xabc' },
      ctx,
    );
    expect(isError).toBe(true);
  });
});

describe('Sherpa MCP — read tools', () => {
  it('returns balance for the bound address', async () => {
    const client = fakeClient();
    const ctx = ctxWith(client);
    ctx.session.bindFromVerifiedOAuth(USER as `0x${string}`);
    const { isError, body } = await call('sherpa_balance', {}, ctx);
    expect(isError).toBe(false);
    expect(body.address).toBe(USER.toLowerCase());
    expect(client.getBalance).toHaveBeenCalledWith(USER.toLowerCase());
  });

  it('parses without requiring auth', async () => {
    const { isError, body } = await call('sherpa_parse', { input: 'supply 100 USDC' }, ctxWith(fakeClient()));
    expect(isError).toBe(false);
    expect(body.intent).toBe('LEND');
  });
});

describe('Sherpa MCP — non-custodial plan', () => {
  it('returns an UNSIGNED plan plus a Base Account signing handoff (never signs)', async () => {
    const client = fakeClient();
    const ctx = ctxWith(client);
    ctx.session.bindFromVerifiedOAuth(USER as `0x${string}`);
    const { isError, body } = await call('sherpa_plan', { intent: 'LEND', params: { amount: '100', asset: 'USDC' } }, ctx);

    expect(isError).toBe(false);
    expect(body.signed).toBe(false);
    expect(body.autoExecuted).toBe(false);
    expect(body.unsignedPlan).toBeDefined();
    expect((body.signing as Record<string, unknown>).signUrl).toMatch(/\/sign\?token=/);

    // The signing handoff uses the 'mcp' surface bound to the verified account.
    expect(client.signIntent).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'mcp', surfaceUserId: USER.toLowerCase() }),
    );
    // Nothing signed or executed.
    expect(JSON.stringify(body)).not.toMatch(/"signature"|"signedTx"|"privateKey"/);
  });

  it('requires auth before planning', async () => {
    const { isError, body } = await call('sherpa_plan', { intent: 'LEND', params: {} }, ctxWith(fakeClient()));
    expect(isError).toBe(true);
    expect(body.code).toBe('UNAUTHENTICATED');
  });
});

describe('Sherpa MCP — input hardening', () => {
  it('rejects unknown tools', async () => {
    const { isError } = await call('sherpa_delete_everything', {}, ctxWith(fakeClient()));
    expect(isError).toBe(true);
  });

  it('rejects malformed args at the schema', async () => {
    const { isError } = await call('sherpa_parse', { input: '' }, ctxWith(fakeClient()));
    expect(isError).toBe(true);
  });
});
