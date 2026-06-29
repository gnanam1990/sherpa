/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Sherpa MCP tools — thin, non-custodial wrappers over `@sherpa/sdk`'s
 * `SherpaClient`. Read tools return data; `sherpa_plan` returns an UNSIGNED plan
 * plus a signing handoff (the user signs in their Base Account via the surface
 * signing-token flow). The server never signs and never holds keys.
 *
 * Security contract (see README §Security): account comes from the verified
 * session (never tool args); inputs feed only the zod schema; no execution; no
 * key material; tool/onchain strings are data, not instructions.
 */

import { z, type ZodTypeAny } from 'zod';
import type { SherpaClient } from '@sherpa/sdk';
import { McpSession, AuthError, type Address } from './auth.js';

export type ToolContext = {
  client: SherpaClient;
  session: McpSession;
};

export type SherpaTool = {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  /** Marked so the MCP layer / clients can treat them as side-effect-free. */
  readOnly: boolean;
  handler: (args: unknown, ctx: ToolContext) => Promise<unknown>;
};

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'must be a 0x EVM address');

const authenticate: SherpaTool = {
  name: 'sherpa_authenticate',
  description:
    'Bind this session to a Base Account by verifying a signed login message (SIWE-style). Required before read/plan tools. The server never receives or holds a private key.',
  readOnly: false,
  inputSchema: z.object({
    address: addressSchema,
    message: z.string().min(1),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  }),
  handler: async (args, ctx) => {
    const { address, message, signature } = z
      .object({
        address: addressSchema,
        message: z.string().min(1),
        signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
      })
      .parse(args);
    const ok = await ctx.session.authenticate({
      address: address as Address,
      message,
      signature: signature as `0x${string}`,
    });
    if (!ok) throw new AuthError('Signature verification failed for the provided Base Account.');
    return { authenticated: true, address: ctx.session.address };
  },
};

const parse: SherpaTool = {
  name: 'sherpa_parse',
  description:
    'Parse a natural-language instruction into a structured Sherpa intent (read-only; no transaction is built).',
  readOnly: true,
  inputSchema: z.object({ input: z.string().min(1).max(2000) }),
  handler: async (args, ctx) => {
    const { input } = z.object({ input: z.string().min(1).max(2000) }).parse(args);
    const address = ctx.session.address ?? undefined;
    return ctx.client.parse({ input, walletAddress: address ?? undefined });
  },
};

const safetyCheck: SherpaTool = {
  name: 'sherpa_safety_check',
  description:
    'Run the Sherpa 7-ring safety preflight against a candidate transaction (to/data/value). Read-only; returns ring results and warnings.',
  readOnly: true,
  inputSchema: z.object({
    to: addressSchema,
    data: z.string().regex(/^0x[a-fA-F0-9]*$/),
    value: z.string().optional(),
  }),
  handler: async (args, ctx) => {
    const params = z
      .object({ to: addressSchema, data: z.string().regex(/^0x[a-fA-F0-9]*$/), value: z.string().optional() })
      .parse(args);
    return ctx.client.checkSafety(params);
  },
};

const balance: SherpaTool = {
  name: 'sherpa_balance',
  description: 'Get the connected Base Account ETH and USDC balances. Read-only.',
  readOnly: true,
  inputSchema: z.object({}),
  handler: async (_args, ctx) => ctx.client.getBalance(ctx.session.requireAddress()),
};

const positions: SherpaTool = {
  name: 'sherpa_positions',
  description: 'Get the connected Base Account Aave positions and health factor. Read-only.',
  readOnly: true,
  inputSchema: z.object({}),
  handler: async (_args, ctx) => ctx.client.getPositions(ctx.session.requireAddress()),
};

const portfolio: SherpaTool = {
  name: 'sherpa_portfolio',
  description: 'Get the connected Base Account cross-chain portfolio. Read-only.',
  readOnly: true,
  inputSchema: z.object({}),
  handler: async (_args, ctx) => ctx.client.getPortfolio(ctx.session.requireAddress()),
};

const planTool: SherpaTool = {
  name: 'sherpa_plan',
  description:
    'Plan a Sherpa intent into an UNSIGNED transaction (runs the 7-ring preflight) and return a non-custodial signing handoff: a signUrl where the user opens their Base Account to review and sign. NEVER executes; the server never signs.',
  readOnly: false,
  inputSchema: z.object({
    intent: z.string().min(1).max(64),
    params: z.record(z.unknown()).default({}),
  }),
  handler: async (args, ctx) => {
    const { intent, params } = z
      .object({ intent: z.string().min(1).max(64), params: z.record(z.unknown()).default({}) })
      .parse(args);
    const address = ctx.session.requireAddress();

    const unsignedPlan = await ctx.client.plan({ intent, params });
    // Non-custodial signing handoff via the surface signing-token flow.
    const signing = await ctx.client.signIntent({
      surface: 'mcp',
      surfaceUserId: address,
      intent: { intent, params },
    });

    return {
      ok: true,
      signed: false,
      autoExecuted: false,
      intent,
      unsignedPlan,
      signing: {
        signUrl: signing.signUrl,
        expiresAt: signing.expiresAt,
        note: 'Open signUrl in your Base Account to review and sign. The server holds no keys.',
      },
    };
  },
};

/** All Sherpa MCP tools. */
export const SHERPA_TOOLS: readonly SherpaTool[] = [
  authenticate,
  parse,
  safetyCheck,
  balance,
  positions,
  portfolio,
  planTool,
];
