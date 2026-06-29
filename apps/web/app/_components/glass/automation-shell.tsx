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

import type { ReactNode } from 'react';
import { AppFrame } from './app-frame';
import { TopBar } from './top-bar';
import { useGlassTopBar } from './top-bar-data';
import { GlassPanel } from './primitives';

/**
 * Glass Aurora automation shell.
 *
 * The automation routes (/dca, /alerts, /auto-repay) are dense config
 * forms with a behaviour-pinned test contract (AlertsPanel). Per the
 * approved approach we keep those proven panels exactly as-is and only
 * dress them in the Glass shell — real aurora/top-bar chrome for the
 * narrative screenshots, zero behaviour change, zero risk to the
 * contract. The panel renders its own SetupShell header inside the
 * GlassPanel.
 */
export function GlassAutomationShell({ children }: { children: ReactNode }) {
  const top = useGlassTopBar();
  return (
    <AppFrame>
      <TopBar
        account={top.account}
        chain={top.chain}
        live={top.live}
        onDisconnect={top.onDisconnect}
        right={top.right}
      />
      <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="mx-auto w-full max-w-4xl">
          <GlassPanel className="p-5 sm:p-6">{children}</GlassPanel>
        </div>
      </div>
    </AppFrame>
  );
}
