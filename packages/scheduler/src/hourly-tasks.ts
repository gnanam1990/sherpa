/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type TaskContext = {
  /** Bound logger (surface='cron') for tasks to write into. */
  log: { error(msg: string, meta?: Record<string, unknown>): void };
};

export type HourlyTask = {
  name: string;
  run(ctx: TaskContext): Promise<{ ok: boolean; detail?: string }>;
};

/**
 * Empty in Stage 1. Stage 4 registers DCA, price-alert, and wallet-monitor
 * executors here so apps/api stays a thin cron transport.
 */
export const HOURLY_TASKS: HourlyTask[] = [];
