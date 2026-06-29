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
import { AuroraBackground } from './background/aurora-background';
import { IconRail } from './icon-rail';
import type { IconRailProps } from './icon-rail';
import { MobileNav } from './mobile-nav';

/**
 * Glass Aurora app shell.
 *
 * Composes the atmospheric background, the left {@link IconRail}, and a
 * content `main`. It owns no state and no data — route awareness lives in
 * the rail/top-bar via the URL. Pure composition (server-renderable); the
 * client boundary is the rail itself.
 *
 * This is the Glass Aurora analogue of the legacy `AppShell`; it is NOT
 * applied to any page in Phase 2 (library only).
 */
export interface AppFrameProps {
  children: ReactNode;
  /** Hide the left rail (e.g. focused/embedded surfaces). Default `false`. */
  hideRail?: boolean;
  /** Props forwarded to {@link IconRail} (badges, footer, stage tags). */
  railProps?: IconRailProps;
}

export function AppFrame({
  children,
  hideRail = false,
  railProps,
}: AppFrameProps) {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden text-[#F8FAFF]">
      <AuroraBackground />
      <div className="relative z-10 flex h-full w-full overflow-hidden">
        {!hideRail && (
          <>
            <IconRail
              {...railProps}
              className={`hidden sm:flex ${railProps?.className ?? ''}`}
            />
            <MobileNav railProps={railProps} />
          </>
        )}
        <main
          id="main-content"
          className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
