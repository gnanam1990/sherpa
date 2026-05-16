import { describe, test, expect } from 'vitest';

// Component tests for ChainSelector — testing the logic without rendering
// Full render tests would require @testing-library/react

describe('ChainSelector logic', () => {
  test('SUPPORTED_CHAINS has 4 chains', async () => {
    const { SUPPORTED_CHAINS } = await import('./ChainSelector.js');
    expect(SUPPORTED_CHAINS.length).toBe(4);
  });

  test('SUPPORTED_CHAINS includes base', async () => {
    const { SUPPORTED_CHAINS } = await import('./ChainSelector.js');
    const base = SUPPORTED_CHAINS.find((c) => c.id === 8453);
    expect(base).toBeDefined();
    expect(base!.name).toBe('Base');
  });

  test('SUPPORTED_CHAINS includes polygon', async () => {
    const { SUPPORTED_CHAINS } = await import('./ChainSelector.js');
    const polygon = SUPPORTED_CHAINS.find((c) => c.id === 137);
    expect(polygon).toBeDefined();
    expect(polygon!.name).toBe('Polygon');
  });

  test('SUPPORTED_CHAINS includes optimism', async () => {
    const { SUPPORTED_CHAINS } = await import('./ChainSelector.js');
    const op = SUPPORTED_CHAINS.find((c) => c.id === 10);
    expect(op).toBeDefined();
    expect(op!.name).toBe('Optimism');
  });

  test('SUPPORTED_CHAINS includes arbitrum', async () => {
    const { SUPPORTED_CHAINS } = await import('./ChainSelector.js');
    const arb = SUPPORTED_CHAINS.find((c) => c.id === 42161);
    expect(arb).toBeDefined();
    expect(arb!.name).toBe('Arbitrum');
  });

  test('CHAIN_COLORS has colors for all chains', async () => {
    const { CHAIN_COLORS } = await import('./ChainSelector.js');
    expect(CHAIN_COLORS[8453]).toBeDefined();
    expect(CHAIN_COLORS[137]).toBeDefined();
    expect(CHAIN_COLORS[10]).toBeDefined();
    expect(CHAIN_COLORS[42161]).toBeDefined();
  });
});
