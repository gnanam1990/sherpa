/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { TaskContext } from './hourly-tasks.js';
import type { AutoRepayStore, AutoRepayDeps, AutoRepayCycleResult } from '@sherpa/memory';
import { runAutoRepayCycle, loadActiveRules, checkHealthFactor, calculateRepayAmount, shouldTrigger, estimatePostRepayHF } from '@sherpa/memory';

export type { AutoRepayStore, AutoRepayDeps, AutoRepayCycleResult };
export { runAutoRepayCycle, loadActiveRules, checkHealthFactor, calculateRepayAmount, shouldTrigger, estimatePostRepayHF };

export async function runAutoRepayTasks(ctx: TaskContext, deps: AutoRepayDeps): Promise<{ ok: boolean; detail?: string }> {
  try {
    const result = await runAutoRepayCycle(deps);
    return {
      ok: result.failed === 0,
      detail: `Auto-repay: ${result.evaluated} evaluated, ${result.triggered} triggered, ${result.repaid} repaid, ${result.failed} failed`,
    };
  } catch (err) {
    ctx.log.error('Auto-repay runner error', { err });
    return { ok: false, detail: String(err) };
  }
}
