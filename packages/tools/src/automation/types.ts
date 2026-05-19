/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type AutomationRule = {
  id: string;
  name: string;
  condition: Condition;
  action: Action;
  userId: `0x${string}`;
  status: 'active' | 'paused' | 'triggered' | 'failed';
  maxExecutions?: number;
  executionCount: number;
  lastTriggered?: number;
};

export type Condition = {
  type: 'price' | 'balance' | 'health_factor' | 'time' | 'block';
  operator: '>' | '<' | '>=' | '<=' | '==' | 'crosses';
  value: string;
  asset?: string;
};

export type Action = {
  type: string;
  params: Record<string, string>;
};

export type AutomationDeps = {
  chainId: number;
};
