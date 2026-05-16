import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeatureRoadmap } from './FeatureRoadmap';

describe('FeatureRoadmap', () => {
  it('shows live, read-only, audit-pending, and coming statuses', () => {
    render(<FeatureRoadmap />);

    expect(screen.getByText('Send tokens')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Aave positions')).toBeTruthy();
    expect(screen.getByText('Read-only live')).toBeTruthy();
    expect(screen.getAllByText('Audit pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });

  it('links visible Stage 2 surfaces to their pages', () => {
    render(<FeatureRoadmap />);

    expect(screen.getByText('Aave positions').closest('a')?.getAttribute('href')).toBe('/positions');
    expect(screen.getByText('Swap').closest('a')?.getAttribute('href')).toBe('/swap');
    expect(screen.getByText('Lend / Withdraw').closest('a')?.getAttribute('href')).toBe('/lend');
    expect(screen.getByText('Borrow / Repay').closest('a')?.getAttribute('href')).toBe('/borrow');
  });

  it('links to source and Sepolia contracts', () => {
    render(<FeatureRoadmap />);

    expect(screen.getByRole('link', { name: 'Source' }).getAttribute('href')).toBe(
      'https://github.com/gnanam1990/sherpa',
    );
    expect(screen.getByRole('link', { name: 'Sepolia contracts' }).getAttribute('href')).toContain(
      'sepolia.basescan.org/address/0xDfe689',
    );
  });
});
