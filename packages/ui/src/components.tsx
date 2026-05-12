'use client';

import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-start gap-6 bg-sherpa-bg p-8 text-sherpa-fg">
      {children}
    </main>
  );
}
