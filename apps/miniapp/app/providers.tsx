'use client';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base, baseSepolia } from 'viem/chains';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const chain = process.env.NEXT_PUBLIC_SHERPA_CHAIN === 'base-mainnet' ? base : baseSepolia;

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={chain}
      config={{
        appearance: {
          name: 'Sherpa',
          logo: '/icon-512.png',
          mode: 'dark',
          theme: 'default',
        },
      }}
      miniKit={{ enabled: true }}
    >
      {children}
    </OnchainKitProvider>
  );
}
