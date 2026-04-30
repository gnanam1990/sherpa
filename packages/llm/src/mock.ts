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
        promptTokens: Math.ceil(promptTokens),
        completionTokens: Math.ceil(completionTokens),
        costUsd: 0,
      },
    };
    return response;
  };
}
