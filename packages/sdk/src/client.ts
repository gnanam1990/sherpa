/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type {
  SherpaClientConfig,
  ParseRequest,
  ParseResponse,
  PlanRequest,
  PlanResponse,
  BalanceResponse,
  PositionResponse,
  PortfolioResponse,
  SafetyCheckRequest,
  SafetyCheckResponse,
  WebhookConfig,
  Webhook,
  ApiKey,
} from './types.js';

export class SherpaClient {
  private config: SherpaClientConfig;
  private fetchFn: typeof fetch;

  constructor(config: SherpaClientConfig, deps?: { fetch?: typeof fetch }) {
    this.config = config;
    this.fetchFn = deps?.fetch ?? fetch;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await this.fetchFn(`${this.config.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Sherpa API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async parse(request: ParseRequest): Promise<ParseResponse> {
    return this.request('/api/parse', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async plan(request: PlanRequest): Promise<PlanResponse> {
    return this.request('/api/plan', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getBalance(address: `0x${string}`): Promise<BalanceResponse> {
    return this.request(`/api/balance/${address}`);
  }

  async getPositions(address: `0x${string}`): Promise<PositionResponse> {
    return this.request(`/api/positions/${address}`);
  }

  async getPortfolio(address: `0x${string}`): Promise<PortfolioResponse> {
    return this.request(`/api/portfolio/${address}`);
  }

  async checkSafety(params: SafetyCheckRequest): Promise<SafetyCheckResponse> {
    return this.request('/api/safety', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createWebhook(config: WebhookConfig): Promise<Webhook> {
    return this.request('/api/developer/webhooks', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async listWebhooks(): Promise<Webhook[]> {
    return this.request('/api/developer/webhooks');
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request(`/api/developer/webhooks/${id}`, {
      method: 'DELETE',
    });
  }

  async createApiKey(params: {
    name: string;
    permissions: string[];
  }): Promise<ApiKey> {
    return this.request('/api/developer/keys', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listApiKeys(): Promise<ApiKey[]> {
    return this.request('/api/developer/keys');
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.request(`/api/developer/keys/${id}`, {
      method: 'DELETE',
    });
  }
}

export function createSherpaClient(config: SherpaClientConfig): SherpaClient {
  return new SherpaClient(config);
}
