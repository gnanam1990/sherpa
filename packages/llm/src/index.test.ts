import { describe, it, expect } from 'vitest';
import {
  anthropicProvider,
  createRouter,
  groqProvider,
  mockProvider,
  openaiProvider,
} from './index.js';

describe('llm/router', () => {
  it('routes via preferred-task order when providers are configured', async () => {
    let flaky = 0;
    const router = createRouter({
      providers: {
        'gpt-4o-mini': async () => {
          flaky += 1;
          throw new Error('down');
        },
        'groq-llama': mockProvider('groq-llama', () => 'ok-from-groq'),
      },
    });
    const out = await router.complete({ task: 'parse', system: 's', user: 'u' });
    expect(out.text).toBe('ok-from-groq');
    expect(out.usage.provider).toBe('groq-llama');
    expect(flaky).toBe(1);
  });

  it('throws when no provider succeeds', async () => {
    const router = createRouter({
      providers: {
        'gpt-4o-mini': async () => {
          throw new Error('x');
        },
      },
    });
    await expect(router.complete({ task: 'parse', system: 's', user: 'u' })).rejects.toThrow(
      /all providers failed/,
    );
  });
});

describe('llm/providers', () => {
  it('openaiProvider hits the chat endpoint with a Bearer token', async () => {
    let captured: { url?: string; headers?: Record<string, string>; body?: string } = {};
    const fetchImpl: typeof fetch = async (input, init) => {
      captured.url = String(input);
      captured.headers = init?.headers as Record<string, string>;
      captured.body = init?.body as string;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"intent":"BALANCE","slots":{},"confidence":1}' } }],
          usage: { prompt_tokens: 12, completion_tokens: 7 },
        }),
        { status: 200 },
      );
    };
    const fn = openaiProvider({ apiKey: 'sk-test', fetchImpl });
    const out = await fn({ task: 'parse', system: 's', user: 'balance' });
    expect(captured.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(captured.headers?.Authorization).toBe('Bearer sk-test');
    expect(out.usage.promptTokens).toBe(12);
    expect(out.usage.costUsd).toBeGreaterThan(0);
  });

  it('groqProvider points at groq endpoint', async () => {
    let url = '';
    const fetchImpl: typeof fetch = async (input) => {
      url = String(input);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{}' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }),
        { status: 200 },
      );
    };
    await groqProvider({ apiKey: 'gsk', fetchImpl })({ task: 'parse', system: 's', user: 'u' });
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('anthropicProvider sends x-api-key + parses content blocks', async () => {
    let captured: { headers?: Record<string, string> } = {};
    const fetchImpl: typeof fetch = async (_input, init) => {
      captured.headers = init?.headers as Record<string, string>;
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'hello' }],
          usage: { input_tokens: 3, output_tokens: 2 },
        }),
        { status: 200 },
      );
    };
    const out = await anthropicProvider({ apiKey: 'sk-ant', fetchImpl })({
      task: 'parse',
      system: 's',
      user: 'u',
    });
    expect(captured.headers?.['x-api-key']).toBe('sk-ant');
    expect(out.text).toBe('hello');
    expect(out.usage.provider).toBe('claude-haiku');
  });

  it('throws on non-2xx', async () => {
    const fetchImpl: typeof fetch = async () => new Response('rate limited', { status: 429 });
    await expect(
      openaiProvider({ apiKey: 'k', fetchImpl })({ task: 'parse', system: 's', user: 'u' }),
    ).rejects.toThrow(/429/);
  });
});
