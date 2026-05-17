'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { Toaster } from 'sonner';
import { wagmiConfig } from '../lib/wagmi';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{
            appName: 'Sherpa',
            learnMoreUrl: 'https://github.com/gnanam1990/sherpa',
          }}
          initialChain={8453}
          modalSize="compact"
          showRecentTransactions
          theme={darkTheme({
            accentColor: '#0052ff',
            accentColorForeground: '#ffffff',
            borderRadius: 'small',
            fontStack: 'system',
          })}
        >
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: '1px solid #333',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
