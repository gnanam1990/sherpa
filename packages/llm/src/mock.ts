/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { LLMRequest, LLMResponse, LLMProvider } from './types.js';
import type { ProviderFn } from './router.js';

/**
 * Deterministic provider for tests / dev. Echoes `user` with a canned
 * response envelope. Never makes a network call.
 */
export function mockProvider(
  provider: LLMProvider = 'gpt-4o-mini',
  reply: (req: LLMRequest) => string = (r) => `mock(${r.task}):${r.user}`,
): ProviderFn {
  return async (req) => {
    const text = reply(req);
    const promptTokens = (req.system.length + req.user.length) / 4;
    const completionTokens = text.length / 4;
    const response: LLMResponse = {
      text,
      usage: {
        provider,
        model: `mock-${provider}`,
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        costUsd: 0,
        latencyMs: 0,
      },
    };
    return response;
  };
}
