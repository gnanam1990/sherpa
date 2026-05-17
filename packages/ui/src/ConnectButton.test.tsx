import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectButton } from './ConnectButton.js';

type RainbowRenderProps = {
  account?: { displayName: string };
  chain?: { unsupported?: boolean };
  mounted: boolean;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
};

const mockState = vi.hoisted(() => ({
  account: undefined as RainbowRenderProps['account'],
  chain: undefined as RainbowRenderProps['chain'],
  mounted: true,
  openAccountModal: vi.fn(),
  openChainModal: vi.fn(),
  openConnectModal: vi.fn(),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: RainbowRenderProps) => ReactNode }) =>
      children({
        account: mockState.account,
        chain: mockState.chain,
        mounted: mockState.mounted,
        openAccountModal: mockState.openAccountModal,
        openChainModal: mockState.openChainModal,
        openConnectModal: mockState.openConnectModal,
      }),
  },
}));

describe('ConnectButton', () => {
  beforeEach(() => {
    mockState.account = undefined;
    mockState.chain = undefined;
    mockState.mounted = true;
    mockState.openAccountModal.mockReset();
    mockState.openChainModal.mockReset();
    mockState.openConnectModal.mockReset();
  });

  it('opens the RainbowKit wallet modal when disconnected', () => {
    render(<ConnectButton variant="compact" />);

    const button = screen.getByRole('button', { name: 'Connect' });
    fireEvent.click(button);

    expect(mockState.openConnectModal).toHaveBeenCalledTimes(1);
  });

  it('uses the hero label for the primary connect surface', () => {
    render(<ConnectButton variant="hero" />);

    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeInTheDocument();
  });

  it('opens the account modal when connected', () => {
    mockState.account = { displayName: '0x1234...7890' };
    mockState.chain = { unsupported: false };
    render(<ConnectButton variant="compact" />);

    const button = screen.getByRole('button', { name: '0x1234...7890' });
    fireEvent.click(button);

    expect(mockState.openAccountModal).toHaveBeenCalledTimes(1);
  });

  it('opens the chain modal when the wallet is on an unsupported network', () => {
    mockState.account = { displayName: '0x1234...7890' };
    mockState.chain = { unsupported: true };
    render(<ConnectButton variant="compact" />);

    const button = screen.getByRole('button', { name: 'Unsupported network' });
    fireEvent.click(button);

    expect(mockState.openChainModal).toHaveBeenCalledTimes(1);
  });

  it('stays disabled until RainbowKit is mounted', () => {
    mockState.mounted = false;
    render(<ConnectButton variant="compact" />);

    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });
});
