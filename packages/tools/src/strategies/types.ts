/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type StrategyMetadata = {
  id: string;
  name: string;
  description: string;
  creator: `0x${string}`;
  chainId: number;
  visibility: 'public' | 'private' | 'unlisted';
  version: number;
  followers: number;
  totalVolume: string;
  successRate: number;
  tags: string[];
};

export type StrategyExecution = {
  strategyId: string;
  userId: `0x${string}`;
  parameters: Record<string, string>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: StrategyStepResult[];
};

export type StrategyStepResult = {
  intent: string;
  status: 'success' | 'failed' | 'skipped';
  txHash?: string;
  error?: string;
};

export type StrategyDeps = {
  apiUrl?: string;
};
