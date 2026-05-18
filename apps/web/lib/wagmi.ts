'use client';

import { createConfig, createStorage, http, noopStorage, useSendCalls, useWaitForCallsStatus } from 'wagmi';
import type { UseSendCallsParameters, UseWaitForCallsStatusParameters } from 'wagmi';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base, baseSepolia } from 'wagmi/chains';
import { Attribution } from 'ox/erc8021';

export const walletEnv = {
  walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'sherpa-dev-walletconnect',
  coinbaseProjectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '',
  builderCode: process.env.NEXT_PUBLIC_BUILDER_CODE ?? '',
} as const;

// Paymaster proxy in apps/api keeps the real URL server-side. See docs/sherpa/devlog/2026-05-15-m2-week-1-priority-1.md
const PAYMASTER_PROXY_URL = '/api/paymaster';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        coinbaseWallet,
        rabbyWallet,
        metaMaskWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'Sherpa',
    appDescription: 'Natural-language agent for Base.',
    appIcon: 'https://sherpa-web.vercel.app/icon-192.png',
    appUrl: 'https://sherpa-web.vercel.app',
    projectId: walletEnv.walletConnectProjectId,
  },
);

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors,
  ssr: true,
  storage: createStorage({ storage: noopStorage }),
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

type PaymasterLocation = Pick<Location, 'origin' | 'hostname'>;
type SendCallsVariables = { capabilities?: Record<string, unknown>; chainId?: number };
type SherpaCapabilityOptions = {
  builderCode?: string;
  location?: PaymasterLocation;
  paymasterUrl?: string;
};

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
  Variables extends SendCallsVariables,
>(
  variables: Variables,
  paymasterUrl = PAYMASTER_PROXY_URL,
  location?: PaymasterLocation,
): Variables {
  if (variables.chainId && variables.chainId !== baseSepolia.id) return variables;
  const paymasterCapabilities = getPaymasterCapabilities(paymasterUrl, location);
  return {
    ...variables,
    capabilities: {
      ...(variables.capabilities ?? {}),
      ...(paymasterCapabilities ?? {}),
    },
  };
}

export function getBuilderCodeDataSuffix(
  builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE,
): `0x${string}` | undefined {
  const code = builderCode?.trim();
  if (!code) return undefined;
  return Attribution.toDataSuffix({ codes: [code] }) as `0x${string}`;
}

export function getBuilderCodeCapabilities(builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE) {
  const dataSuffix = getBuilderCodeDataSuffix(builderCode);
  if (!dataSuffix) return undefined;

  return {
    dataSuffix: {
      value: dataSuffix,
      optional: true,
    },
  };
}

export function withBuilderCodeCapabilities<
  Variables extends SendCallsVariables,
>(variables: Variables, builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE): Variables {
  const builderCodeCapabilities = getBuilderCodeCapabilities(builderCode);
  if (!builderCodeCapabilities) return variables;

  return {
    ...variables,
    capabilities: {
      ...(variables.capabilities ?? {}),
      ...builderCodeCapabilities,
    },
  };
}

export function withSherpaSendCapabilities<
  Variables extends SendCallsVariables,
>(variables: Variables, options: SherpaCapabilityOptions = {}): Variables {
  const withBuilderCode = withBuilderCodeCapabilities(variables, options.builderCode);
  return withPaymasterCapabilities(withBuilderCode, options.paymasterUrl, options.location);
}

export function useSherpaSendCalls(parameters?: UseSendCallsParameters<typeof wagmiConfig>) {
  const mutation = useSendCalls(parameters);

  return {
    ...mutation,
    sendSponsoredCalls: (
      variables: Parameters<typeof mutation.sendCalls>[0],
      options?: Parameters<typeof mutation.sendCalls>[1],
    ) => mutation.sendCalls(withSherpaSendCapabilities(variables), options),
    sendSponsoredCallsAsync: (
      variables: Parameters<typeof mutation.sendCallsAsync>[0],
      options?: Parameters<typeof mutation.sendCallsAsync>[1],
    ) => mutation.sendCallsAsync(withSherpaSendCapabilities(variables), options),
  };
}

export function useSherpaCallsStatus(
  parameters: UseWaitForCallsStatusParameters<typeof wagmiConfig>,
) {
  return useWaitForCallsStatus(parameters);
}
