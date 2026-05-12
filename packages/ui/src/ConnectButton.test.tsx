import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectButton } from './ConnectButton.js';

const rainbowState = vi.hoisted(() => ({
  connected: false,
  openAccountModal: vi.fn(),
  openConnectModal: vi.fn(),
}));

vi.mock('@rainbow-me/rainbowkit/components', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: unknown) => React.ReactNode }) =>
      children(
        rainbowState.connected
          ? {
              account: { address: '0x1234567890123456789012345678901234567890' },
              chain: { id: 84532, unsupported: false },
              mounted: true,
              openAccountModal: rainbowState.openAccountModal,
              openConnectModal: rainbowState.openConnectModal,
              openChainModal: vi.fn(),
            }
          : {
              account: undefined,
              chain: undefined,
              mounted: true,
              openAccountModal: rainbowState.openAccountModal,
              openConnectModal: rainbowState.openConnectModal,
              openChainModal: vi.fn(),
            },
      ),
  },
}));

describe('ConnectButton', () => {
  it('renders a compact connect button when disconnected', () => {
    rainbowState.connected = false;
    render(<ConnectButton variant="compact" />);

    const button = screen.getByRole('button', { name: 'Connect' });
    fireEvent.click(button);

    expect(document.body.contains(button)).toBe(true);
    expect(rainbowState.openConnectModal).toHaveBeenCalledTimes(1);
  });

  it('renders a truncated address when connected', () => {
    rainbowState.connected = true;
    render(<ConnectButton variant="compact" />);

    expect(document.body.contains(screen.getByRole('button', { name: '0x1234...7890' }))).toBe(
      true,
    );
  });
});
