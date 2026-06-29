/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/* Legacy /alerts page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { AlertsPanel } from '../_components/AutomationPanels';

export default function AlertsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <AlertsPanel />
      </div>
    </AppShell>
  );
}
