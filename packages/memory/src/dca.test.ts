import { describe, test, expect } from 'vitest';
import { InMemoryDCAStore, type DCAStore } from './dca.js';

describe('DCA memory store', () => {
  async function createStore() {
    return new InMemoryDCAStore();
  }

  async function createTestSchedule(store: DCAStore, overrides = {}) {
    return store.createSchedule({
      userAddress: '0x1234567890123456789012345678901234567890',
      fromAsset: { symbol: 'USDC' },
      toAsset: { symbol: 'ETH' },
      amountPerTick: '100',
      frequency: 'daily',
      nextExecutionAt: new Date(Date.now() + 3600000).toISOString(),
      ...overrides,
    });
  }

  describe('createSchedule', () => {
    test('creates a schedule with correct fields', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      expect(schedule.id).toBeDefined();
      expect(schedule.user_address).toBe('0x1234567890123456789012345678901234567890');
      expect(schedule.status).toBe('active');
      expect(schedule.total_executions).toBe(0);
      expect(schedule.consecutive_failures).toBe(0);
      expect(schedule.end_condition).toBe('never');
    });

    test('generates unique ids', async () => {
      const store = await createStore();
      const s1 = await createTestSchedule(store);
      const s2 = await createTestSchedule(store);
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('getScheduleById', () => {
    test('returns schedule by id', async () => {
      const store = await createStore();
      const created = await createTestSchedule(store);
      const found = await store.getScheduleById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    test('returns null for non-existent id', async () => {
      const store = await createStore();
      const found = await store.getScheduleById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getSchedulesByUser', () => {
    test('returns schedules for user', async () => {
      const store = await createStore();
      await createTestSchedule(store);
      await createTestSchedule(store);

      const schedules = await store.getSchedulesByUser('0x1234567890123456789012345678901234567890');
      expect(schedules.length).toBe(2);
    });

    test('returns empty for user with no schedules', async () => {
      const store = await createStore();
      const schedules = await store.getSchedulesByUser('0x0000000000000000000000000000000000000000');
      expect(schedules.length).toBe(0);
    });
  });

  describe('getDueSchedules', () => {
    test('returns schedules due for execution', async () => {
      const store = await createStore();
      await createTestSchedule(store, {
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const due = await store.getDueSchedules(new Date().toISOString());
      expect(due.length).toBe(1);
    });

    test('does not return future schedules', async () => {
      const store = await createStore();
      await createTestSchedule(store, {
        nextExecutionAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const due = await store.getDueSchedules(new Date().toISOString());
      expect(due.length).toBe(0);
    });

    test('does not return paused schedules', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store, {
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });
      await store.pauseSchedule(schedule.id);

      const due = await store.getDueSchedules(new Date().toISOString());
      expect(due.length).toBe(0);
    });
  });

  describe('updateSchedule', () => {
    test('updates fields', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      const updated = await store.updateSchedule(schedule.id, {
        amountPerTick: '200',
        frequency: 'weekly',
      });

      expect(updated).not.toBeNull();
      expect(updated!.amount_per_tick).toBe('200');
      expect(updated!.frequency).toBe('weekly');
    });

    test('returns null for non-existent id', async () => {
      const store = await createStore();
      const updated = await store.updateSchedule('non-existent', { amountPerTick: '200' });
      expect(updated).toBeNull();
    });
  });

  describe('pauseSchedule', () => {
    test('pauses active schedule', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);
      const paused = await store.pauseSchedule(schedule.id);

      expect(paused).not.toBeNull();
      expect(paused!.status).toBe('paused');
    });
  });

  describe('resumeSchedule', () => {
    test('resumes paused schedule', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);
      await store.pauseSchedule(schedule.id);
      const resumed = await store.resumeSchedule(schedule.id);

      expect(resumed).not.toBeNull();
      expect(resumed!.status).toBe('active');
      expect(resumed!.consecutive_failures).toBe(0);
    });

    test('returns null for non-paused schedule', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);
      const result = await store.resumeSchedule(schedule.id);
      expect(result).toBeNull();
    });
  });

  describe('deleteSchedule', () => {
    test('deletes schedule', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);
      const deleted = await store.deleteSchedule(schedule.id);
      expect(deleted).toBe(true);

      const found = await store.getScheduleById(schedule.id);
      expect(found).toBeNull();
    });

    test('returns false for non-existent id', async () => {
      const store = await createStore();
      const deleted = await store.deleteSchedule('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('createExecution', () => {
    test('creates execution record', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      const execution = await store.createExecution({
        dcaScheduleId: schedule.id,
        amountIn: '100',
        status: 'success',
        txHash: '0xabc',
      });

      expect(execution.id).toBeDefined();
      expect(execution.dca_schedule_id).toBe(schedule.id);
      expect(execution.status).toBe('success');
    });
  });

  describe('getExecutions', () => {
    test('returns executions for schedule', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      await store.createExecution({
        dcaScheduleId: schedule.id,
        amountIn: '100',
        status: 'success',
      });
      await store.createExecution({
        dcaScheduleId: schedule.id,
        amountIn: '100',
        status: 'failed',
        error: 'test error',
      });

      const execs = await store.getExecutions(schedule.id);
      expect(execs.length).toBe(2);
    });

    test('respects limit', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      for (let i = 0; i < 5; i++) {
        await store.createExecution({
          dcaScheduleId: schedule.id,
          amountIn: '100',
          status: 'success',
        });
      }

      const execs = await store.getExecutions(schedule.id, 2);
      expect(execs.length).toBe(2);
    });
  });

  describe('getScheduleStats', () => {
    test('calculates stats correctly', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      await store.createExecution({
        dcaScheduleId: schedule.id,
        amountIn: '100000000',
        amountOut: '50000000',
        status: 'success',
      });
      await store.createExecution({
        dcaScheduleId: schedule.id,
        amountIn: '100000000',
        status: 'failed',
        error: 'test',
      });

      const stats = await store.getScheduleStats(schedule.id);
      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.totalInvested).toBe('100000000');
      expect(stats.totalReceived).toBe('50000000');
    });
  });

  describe('incrementFailures', () => {
    test('increments consecutive failures', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      await store.incrementFailures(schedule.id);
      const updated = await store.getScheduleById(schedule.id);
      expect(updated!.consecutive_failures).toBe(1);
    });
  });

  describe('resetFailures', () => {
    test('resets consecutive failures', async () => {
      const store = await createStore();
      const schedule = await createTestSchedule(store);

      await store.incrementFailures(schedule.id);
      await store.incrementFailures(schedule.id);
      await store.resetFailures(schedule.id);

      const updated = await store.getScheduleById(schedule.id);
      expect(updated!.consecutive_failures).toBe(0);
    });
  });
});
