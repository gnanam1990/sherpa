import { describe, expect, it, vi } from 'vitest';
import { HOURLY_TASKS, type HourlyTask } from './index.js';

describe('hourly task registry', () => {
  it('exports an empty Stage 1 registry', () => {
    expect(Array.isArray(HOURLY_TASKS)).toBe(true);
    expect(HOURLY_TASKS).toEqual([]);
  });

  it('allows cron-style iteration over the empty registry', async () => {
    const results = [];
    for (const task of HOURLY_TASKS) {
      results.push(await task.run({ log: { error: vi.fn() } }));
    }

    expect(results).toEqual([]);
  });

  it('supports iterating scheduler task results', async () => {
    const task: HourlyTask = {
      name: 'sample',
      run: vi.fn(async () => ({ ok: true, detail: 'ran' })),
    };

    const results = [];
    for (const hourlyTask of [task]) {
      results.push(await hourlyTask.run({ log: { error: vi.fn() } }));
    }

    expect(task.run).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ ok: true, detail: 'ran' }]);
  });
});
