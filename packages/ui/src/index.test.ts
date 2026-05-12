import { describe, expect, it } from 'vitest';

describe('@sherpa/ui exports', () => {
  it('imports tokens and components without circular initialization', async () => {
    const components = await import('./components.js');
    const mod = await import('./index.js');

    expect(typeof components.ConfirmationCard).toBe('function');
    expect(mod.tokens.color.baseBlue).toBe('#0052FF');
    expect(typeof mod.ConfirmationCard).toBe('function');
  });
});
