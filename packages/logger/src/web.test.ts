import { describe, expect, it } from 'vitest';

describe('@sherpa/logger/web export', () => {
  it('exposes @sherpa/logger/web for browser consumers', async () => {
    const mod = await import('@sherpa/logger/web');

    expect(typeof mod.initWebSentry).toBe('function');
  });
});
