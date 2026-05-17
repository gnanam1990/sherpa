import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConnectButton } from './ConnectButton.js';

const mockState = vi.hoisted(() => ({
  isConnected: false,
  address: undefined as `0x${string}` | undefined,
  chainId: 84532,
  connect: vi.fn(),
  connectors: [{ id: 'coinbaseWalletSDK', name: 'Coinbase Wallet' }],
  disconnect: vi.fn(),
}));

vi.mock('wagmi', async () => {
  const actual = await vi.importActual<typeof import('wagmi')>('wagmi');
  return {
    ...actual,
    useAccount: () => ({
      address: mockState.address,
      isConnected: mockState.isConnected,
      chain: mockState.isConnected ? { id: mockState.chainId, name: 'Base' } : undefined,
    }),
    useConnect: () => ({
      connect: mockState.connect,
      connectors: mockState.connectors,
      isPending: false,
    }),
    useDisconnect: () => ({ disconnect: mockState.disconnect }),
  };
});

describe('ConnectButton', () => {
  beforeEach(() => {
    mockState.isConnected = false;
    mockState.address = undefined;
    mockState.chainId = 84532;
    mockState.connectors = [{ id: 'coinbaseWalletSDK', name: 'Coinbase Wallet' }];
    mockState.connect.mockReset();
    mockState.disconnect.mockReset();
  });

  it('renders a compact connect button when disconnected', () => {
    mockState.isConnected = false;
    render(<ConnectButton variant="compact" />);

    const button = screen.getByRole('button', { name: 'Connect' });
    expect(button).toBeInTheDocument();
  });

  it('renders a truncated address when connected', () => {
    mockState.isConnected = true;
    mockState.address = '0x1234567890123456789012345678901234567890';
    render(<ConnectButton variant="compact" />);

    expect(screen.getByRole('button', { name: '0x1234...7890' })).toBeInTheDocument();
  });

  it('calls connect with coinbase connector when clicked', () => {
    mockState.isConnected = false;
    render(<ConnectButton variant="compact" />);

    const button = screen.getByRole('button', { name: 'Connect' });
    fireEvent.click(button);

    expect(mockState.connect).toHaveBeenCalledWith({
      connector: expect.objectContaining({ id: 'coinbaseWalletSDK' }),
    });
  });

  it('renders Rabby/browser wallet option when an injected connector is available', () => {
    mockState.connectors = [
      { id: 'coinbaseWalletSDK', name: 'Coinbase Wallet' },
      { id: 'injected', name: 'Rabby Wallet' },
    ];
    render(<ConnectButton variant="compact" />);

    fireEvent.click(screen.getByRole('button', { name: 'Rabby' }));

    expect(mockState.connect).toHaveBeenCalledWith({
      connector: expect.objectContaining({ id: 'injected' }),
    });
  });

  it('treats Base mainnet as a supported connected network', () => {
    mockState.isConnected = true;
    mockState.address = '0x1234567890123456789012345678901234567890';
    mockState.chainId = 8453;
    render(<ConnectButton variant="compact" />);

    expect(screen.getByRole('button', { name: '0x1234...7890' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unsupported network' })).toBeNull();
  });
});
