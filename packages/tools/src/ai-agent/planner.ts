/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type AIPlanStep = {
  description: string;
  intent: string;
  params: Record<string, string>;
  dependencies: number[];
};

export type AIPlan = {
  goal: string;
  steps: AIPlanStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
};

export async function createPlan(
  goal: string,
  _context: { memories: any[]; recentIntents: string[] },
): Promise<AIPlan> {
  return {
    goal,
    steps: [
      {
        description: `Analyze current position for: ${goal}`,
        intent: 'PORTFOLIO',
        params: { portfolioAction: 'show' },
        dependencies: [],
      },
      {
        description: `Execute primary action: ${goal}`,
        intent: 'SWAP',
        params: {},
        dependencies: [0],
      },
    ],
    estimatedTime: 60,
    riskLevel: 'medium',
    prerequisites: ['Connected wallet', 'Sufficient balance'],
  };
}

export function validatePlan(plan: AIPlan): string[] {
  const errors: string[] = [];

  if (plan.steps.length === 0) {
    errors.push('Plan must have at least one step');
  }
  if (plan.steps.length > 10) {
    errors.push('Plan cannot have more than 10 steps');
  }

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    if (!step) continue;
    for (const dep of step.dependencies) {
      if (dep >= i) {
        errors.push(`Step ${i} depends on future step ${dep}`);
      }
    }
  }

  return errors;
}

export function estimatePlanRisk(steps: AIPlanStep[]): 'low' | 'medium' | 'high' {
  const riskyIntents = new Set(['BORROW', 'LP', 'BET', 'BRIDGE']);
  const hasRiskyStep = steps.some((s) => riskyIntents.has(s.intent));

  if (steps.length > 5 || hasRiskyStep) return 'high';
  if (steps.length > 2) return 'medium';
  return 'low';
}
