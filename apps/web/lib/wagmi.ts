'use client';

import { createConfig, createStorage, http, noopStorage, useSendCalls, useWaitForCallsStatus } from 'wagmi';
import type { UseSendCallsParameters, UseWaitForCallsStatusParameters } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { baseSepolia } from 'wagmi/chains';

export const walletEnv = {
  walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'sherpa-dev-walletconnect',
  coinbaseProjectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '',
} as const;

// Paymaster proxy in apps/api keeps the real URL server-side. See docs/sherpa/devlog/2026-05-15-m2-week-1-priority-1.md
const PAYMASTER_PROXY_URL = '/api/paymaster';

const connectors = [
  coinbaseWallet({
    appName: 'Sherpa',
    preference: 'smartWalletOnly',
  }),
];

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  ssr: true,
  storage: createStorage({ storage: noopStorage }),
  transports: {
    [baseSepolia.id]: http(),
  },
});

type PaymasterLocation = Pick<Location, 'origin' | 'hostname'>;

export function getPaymasterCapabilities(
  url = PAYMASTER_PROXY_URL,
  location: PaymasterLocation | undefined = typeof window === 'undefined' ? undefined : window.location,
) {
  if (!url) return undefined;
  if (!location) return undefined;

  const { origin, hostname } = location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined;

  const absoluteUrl = url.startsWith('http') ? url : `${origin}${url}`;
  return {
    paymasterService: { url: absoluteUrl },
  };
}

export function withPaymasterCapabilities<
  Variables extends { capabilities?: Record<string, unknown> },
>(
  variables: Variables,
  paymasterUrl = PAYMASTER_PROXY_URL,
  location?: PaymasterLocation,
): Variables {
  const paymasterCapabilities = getPaymasterCapabilities(paymasterUrl, location);
  return {
    ...variables,
    capabilities: {
      ...(variables.capabilities ?? {}),
      ...(paymasterCapabilities ?? {}),
    },
  };
}

export function useSherpaSendCalls(parameters?: UseSendCallsParameters<typeof wagmiConfig>) {
  const mutation = useSendCalls(parameters);

  return {
    ...mutation,
    sendSponsoredCalls: (
      variables: Parameters<typeof mutation.sendCalls>[0],
      options?: Parameters<typeof mutation.sendCalls>[1],
    ) => mutation.sendCalls(withPaymasterCapabilities(variables), options),
    sendSponsoredCallsAsync: (
      variables: Parameters<typeof mutation.sendCallsAsync>[0],
      options?: Parameters<typeof mutation.sendCallsAsync>[1],
    ) => mutation.sendCallsAsync(withPaymasterCapabilities(variables), options),
  };
}

export function useSherpaCallsStatus(
  parameters: UseWaitForCallsStatusParameters<typeof wagmiConfig>,
) {
  return useWaitForCallsStatus(parameters);
}
