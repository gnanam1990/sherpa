import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BUILDER_CODE,
  getBuilderCodeCapabilities,
  getBuilderCodeDataSuffix,
  getPaymasterCapabilities,
  resolveBuilderCode,
  walletEnv,
  withPaymasterCapabilities,
  withSherpaSendCapabilities,
} from './wagmi';

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
        builderCode: expect.any(String),
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

  it('does not attach the Sepolia paymaster to Base mainnet Stage 2 batches', () => {
    expect(
      withPaymasterCapabilities(
        {
          chainId: 8453,
          capabilities: { atomic: { status: 'supported' } },
        },
        '/api/paymaster',
        PUBLIC_LOCATION,
      ),
    ).toEqual({
      chainId: 8453,
      capabilities: { atomic: { status: 'supported' } },
    });
  });

  it('builds ERC-8021 dataSuffix capabilities from the public builder code', () => {
    const dataSuffix = getBuilderCodeDataSuffix('bc_test');

    expect(dataSuffix).toBe('0x62635f74657374070080218021802180218021802180218021');
    expect(getBuilderCodeCapabilities('bc_test')).toEqual({
      dataSuffix: {
        value: dataSuffix,
        optional: true,
      },
    });
  });

  it('omits builder code attribution when an explicitly empty code is passed', () => {
    expect(getBuilderCodeDataSuffix('')).toBeUndefined();
    expect(getBuilderCodeCapabilities('   ')).toBeUndefined();
  });

  it('falls back to the canonical Sherpa builder code when no env override is set', () => {
    expect(resolveBuilderCode('')).toBe(DEFAULT_BUILDER_CODE);
    expect(resolveBuilderCode('   ')).toBe(DEFAULT_BUILDER_CODE);
    expect(resolveBuilderCode('bc_custom')).toBe('bc_custom');
  });

  it('attributes sends to the default builder code when NEXT_PUBLIC_BUILDER_CODE is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_BUILDER_CODE', '');

    expect(
      withSherpaSendCapabilities(
        { capabilities: { atomic: { status: 'supported' } } },
        { location: PUBLIC_LOCATION, paymasterUrl: '/api/paymaster' },
      ),
    ).toEqual({
      capabilities: {
        atomic: { status: 'supported' },
        dataSuffix: {
          value: getBuilderCodeDataSuffix(DEFAULT_BUILDER_CODE),
          optional: true,
        },
        paymasterService: { url: `${PUBLIC_ORIGIN}/api/paymaster` },
      },
    });
  });

  it('combines builder code attribution with the proxy paymaster capability', () => {
    const dataSuffix = getBuilderCodeDataSuffix('bc_test');

    expect(
      withSherpaSendCapabilities(
        { capabilities: { atomic: { status: 'supported' } } },
        {
          builderCode: 'bc_test',
          location: PUBLIC_LOCATION,
          paymasterUrl: '/api/paymaster',
        },
      ),
    ).toEqual({
      capabilities: {
        atomic: { status: 'supported' },
        dataSuffix: {
          value: dataSuffix,
          optional: true,
        },
        paymasterService: { url: `${PUBLIC_ORIGIN}/api/paymaster` },
      },
    });
  });
});
