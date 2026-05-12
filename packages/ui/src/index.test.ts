import { describe, expect, it } from 'vitest';

describe('@sherpa/ui exports', () => {
  it('imports tokens and components without circular initialization', async () => {
    const card = await import('./ConfirmationCard.js');
    const mod = await import('./index.js');

    expect(typeof card.ConfirmationCard).toBe('function');
    expect(mod.tokens.color.baseBlue).toBe('#0052FF');
    expect(typeof mod.ConfirmationCard).toBe('function');
  });
});
