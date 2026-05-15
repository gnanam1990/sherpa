import type { OrchestratedTx, CrossChainStep } from './types.js';

export async function orchestrate(
  steps: CrossChainStep[],
): Promise<OrchestratedTx> {
  return {
    steps,
    totalTime: steps.reduce((sum, s) => sum + s.estimatedTime, 0),
    totalFee: 0n,
    status: 'pending',
  };
}

export function validateOrchestration(steps: CrossChainStep[]): string[] {
  const errors: string[] = [];

  if (steps.length === 0) {
    errors.push('At least one step required');
  }
  if (steps.length > 5) {
    errors.push('Maximum 5 steps in orchestration');
  }

  return errors;
}
