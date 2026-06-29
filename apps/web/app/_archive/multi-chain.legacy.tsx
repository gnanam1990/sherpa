/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/* Legacy /multi-chain page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import Link from 'next/link';
import { MultiChainPanel } from '../_components/AutomationPanels';

export default function MultiChainPage() {
  return (
    <main className="min-h-[100dvh] bg-sherpa-bg px-4 py-8 text-sherpa-fg sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm text-sherpa-muted transition hover:text-sherpa-fg" href="/">
          Back to Sherpa
        </Link>
        <div className="mt-6">
          <MultiChainPanel />
        </div>
      </div>
    </main>
  );
}
