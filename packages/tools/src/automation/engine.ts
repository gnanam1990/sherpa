/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { AutomationRule, AutomationDeps } from './types.js';

export async function evaluateCondition(
  _rule: AutomationRule,
  _deps: AutomationDeps,
): Promise<boolean> {
  // Safe default: without an injected oracle/scheduler state, no condition is met.
  return false;
}

export async function executeAction(
  _rule: AutomationRule,
  _deps: AutomationDeps,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  return { success: false, error: 'automation_execution_not_configured' };
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
