import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HealthFactorBadge, healthFactorLabel } from './HealthFactorBadge';

describe('HealthFactorBadge', () => {
  it('renders no-debt state for null', () => {
    render(<HealthFactorBadge hf={null} />);
    expect(screen.getByText('HF ∞ · No debt')).toBeTruthy();
  });

  it('renders no-debt state for max uint', () => {
    render(<HealthFactorBadge hf={2n ** 256n - 1n} />);
    expect(screen.getByText('HF ∞ · No debt')).toBeTruthy();
  });

  it('labels safe health factors', () => {
    expect(healthFactorLabel(2_000_000_000_000_000_000n).label).toBe('HF 2.00 · Safe');
    expect(healthFactorLabel(3_500_000_000_000_000_000n).label).toBe('HF 3.50 · Safe');
  });

  it('labels caution health factors', () => {
    expect(healthFactorLabel(1_500_000_000_000_000_000n).label).toBe('HF 1.50 · Caution');
  });

  it('labels risky health factors', () => {
    expect(healthFactorLabel(1_200_000_000_000_000_000n).label).toBe('HF 1.20 · Risky');
  });

  it('labels danger health factors', () => {
    expect(healthFactorLabel(1_190_000_000_000_000_000n).label).toBe('HF 1.19 · Danger');
  });
});
