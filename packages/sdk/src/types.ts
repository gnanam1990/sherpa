/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export interface SherpaClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface ParseRequest {
  input: string;
  walletAddress?: `0x${string}`;
}

export interface ParseResponse {
  intent: string;
  params: Record<string, unknown>;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PlanRequest {
  intent: string;
  params: Record<string, unknown>;
}

export interface PlanResponse {
  steps: string[];
  estimatedGas?: string;
  confirmationCard?: Record<string, unknown>;
}

export interface BalanceResponse {
  address: string;
  ethWei: string;
  ethDisplay: string;
  usdcBaseUnits: string;
  usdcDisplay: string;
}

export interface PositionResponse {
  address: string;
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  healthFactor: string;
  hasPosition: boolean;
}

export interface PortfolioResponse {
  address: string;
  chains: Array<{
    chainId: number;
    chainName: string;
    tokens: Array<{
      symbol: string;
      balance: string;
      valueUsd: string;
      priceUsd: number;
    }>;
    totalValueUsd: string;
  }>;
  totalValueUsd: string;
  lastUpdated: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  usageCount: number;
  createdAt: number;
  expiresAt?: number;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  failureCount: number;
}

export interface SafetyCheckRequest {
  to: string;
  data: string;
  value?: string;
}

export interface SafetyCheckResponse {
  safe: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  ringResults: Array<{ ring: number; passed: boolean; detail?: string }>;
}

/** Sherpa surfaces (signing-token flow). */
export type Surface = 'telegram' | 'farcaster' | 'web' | 'mcp';

export interface SignIntentRequest {
  surface: Surface;
  surfaceUserId: string;
  intent: Record<string, unknown>;
}

export interface SignIntentResponse {
  token: string;
  /** Where the user opens their Base Account to review and sign. */
  signUrl: string;
  expiresAt: string;
}
