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
 * POST /api/paymaster — JSON-RPC proxy in front of Coinbase's paymaster.
 *
 * apps/web's wagmi config (apps/web/lib/wagmi.ts) sets an absolute
 * same-origin `capabilities.paymasterService.url`. wagmi's
 * sendCalls flow then POSTs `pm_getPaymasterStubData` and
 * `pm_getPaymasterData` to that URL during UserOp construction. This
 * route validates the JSON-RPC envelope, gates by per-sender rate
 * limit, audit-logs the call, and forwards the body verbatim to the
 * configured paymaster RPC.
 *
 * Why proxy and not call Coinbase directly from the browser:
 *   1. The paymaster RPC URL is bound to a *budget* — exposing it
 *      client-side lets anyone drain Sherpa's sponsorship pool.
 *   2. We need per-user gating (3/24h) which the upstream paymaster
 *      doesn't enforce.
 *   3. Stage 2 will add Ring 6/7 signature verification here without
 *      needing a client change.
 *
 * Sender extraction: `params[0].sender` is the lowercased smart-wallet
 * address from the UserOp wagmi is building. We trust it in Stage 1
 * (no sig verify); Stage 2 will require a signed UserOp before the
 * rate limit decrements.
 *
 * Upstream-failure semantics: if the upstream paymaster returns 5xx or
 * the fetch throws, we 502 the client AND refund the rate-limit credit
 * we already consumed. The audit row is marked `status='failed'`. We
 * never leak the upstream URL or error body in any client-facing
 * response.
 */

import type { FastifyInstance } from 'fastify';
import { verifyUserOpSignature, validateUserOpFields, type UserOp } from '@sherpa/safety';
import {
  createAuditLog,
  updateAuditLog,
  type AuditStore,
  type PaymasterRateLimiter,
} from '@sherpa/memory';

export type RegisterPaymasterOptions = {
  auditStore: AuditStore;
  rateLimiter: PaymasterRateLimiter;
  /** Coinbase paymaster RPC URL. Route 503s when undefined. */
  paymasterRpcUrl?: string;
  /** Injectable fetch for tests. */
  fetch?: typeof globalThis.fetch;
  /** Forwarded fetch timeout in ms. Default 15s. */
  timeoutMs?: number;
};

const ALLOWED_METHODS = new Set(['pm_getPaymasterStubData', 'pm_getPaymasterData']);
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_TIMEOUT_MS = 15_000;
const ZERO_PLAN_HASH = '0x' + '0'.repeat(64);
const paymasterRouteOptions = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: unknown;
  params?: unknown;
};

type ValidationResult =
  | { ok: true; method: string; sender: string }
  | { ok: false; status: 400 | 401; error: 'invalid_request' | 'unauthorized' };

function validate(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  const rpc = body as JsonRpcRequest;
  if (typeof rpc.method !== 'string' || !ALLOWED_METHODS.has(rpc.method)) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  if (!Array.isArray(rpc.params) || rpc.params.length === 0) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  const first = rpc.params[0];
  if (!first || typeof first !== 'object') {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  const senderRaw = (first as Record<string, unknown>).sender;
  // Spec: missing sender → 401 unauthorized (the request can't be
  // attributed to a user). Present-but-malformed sender → 400
  // invalid_request (the envelope is wrong, not the auth). Splitting
  // these so a client bug doesn't masquerade as an auth problem in
  // logs.
  if (senderRaw === undefined || senderRaw === null) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
  if (typeof senderRaw !== 'string' || !ADDRESS_RE.test(senderRaw)) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  return { ok: true, method: rpc.method, sender: senderRaw.toLowerCase() };
}

function summarizeParams(params: unknown): string {
  try {
    const s = JSON.stringify(params);
    return s.length > 100 ? s.slice(0, 100) : s;
  } catch {
    return '';
  }
}

export function registerPaymasterRoutes(
  app: FastifyInstance,
  opts: RegisterPaymasterOptions,
): void {
  const { auditStore, rateLimiter, paymasterRpcUrl } = opts;
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  app.post('/api/paymaster', paymasterRouteOptions, async (req, reply) => {
    if (!paymasterRpcUrl) {
      return reply.code(503).send({ error: 'paymaster_disabled' });
    }

    const validation = validate(req.body);
    if (!validation.ok) {
      return reply.code(validation.status).send({ error: validation.error });
    }
    const { method, sender } = validation;

    const rpcBody = req.body as JsonRpcRequest;
    const userOp = (rpcBody.params as unknown[])[0] as UserOp;

    // Security: verify UserOp signature before rate limit to prevent
    // attackers from exhausting rate limits with invalid UserOps
    const fieldValidation = validateUserOpFields(userOp);
    if (!fieldValidation.ok) {
      return reply.status(400).send({ error: fieldValidation.reason });
    }

    const sigVerification = verifyUserOpSignature(userOp, sender as UserOp['sender']);
    if (!sigVerification.ok) {
      return reply.status(401).send({ error: sigVerification.reason });
    }

    const limit = await rateLimiter.consume(sender);
    if (!limit.ok) {
      reply.header('X-Sherpa-Paymaster-Resets-At', new Date(limit.resetAt).toISOString());
      return reply.code(429).send({
        error: 'rate_limit',
        resets_at: new Date(limit.resetAt).toISOString(),
      });
    }

    const submittedAt = Date.now();
    const intent = JSON.stringify({
      method,
      params: summarizeParams((req.body as JsonRpcRequest).params),
    });
    const auditLogId = await createAuditLog(
      {
        userAddress: sender as `0x${string}`,
        intent,
        planHash: ZERO_PLAN_HASH,
        submittedAt,
        surface: 'paymaster',
        rawInput: '',
      },
      auditStore,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let upstreamRes: Response;
    try {
      upstreamRes = await fetchImpl(paymasterRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
    } catch {
      // Network failure / abort / DNS / timeout. Refund the rate-limit
      // credit so a Coinbase outage doesn't burn the user's daily cap.
      // The error is intentionally not surfaced — it can contain the
      // upstream URL or auth scheme.
      clearTimeout(timer);
      await rateLimiter.refund(sender);
      await updateAuditLog(
        auditLogId,
        { status: 'failed', error: 'upstream_unreachable', confirmedAt: Date.now() },
        auditStore,
      );
      return reply.code(502).send({ error: 'paymaster_upstream_error' });
    }
    clearTimeout(timer);

    if (upstreamRes.status >= 500) {
      await rateLimiter.refund(sender);
      await updateAuditLog(
        auditLogId,
        { status: 'failed', error: `upstream_${upstreamRes.status}`, confirmedAt: Date.now() },
        auditStore,
      );
      return reply.code(502).send({ error: 'paymaster_upstream_error' });
    }

    let payload: unknown;
    try {
      payload = await upstreamRes.json();
    } catch {
      await rateLimiter.refund(sender);
      await updateAuditLog(
        auditLogId,
        { status: 'failed', error: 'upstream_invalid_json', confirmedAt: Date.now() },
        auditStore,
      );
      return reply.code(502).send({ error: 'paymaster_upstream_error' });
    }

    await updateAuditLog(auditLogId, { status: 'success', confirmedAt: Date.now() }, auditStore);
    reply.header('X-Sherpa-Paymaster-Remaining', `${limit.remaining} of ${rateLimiter.limit()}`);
    reply.header('X-Sherpa-Paymaster-Resets-At', new Date(limit.resetAt).toISOString());
    return reply.code(upstreamRes.status).send(payload);
  });
}
