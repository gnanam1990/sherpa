/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { SherpaClientConfig, ParseRequest, ParseResponse, PlanRequest, PlanResponse, WebhookConfig } from './types.js';

export class SherpaClient {
  private config: SherpaClientConfig;
  private fetchFn: typeof fetch;

  constructor(config: SherpaClientConfig, deps?: { fetch?: typeof fetch }) {
    this.config = config;
    this.fetchFn = deps?.fetch ?? fetch;
  }

  async parse(request: ParseRequest): Promise<ParseResponse> {
    const res = await this.fetchFn(`${this.config.baseUrl}/api/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });
    return res.json() as Promise<ParseResponse>;
  }

  async plan(request: PlanRequest): Promise<PlanResponse> {
    const res = await this.fetchFn(`${this.config.baseUrl}/api/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });
    return res.json() as Promise<PlanResponse>;
  }

  async getBalance(address: `0x${string}`): Promise<{ balance: string; symbol: string }> {
    const res = await this.fetchFn(`${this.config.baseUrl}/api/balance/${address}`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
    });
    return res.json() as Promise<{ balance: string; symbol: string }>;
  }

  async createWebhook(config: WebhookConfig): Promise<{ id: string; secret: string }> {
    const res = await this.fetchFn(`${this.config.baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(config),
    });
    return res.json() as Promise<{ id: string; secret: string }>;
  }
}

export function createSherpaClient(config: SherpaClientConfig): SherpaClient {
  return new SherpaClient(config);
}
