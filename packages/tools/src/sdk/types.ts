/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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

export interface SherpaClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface ParseRequest {
  input: string;
}

export interface ParseResponse {
  intent: string;
  params: Record<string, unknown>;
}

export interface PlanRequest {
  intent: string;
  params: Record<string, unknown>;
}

export interface PlanResponse {
  steps: string[];
  estimatedGas?: string;
}

export interface SdkDeps {
  fetch?: typeof fetch;
}
