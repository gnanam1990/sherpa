'use client';


/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { Toaster } from 'sonner';
import { wagmiConfig } from '../lib/wagmi';
import { ThemeProvider } from './_components/theme-provider';

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
          <ThemeProvider>
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
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
