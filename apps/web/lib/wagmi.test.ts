import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPaymasterCapabilities, walletEnv, withPaymasterCapabilities } from './wagmi';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('wagmi wallet config', () => {
  it('references only public wallet environment keys', () => {
    expect(walletEnv).toEqual(
      expect.objectContaining({
        walletConnectProjectId: expect.any(String),
        coinbaseProjectId: expect.any(String),
      }),
    );
    expect(walletEnv).not.toHaveProperty('paymasterRpc');
  });

  it('builds relative paymaster capabilities for wallet_sendCalls', () => {
    expect(getPaymasterCapabilities()).toEqual({
      paymasterService: { url: '/api/paymaster' },
    });
  });

  it('omits paymaster capabilities when paymaster is disabled', () => {
    expect(getPaymasterCapabilities('')).toBeUndefined();
  });

  it('does not expose paymaster provider URLs through wagmi config', async () => {
    vi.resetModules();
    const unsafeEnvKey = ['NEXT', 'PUBLIC', 'PAYMASTER', 'RPC'].join('_');
    const providerHost = ['api', 'developer', 'coinbase', 'com'].join('.');
    vi.stubEnv(unsafeEnvKey, `https://${providerHost}/rpc/v1/base-sepolia/test-policy`);

    const { getPaymasterCapabilities: getFreshCapabilities, walletEnv: freshWalletEnv } =
      await import('./wagmi');
    const serializedConfig = JSON.stringify({
      walletEnv: freshWalletEnv,
      paymasterCapabilities: getFreshCapabilities(),
    });

    expect(freshWalletEnv).not.toHaveProperty('paymasterRpc');
    expect(getFreshCapabilities()).toEqual({ paymasterService: { url: '/api/paymaster' } });
    expect(serializedConfig).not.toContain(providerHost);
    expect(serializedConfig).not.toMatch(/https?:\/\/[^"]*paymaster/i);
  });

  it('uses the proxy paymaster capability over API-returned values', () => {
    expect(
      withPaymasterCapabilities({
        capabilities: { paymasterService: { url: 'https://server-paymaster.example' } },
      }),
    ).toEqual({ capabilities: { paymasterService: { url: '/api/paymaster' } } });
  });
});
