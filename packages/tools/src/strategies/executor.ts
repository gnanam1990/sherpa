/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { StrategyExecution } from './types.js';

export async function executeStrategy(
  strategyId: string,
  parameters: Record<string, string>,
): Promise<StrategyExecution> {
  return {
    strategyId,
    userId: '0x0000000000000000000000000000000000000000',
    parameters,
    status: 'completed',
    results: [],
  };
}

export function validateStrategyParameters(
  required: string[],
  provided: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const param of required) {
    if (!provided[param]) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }
  return errors;
}
