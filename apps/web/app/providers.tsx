'use client';

import { darkTheme } from '@rainbow-me/rainbowkit';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit/components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { Toaster } from 'sonner';
import { wagmiConfig } from '../lib/wagmi';

const rainbowTheme = darkTheme({
  accentColor: '#0052FF',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} modalSize="compact">
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast: 'border border-sherpa-surface2 bg-sherpa-surface text-sherpa-fg',
                actionButton: 'bg-sherpa-blue text-white',
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
