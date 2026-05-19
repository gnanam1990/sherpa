'use client';

import { useId, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import {
  ACTION_RAIL_INTENTS,
  type IntentPrefill,
  type RailIntent,
  type RailIntentIcon,
} from '../../../lib/intents/catalog';
import { GlassChip } from './primitives';
import { MoreSheet } from './more-sheet';

// RAIL POLICY
// Chips in the rail are for high-frequency, low-risk intents only.
// Destructive intents (Bridge, Revoke, Cancel, Bridge out) live in
// the More sheet — never promote them to the rail, even if usage
// data suggests they're frequent. The extra tap is intentional friction.

type ActionRailProps = {
  busy?: boolean;
  draft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onPrefill: (value: string) => void;
};

const ICON_PATHS: Record<RailIntentIcon, string[]> = {
  'ti-arrows-exchange': ['M7 7h11l-3 -3', 'M18 7l-3 3', 'M17 17H6l3 3', 'M6 17l3 -3'],
  'ti-send': ['M10 14L21 3', 'M21 3l-6 18-5-7-7-2 18-9z'],
  'ti-trending-up': ['M3 17l6-6 4 4 8-8', 'M14 7h7v7'],
  'ti-arrow-down-circle': ['M12 7v10', 'M8 13l4 4 4-4', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'],
  'ti-arrow-up-circle': ['M12 17V7', 'M8 11l4-4 4 4', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'],
  'ti-dots': ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
};

function TablerIcon({ icon }: { icon: RailIntentIcon }) {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      data-icon={icon}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {ICON_PATHS[icon].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

function focusInputAtEnd(inputRef: RefObject<HTMLInputElement | null>, value: string) {
  const input = inputRef.current;
  if (!input) return;

  input.focus();
  window.setTimeout(() => {
    input.focus();
    input.setSelectionRange(value.length, value.length);
  }, 0);
}

export function ActionRail({ busy = false, draft, inputRef, onPrefill }: ActionRailProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

  const prefill = (item: IntentPrefill) => {
    if (busy) return;
    if (draft.trim().length > 0) toast('Replaced draft');
    onPrefill(item.prefill);
    setMoreOpen(false);
    focusInputAtEnd(inputRef, item.prefill);
  };

  const renderRailButton = (item: RailIntent) => (
    <button
      aria-label={item.label}
      className="shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      disabled={busy}
      key={item.label}
      type="button"
      onClick={() => prefill(item)}
    >
      <GlassChip className="px-2.5 py-1 text-[11px]">
        <TablerIcon icon={item.icon} />
        {item.label}
      </GlassChip>
    </button>
  );

  return (
    <div className="relative mb-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ACTION_RAIL_INTENTS.map(renderRailButton)}
      <button
        aria-controls={moreId}
        aria-expanded={moreOpen}
        aria-label="More"
        className="sticky right-0 z-10 shrink-0 rounded-full bg-[#07102b]/85 backdrop-blur disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy}
        type="button"
        onClick={() => setMoreOpen((open) => !open)}
      >
        <GlassChip className="px-2.5 py-1 text-[11px]">
          <TablerIcon icon="ti-dots" />
          More
        </GlassChip>
      </button>
      <div id={moreId}>
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onSelect={prefill} />
      </div>
    </div>
  );
}
