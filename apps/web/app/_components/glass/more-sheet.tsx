'use client';

import { useEffect } from 'react';
import { MORE_INTENT_GROUPS, type IntentPrefill } from '../../../lib/intents/catalog';
import { MetaLabel } from './primitives';

type MoreSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: IntentPrefill) => void;
};

export function MoreSheet({ open, onClose, onSelect }: MoreSheetProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/35 sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:mb-3 sm:w-[680px] sm:bg-transparent"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-label="More intents"
        aria-modal="true"
        className="absolute inset-x-3 bottom-3 rounded-3xl border border-white/15 bg-[#070A1E]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-2xl transition-opacity duration-150 sm:static sm:inset-auto"
        role="dialog"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <MetaLabel>More intents</MetaLabel>
            <p className="mt-1 text-xs text-white/55">
              Prefill only. Nothing executes until you preview and confirm.
            </p>
          </div>
          <button
            aria-label="Close more intents"
            className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-xs text-white/60 transition hover:border-white/25 hover:text-white"
            type="button"
            onClick={onClose}
          >
            Esc
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {MORE_INTENT_GROUPS.map((group) => (
            <div
              key={group.category}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
            >
              <MetaLabel>{group.category}</MetaLabel>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={`${group.category}-${item.label}`}
                    className="rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left text-[11.5px] text-white/75 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 hover:text-white"
                    type="button"
                    onClick={() => onSelect(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
