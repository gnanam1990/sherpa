import type { StrategyExecution, StrategyStepResult } from './types.js';

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
