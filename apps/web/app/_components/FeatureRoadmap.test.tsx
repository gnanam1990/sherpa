import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeatureRoadmap } from './FeatureRoadmap';

describe('FeatureRoadmap', () => {
  it('shows live, read-only, testnet, and beta statuses', () => {
    render(<FeatureRoadmap />);

    expect(screen.getByText('Send tokens')).toBeTruthy();
    expect(screen.getAllByText('Live').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Aave positions')).toBeTruthy();
    expect(screen.getAllByText('Read-only live').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Testnet live').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beta live').length).toBeGreaterThan(0);
    expect(screen.getByText('Telegram bot')).toBeTruthy();
  });

  it('links visible Stage 2 surfaces to their pages', () => {
    render(<FeatureRoadmap />);

    expect(screen.getByText('Aave positions').closest('a')?.getAttribute('href')).toBe(
      '/positions',
    );
    expect(screen.getByText('Swap').closest('a')?.getAttribute('href')).toBe('/swap');
    expect(screen.getByText('Lend / Withdraw').closest('a')?.getAttribute('href')).toBe('/lend');
    expect(screen.getByText('Borrow / Repay').closest('a')?.getAttribute('href')).toBe('/borrow');
    expect(screen.getByText('Alerts').closest('a')?.getAttribute('href')).toBe('/alerts');
    expect(screen.getByText('DCA scheduler').closest('a')?.getAttribute('href')).toBe('/dca');
    expect(screen.getByText('Auto-repay').closest('a')?.getAttribute('href')).toBe('/auto-repay');
    expect(screen.getByText('Telegram bot').closest('a')?.getAttribute('href')).toBe('/telegram');
    expect(screen.getByText('Multi-chain').closest('a')?.getAttribute('href')).toBe('/multi-chain');
    expect(screen.getByText('Governance').closest('a')?.getAttribute('href')).toBe('/governance');
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
