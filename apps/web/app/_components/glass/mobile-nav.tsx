'use client';

import { useState } from 'react';
import { IconRail } from './icon-rail';
import type { IconRailProps } from './icon-rail';

/**
 * Glass Aurora mobile navigation.
 *
 * The full IconRail has 14 routes — far more than a 4-tab bottom bar can
 * hold honestly. Below `sm` the rail is hidden and replaced by a hamburger
 * that slides the *same* IconRail in as a sheet, so mobile users get the
 * complete navigation with no arbitrary route subset. Hidden at `sm` and
 * up, where the persistent rail is shown instead.
 */
export interface MobileNavProps {
  /** Forwarded to the sheet's IconRail (badges, stage tags, footer). */
  railProps?: Omit<IconRailProps, 'className' | 'onNavigate'>;
}

export function MobileNav({ railProps }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="glass-thin fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="glass-deep relative h-full animate-fade-in">
            <IconRail
              {...railProps}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
