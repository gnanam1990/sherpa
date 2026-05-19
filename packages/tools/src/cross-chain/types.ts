/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type CrossChainRoute = {
  sourceChain: string;
  destinationChain: string;
  bridgeProtocol: string;
  estimatedTime: number;
  fee: bigint;
  minAmount: bigint;
  maxAmount: bigint;
};

export type CrossChainStep = {
  chain: string;
  action: string;
  protocol: string;
  estimatedTime: number;
};

export type OrchestratedTx = {
  steps: CrossChainStep[];
  totalTime: number;
  totalFee: bigint;
  status: 'pending' | 'bridging' | 'executing' | 'completed' | 'failed';
};

export type CrossChainDeps = {
  chains: string[];
};
