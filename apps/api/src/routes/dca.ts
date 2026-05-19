/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  InMemoryDCAStore,
  type DCAStore,
  type CreateDCAScheduleInput,
} from '@sherpa/memory';
import { validateDCASchedule } from '@sherpa/scheduler';
import { calculateNextExecution } from '@sherpa/scheduler';

const CreateDCABody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fromAsset: z.string(),
  toAsset: z.string(),
  amountPerTick: z.string(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  hourOfDay: z.number().min(0).max(23).default(12),
  totalBudget: z.string().optional(),
  maxExecutions: z.number().int().positive().optional(),
  endCondition: z.enum(['never', 'count', 'date']).default('never'),
  endDate: z.string().optional(),
});

const AddressParams = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().uuid(),
});

const UpdateDCABody = z
  .object({
    amountPerTick: z.string().max(80).optional(),
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    hourOfDay: z.number().min(0).max(23).optional(),
    totalBudget: z.string().max(80).optional(),
    maxExecutions: z.number().int().positive().optional(),
    endCondition: z.enum(['never', 'count', 'date']).optional(),
    endDate: z.string().optional(),
    status: z.enum(['active', 'paused', 'cancelled']).optional(),
  })
  .strict();

const defaultStore: DCAStore = new InMemoryDCAStore();
type PersistenceMode = 'process-memory' | 'postgres';

export async function dcaRoutes(
  app: FastifyInstance,
  store: DCAStore = defaultStore,
  persistence: PersistenceMode = 'process-memory',
): Promise<void> {
  app.post('/api/dca', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateDCABody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const data = parsed.data;

    const validation = validateDCASchedule({
      frequency: data.frequency,
      amountPerTick: data.amountPerTick,
      endCondition: data.endCondition,
      maxExecutions: data.maxExecutions,
      endDate: data.endDate,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      hourOfDay: data.hourOfDay,
    });

    if (!validation.ok) {
      return reply.status(400).send({ error: validation.error });
    }

    const nextExecution = calculateNextExecution(
      data.frequency,
      data.dayOfWeek,
      data.dayOfMonth,
      data.hourOfDay,
    );

    const input: CreateDCAScheduleInput = {
      userAddress: data.userAddress,
      fromAsset: { symbol: data.fromAsset },
      toAsset: { symbol: data.toAsset },
      amountPerTick: data.amountPerTick,
      frequency: data.frequency,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      hourOfDay: data.hourOfDay,
      totalBudget: data.totalBudget,
      maxExecutions: data.maxExecutions,
      endCondition: data.endCondition,
      endDate: data.endDate,
      nextExecutionAt: nextExecution.toISOString(),
    };

    const schedule = await store.createSchedule(input);

    return reply.status(201).send({
      id: schedule.id,
      userAddress: schedule.user_address,
      fromAsset: schedule.from_asset,
      toAsset: schedule.to_asset,
      amountPerTick: schedule.amount_per_tick,
      frequency: schedule.frequency,
      dayOfWeek: schedule.day_of_week,
      dayOfMonth: schedule.day_of_month,
      hourOfDay: schedule.hour_of_day,
      status: schedule.status,
      totalBudget: schedule.total_budget,
      maxExecutions: schedule.max_executions,
      endCondition: schedule.end_condition,
      endDate: schedule.end_date,
      totalExecutions: schedule.total_executions,
      consecutiveFailures: schedule.consecutive_failures,
      nextExecutionAt: schedule.next_execution_at,
      createdAt: schedule.created_at,
    });
  });

  app.get('/api/dca/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid address' });
    }

    const schedules = await store.getSchedulesByUser(params.data.address);

    return reply.send({
      schedules: schedules.map((s) => ({
        id: s.id,
        userAddress: s.user_address,
        fromAsset: s.from_asset,
        toAsset: s.to_asset,
        amountPerTick: s.amount_per_tick,
        frequency: s.frequency,
        status: s.status,
        totalExecutions: s.total_executions,
        maxExecutions: s.max_executions,
        endCondition: s.end_condition,
        consecutiveFailures: s.consecutive_failures,
        nextExecutionAt: s.next_execution_at,
        createdAt: s.created_at,
        lastExecutedAt: s.last_executed_at,
      })),
      persistence,
    });
  });

  app.patch('/api/dca/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateDCABody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: body.error.message });
    }

    const existing = await store.getScheduleById(params.data.id);
    if (!existing) {
      return reply.status(404).send({ error: 'DCA schedule not found' });
    }

    const data = body.data;
    let updated;

    if (data.status === 'cancelled') {
      updated = await store.updateSchedule(params.data.id, { status: 'completed' });
    } else if (data.status === 'paused') {
      updated = await store.pauseSchedule(params.data.id);
    } else if (data.status === 'active') {
      updated = await store.resumeSchedule(params.data.id);
    } else {
      updated = await store.updateSchedule(params.data.id, {
        amountPerTick: data.amountPerTick,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        hourOfDay: data.hourOfDay,
        totalBudget: data.totalBudget,
        maxExecutions: data.maxExecutions,
        endCondition: data.endCondition,
        endDate: data.endDate,
      });
    }

    if (!updated) {
      return reply.status(404).send({ error: 'DCA schedule not found' });
    }

    return reply.send({
      id: updated.id,
      status: updated.status,
      amountPerTick: updated.amount_per_tick,
      frequency: updated.frequency,
    });
  });

  app.delete('/api/dca/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }

    const existing = await store.getScheduleById(params.data.id);
    if (!existing) {
      return reply.status(404).send({ error: 'DCA schedule not found' });
    }

    await store.deleteSchedule(params.data.id);
    return reply.send({ id: params.data.id, status: 'deleted' });
  });

  app.get('/api/dca/:id/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }

    const existing = await store.getScheduleById(params.data.id);
    if (!existing) {
      return reply.status(404).send({ error: 'DCA schedule not found' });
    }

    const executions = await store.getExecutions(params.data.id);

    return reply.send({
      executions: executions.map((e) => ({
        id: e.id,
        scheduleId: e.dca_schedule_id,
        amountIn: e.amount_in,
        amountOut: e.amount_out,
        txHash: e.tx_hash,
        status: e.status,
        error: e.error,
        builderCode: e.builder_code,
        executedAt: e.executed_at,
      })),
    });
  });

  app.get('/api/dca/:id/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }

    const existing = await store.getScheduleById(params.data.id);
    if (!existing) {
      return reply.status(404).send({ error: 'DCA schedule not found' });
    }

    const stats = await store.getScheduleStats(params.data.id);
    return reply.send(stats);
  });
}
