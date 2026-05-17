import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stage2ComingSoon, stage2ComingSoonText } from './Stage2ComingSoon';

describe('Stage2ComingSoon', () => {
  it('renders honest audit-pending copy for swap', () => {
    render(<Stage2ComingSoon feature="swap" parsedIntent={{ intent: 'SWAP' }} />);

    expect(screen.getByText('Swap is coming soon')).toBeTruthy();
    expect(screen.getByText('Audit pending')).toBeTruthy();
    expect(screen.getByText(/Mainnet execution stays disabled/)).toBeTruthy();
    expect(screen.getByText(/"SWAP"/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sepolia contracts' })).toBeTruthy();
  });

  it('renders lend-specific command copy', () => {
    render(<Stage2ComingSoon feature="lend" />);
    expect(screen.getByText(/lend 100 usdc to aave/)).toBeTruthy();
  });

  it('renders testnet-enabled copy for executable demos', () => {
    render(<Stage2ComingSoon feature="swap" testnetEnabled />);
    expect(screen.getByText('Swap is live on testnet')).toBeTruthy();
    expect(screen.getByText('Testnet enabled')).toBeTruthy();
    expect(screen.getByText(/Base Sepolia with small demo amount caps/)).toBeTruthy();
  });

  it('builds text summaries for chat responses', () => {
    const text = stage2ComingSoonText('borrow', { intent: 'BORROW' });
    expect(text).toContain('Borrow from Aave - Coming soon');
    expect(text).toContain('pending external audit');
    expect(text).toContain('"BORROW"');
  });
});
