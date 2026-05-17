import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stage2ComingSoon, stage2ComingSoonText } from './Stage2ComingSoon';

describe('Stage2ComingSoon', () => {
  it('renders connected-wallet gating copy for swap', () => {
    render(<Stage2ComingSoon feature="swap" parsedIntent={{ intent: 'SWAP' }} />);

    expect(screen.getByText('Swap needs a connected wallet')).toBeTruthy();
    expect(screen.getByText('Connect wallet')).toBeTruthy();
    expect(screen.getByText(/verified on Base mainnet/)).toBeTruthy();
    expect(screen.getByText(/"SWAP"/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mainnet contracts' })).toBeTruthy();
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

  it('renders mainnet-enabled copy for public Stage 2 pages', () => {
    render(<Stage2ComingSoon feature="swap" mainnetEnabled />);
    expect(screen.getByText('Swap is live on Base')).toBeTruthy();
    expect(screen.getByText('Mainnet live')).toBeTruthy();
    expect(screen.getByText(/live on Base mainnet through the verified SherpaRouter/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mainnet contracts' }).getAttribute('href')).toContain(
      'basescan.org/address/0x00bfef',
    );
  });

  it('builds text summaries for chat responses', () => {
    const text = stage2ComingSoonText('borrow', { intent: 'BORROW' });
    expect(text).toContain('Borrow from Aave - Connect wallet to continue');
    expect(text).toContain('Base mainnet contracts are deployed and verified');
    expect(text).toContain('"BORROW"');
  });
});
