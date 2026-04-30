import { describe, it, expect } from 'vitest';
import { createRouter, mockProvider } from './index.js';

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
