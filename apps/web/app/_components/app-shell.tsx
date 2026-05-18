'use client';

import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { RightPanel } from './right-panel';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

type AppShellProps = {
  children: ReactNode;
  hideRightPanel?: boolean;
  rightPanel?: ReactNode;
};

export function AppShell({ children, hideRightPanel = false, rightPanel }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div
        className={`grid min-h-[100dvh] grid-cols-1 md:grid-cols-[232px_minmax(0,1fr)] ${
          hideRightPanel
            ? ''
            : 'lg:grid-cols-[232px_minmax(0,1fr)_minmax(260px,300px)]'
        }`}
      >
        <Sidebar />
        <main id="main-content" className="min-w-0 border-border md:border-l-0 lg:border-x">
          <TopBar />
          <div className="px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-8">{children}</div>
        </main>
        {!hideRightPanel ? (
          <div className="hidden min-w-0 border-l border-border lg:block">
            {rightPanel ?? <RightPanel />}
          </div>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
