import { describe, expect, it } from 'vitest';
import { getPaymasterCapabilities, walletEnv, withPaymasterCapabilities } from './wagmi';

describe('wagmi wallet config', () => {
  it('references all public wallet environment keys', () => {
    expect(walletEnv).toEqual(
      expect.objectContaining({
        walletConnectProjectId: expect.any(String),
        coinbaseProjectId: expect.any(String),
        paymasterRpc: expect.any(String),
      }),
    );
  });

  it('builds paymaster capabilities for wallet_sendCalls', () => {
    expect(getPaymasterCapabilities('https://paymaster.example')).toEqual({
      paymasterService: { url: 'https://paymaster.example' },
    });
  });

  it('preserves API-returned paymaster capabilities over the client fallback', () => {
    expect(
      withPaymasterCapabilities(
        { capabilities: { paymasterService: { url: 'https://server-paymaster.example' } } },
        'https://client-paymaster.example',
      ),
    ).toEqual({ capabilities: { paymasterService: { url: 'https://server-paymaster.example' } } });
  });
});
