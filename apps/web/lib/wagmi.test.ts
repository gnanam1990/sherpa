import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPaymasterCapabilities, walletEnv, withPaymasterCapabilities } from './wagmi';

const PUBLIC_ORIGIN = 'https://sherpa.example';
const PUBLIC_LOCATION = { origin: PUBLIC_ORIGIN, hostname: 'sherpa.example' } as Location;
const LOCAL_LOCATION = { origin: 'http://localhost:3000', hostname: 'localhost' } as Location;

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

  it('builds absolute paymaster capabilities for wallet_sendCalls', () => {
    expect(getPaymasterCapabilities('/api/paymaster', PUBLIC_LOCATION)).toEqual({
      paymasterService: { url: `${PUBLIC_ORIGIN}/api/paymaster` },
    });
  });

  it('omits paymaster capabilities on localhost because Coinbase cannot reach it', () => {
    expect(getPaymasterCapabilities('/api/paymaster', LOCAL_LOCATION)).toBeUndefined();
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
    expect(getFreshCapabilities('/api/paymaster', PUBLIC_LOCATION)).toEqual({
      paymasterService: { url: `${PUBLIC_ORIGIN}/api/paymaster` },
    });
    expect(serializedConfig).not.toContain(providerHost);
    expect(serializedConfig).not.toMatch(/https?:\/\/[^"]*paymaster/i);
  });

  it('uses the proxy paymaster capability over API-returned values', () => {
    expect(
      withPaymasterCapabilities({
        capabilities: { paymasterService: { url: 'https://server-paymaster.example' } },
      }, '/api/paymaster', PUBLIC_LOCATION),
    ).toEqual({
      capabilities: { paymasterService: { url: `${PUBLIC_ORIGIN}/api/paymaster` } },
    });
  });
});
