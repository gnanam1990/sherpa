/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

'use client';

import type { ReactNode } from 'react';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-start gap-6 bg-sherpa-bg p-8 text-sherpa-fg">
      {children}
    </main>
  );
}
