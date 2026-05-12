'use client';

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, createStorage, http, noopStorage, useSendCalls } from 'wagmi';
import type { UseSendCallsParameters } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export const walletEnv = {
  walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'sherpa-dev-walletconnect',
  coinbaseProjectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '',
  paymasterRpc: process.env.NEXT_PUBLIC_PAYMASTER_RPC ?? '',
} as const;

coinbaseWallet.preference = 'smartWalletOnly';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet],
    },
  ],
  {
    appName: 'Sherpa',
    appDescription: 'The natural-language Base agent.',
    projectId: walletEnv.walletConnectProjectId,
  },
);

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  ssr: true,
  storage: createStorage({ storage: noopStorage }),
  transports: {
    [baseSepolia.id]: http(),
  },
});

export function getPaymasterCapabilities(url = walletEnv.paymasterRpc) {
  if (!url) return undefined;
  return {
    paymasterService: { url },
  };
}

export function withPaymasterCapabilities<
  Variables extends { capabilities?: Record<string, unknown> },
>(variables: Variables, paymasterRpc = walletEnv.paymasterRpc): Variables {
  const paymasterCapabilities = getPaymasterCapabilities(paymasterRpc);
  return {
    ...variables,
    capabilities: {
      ...(paymasterCapabilities ?? {}),
      ...(variables.capabilities ?? {}),
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
