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
