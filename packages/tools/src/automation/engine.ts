import type { AutomationRule, AutomationDeps } from './types.js';

export async function evaluateCondition(
  _rule: AutomationRule,
  _deps: AutomationDeps,
): Promise<boolean> {
  // Stub: evaluate condition against current state
  return false;
}

export async function executeAction(
  _rule: AutomationRule,
  _deps: AutomationDeps,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  // Stub: execute the action
  return { success: true, txHash: '0xstub' };
}

export function validateAutomation(rule: Partial<AutomationRule>): string[] {
  const errors: string[] = [];

  if (!rule.name) errors.push('Automation name is required');
  if (!rule.condition) errors.push('Condition is required');
  if (!rule.action) errors.push('Action is required');

  if (rule.condition) {
    if (!rule.condition.type) errors.push('Condition type is required');
    if (!rule.condition.operator) errors.push('Condition operator is required');
    if (!rule.condition.value) errors.push('Condition value is required');
  }

  if (rule.action) {
    if (!rule.action.type) errors.push('Action type is required');
  }

  return errors;
}
