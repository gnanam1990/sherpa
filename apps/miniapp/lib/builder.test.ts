import { describe, test, expect } from 'vitest';
import { getBuilderDataSuffix, BUILDER_CODE } from './builder.js';

// P1-4: NEXT_PUBLIC_BUILDER_CODE must be wired into transaction dataSuffix

describe('builder code attribution (P1-4)', () => {
  test('BUILDER_CODE falls back to hardcoded value when env not set', () => {
    expect(BUILDER_CODE).toBe('bc_97ju6eu2');
  });

  test('getBuilderDataSuffix returns a 0x-prefixed hex string', () => {
    const suffix = getBuilderDataSuffix();
    expect(suffix).toMatch(/^0x[0-9a-f]+$/);
  });

  test('dataSuffix decodes back to builder code', () => {
    const suffix = getBuilderDataSuffix();
    const hex = suffix.slice(2);
    const decoded = new TextDecoder().decode(
      new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16))),
    );
    expect(decoded).toBe(BUILDER_CODE);
  });

  test('dataSuffix is non-empty', () => {
    const suffix = getBuilderDataSuffix();
    expect(suffix.length).toBeGreaterThan(2);
  });
});
