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
