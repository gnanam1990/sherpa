/**
 * POST /api/cron/hourly — runs the hourly task registry.
 *
 * Triggered externally by cron-job.org (free tier; chosen over Vercel
 * Pro's $20/mo cron addon while we're still pre-revenue — see
 * docs/sherpa/decisions/2026-05-14-sentry-cron-infra.md). The trigger
 * carries `Authorization: Bearer ${CRON_SECRET}`. Without that header
 * (or with a wrong value) the route 401s; with no `cronSecret`
 * configured at all, the route 503s ("disabled, not mis-authed").
 *
 * Each task in the registry produces ONE audit_log row with
 * `surface='cron'` and `intent='CRON:${task.name}'`. Per-task rows
 * (vs one summary row per POST) make failed tasks individually
 * greppable in audit_log queries.
 *
 * The registry is empty in Stage 1 — Stage 4 will add price refresh,
 * gas-cap recalibration, etc.
 */

import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import {
  createAuditLog,
  updateAuditLog,
  type AuditStore,
} from '@sherpa/memory';

export type CronDeps = {
  /** Bound logger (surface='cron') for tasks to write into. */
  log: { error(msg: string, meta?: Record<string, unknown>): void };
};

export type CronTask = {
  name: string;
  run(deps: CronDeps): Promise<void>;
};

/**
 * The hourly registry. Empty in Stage 1; Stage 4 adds refresh tasks.
 * Append-only — never reorder, since `intent='CRON:${name}'` is
 * grep-keyed in dashboards.
 */
export const HOURLY_TASKS: readonly CronTask[] = Object.freeze([]);

export type RegisterCronOptions = {
  auditStore: AuditStore;
  cronSecret?: string;
  tasks?: readonly CronTask[];
  log?: CronDeps['log'];
};

/**
 * `0x000…000` is used as the audit_log user_address for cron rows. The
 * column is NOT NULL on audit_log (unlike llm_usage), so we need a
 * sentinel; the all-zeros address is unambiguously not a real user.
 */
const CRON_SYSTEM_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function checkCronAuth(
  authHeader: string | undefined,
  configured: string | undefined,
): { ok: true } | { ok: false; status: 401 | 503; reason: string } {
  if (!configured) return { ok: false, status: 503, reason: 'cron disabled' };
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, reason: 'missing bearer token' };
  }
  const supplied = authHeader.slice('Bearer '.length).trim();
  if (supplied.length !== configured.length) {
    return { ok: false, status: 401, reason: 'invalid token' };
  }
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(configured))) {
    return { ok: false, status: 401, reason: 'invalid token' };
  }
  return { ok: true };
}

export function registerCronRoutes(
  app: FastifyInstance,
  opts: RegisterCronOptions,
): void {
  const { auditStore, cronSecret, log } = opts;
  const tasks = opts.tasks ?? HOURLY_TASKS;
  const tracelog = log ?? {
    error(_msg: string, _meta?: Record<string, unknown>) {},
  };

  app.post('/api/cron/hourly', async (req, reply) => {
    const authHeader = req.headers['authorization'];
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const guard = checkCronAuth(header, cronSecret);
    if (!guard.ok) return reply.code(guard.status).send({ error: guard.reason });

    const submittedAt = Date.now();
    const results: Array<{
      name: string;
      auditLogId: number;
      status: 'success' | 'failed';
      error?: string;
    }> = [];

    for (const task of tasks) {
      const auditLogId = await createAuditLog(
        {
          userAddress: CRON_SYSTEM_ADDRESS,
          intent: `CRON:${task.name}`,
          planHash: '0x' + '0'.repeat(64),
          submittedAt,
          surface: 'cron',
          rawInput: '',
        },
        auditStore,
      );
      try {
        await task.run({ log: tracelog });
        await updateAuditLog(
          auditLogId,
          { status: 'success', confirmedAt: Date.now() },
          auditStore,
        );
        results.push({ name: task.name, auditLogId, status: 'success' });
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        // Logger is bound to surface='cron' upstream — error() forwards
        // to Sentry with the surface tag.
        tracelog.error('cron task failed', {
          task: task.name,
          auditLogId,
          err: err as Error,
        });
        await updateAuditLog(
          auditLogId,
          { status: 'failed', error: message, confirmedAt: Date.now() },
          auditStore,
        );
        results.push({ name: task.name, auditLogId, status: 'failed', error: message });
      }
    }

    return reply.send({
      ok: true,
      ranAt: submittedAt,
      tasks: results,
    });
  });
}
