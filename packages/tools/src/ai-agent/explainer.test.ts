import { describe, test, expect } from 'vitest';
import { explainConcept } from './explainer.js';

describe('Concept explainer', () => {
  test('explains swap', () => {
    const explanation = explainConcept('swap');
    expect(explanation).toContain('Aerodrome');
  });

  test('explains health factor', () => {
    const explanation = explainConcept('health factor');
    expect(explanation).toContain('liquidation');
  });

  test('returns fallback for unknown topic', () => {
    const explanation = explainConcept('quantum physics');
    expect(explanation).toContain("don't have");
  });
});
