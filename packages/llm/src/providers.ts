/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';
import type { ProviderFn } from './router.js';

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

const defaultFetch = (input: string, init?: Parameters<FetchLike>[1]) =>
  (globalThis as { fetch: FetchLike }).fetch(input, init);

/**
 * Real provider adapters. All three speak the OpenAI-compatible chat
 * completions shape (Groq's API is a drop-in; Anthropic uses messages
 * but exposes a similar shape — handled separately).
 *
 * Pricing (USD per 1M tokens, May 2026 — keep in sync with M3 cost model):
 *   gpt-4o-mini      0.15 in / 0.60 out
 *   groq-llama       0.05 in / 0.10 out  (Llama-3.3-70B Versatile)
 *   claude-haiku     0.25 in / 1.25 out  (Haiku 4.5)
 */

export type HttpProviderConfig = {
  apiKey: string;
  fetchImpl?: FetchLike;
};

const PRICE: Record<LLMProvider, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'groq-llama': { in: 0.05, out: 0.1 },
  'claude-haiku': { in: 0.25, out: 1.25 },
};

function costUsd(provider: LLMProvider, inTok: number, outTok: number): number {
  const p = PRICE[provider];
  return (inTok * p.in + outTok * p.out) / 1_000_000;
}

type OpenAIChatResponse = {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
};

async function openaiCompatible(
  provider: 'gpt-4o-mini' | 'groq-llama',
  endpoint: string,
  model: string,
  cfg: HttpProviderConfig,
  req: LLMRequest,
): Promise<LLMResponse> {
  const f = cfg.fetchImpl ?? defaultFetch;
  const start = Date.now();
  const res = await f(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  });
  if (!res.ok) {
    throw new Error(`[llm/${provider}] http ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as OpenAIChatResponse;
  const text = json.choices[0]?.message.content ?? '';
  const inTok = json.usage?.prompt_tokens ?? Math.ceil((req.system.length + req.user.length) / 4);
  const outTok = json.usage?.completion_tokens ?? Math.ceil(text.length / 4);
  return {
    text,
    usage: {
      provider,
      model,
      promptTokens: inTok,
      completionTokens: outTok,
      costUsd: costUsd(provider, inTok, outTok),
      latencyMs: Date.now() - start,
    },
  };
}

export function openaiProvider(cfg: HttpProviderConfig): ProviderFn {
  return (req) =>
    openaiCompatible(
      'gpt-4o-mini',
      'https://api.openai.com/v1/chat/completions',
      'gpt-4o-mini',
      cfg,
      req,
    );
}

export function groqProvider(cfg: HttpProviderConfig): ProviderFn {
  return (req) =>
    openaiCompatible(
      'groq-llama',
      'https://api.groq.com/openai/v1/chat/completions',
      'llama-3.3-70b-versatile',
      cfg,
      req,
    );
}

type AnthropicResponse = {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
};

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export function anthropicProvider(cfg: HttpProviderConfig): ProviderFn {
  return async (req) => {
    const f = cfg.fetchImpl ?? defaultFetch;
    const start = Date.now();
    const res = await f('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
        temperature: 0,
      }),
    });
    if (!res.ok) {
      throw new Error(`[llm/anthropic] http ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as AnthropicResponse;
    const text = json.content.find((c) => c.type === 'text')?.text ?? '';
    const inTok =
      json.usage?.input_tokens ?? Math.ceil((req.system.length + req.user.length) / 4);
    const outTok = json.usage?.output_tokens ?? Math.ceil(text.length / 4);
    return {
      text,
      usage: {
        provider: 'claude-haiku',
        model: ANTHROPIC_MODEL,
        promptTokens: inTok,
        completionTokens: outTok,
        costUsd: costUsd('claude-haiku', inTok, outTok),
        latencyMs: Date.now() - start,
      },
    };
  };
}
