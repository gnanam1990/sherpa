'use client';

import { useRef, type FormEvent } from 'react';
import { ActionRail } from './action-rail';

/**
 * Glass Aurora composer pill.
 *
 * The floating intent input at the bottom of the chat surface. A
 * controlled, accessible `<form>` — the parent owns the value and the
 * submit handler (wired to the real parser in Phase 3). The reference
 * prototype showed a *fake* static caret over sample text; this ships a
 * real `<input>` with a cerulean native caret instead, so it actually
 * accepts typing.
 */
export interface ComposerPillProps {
  /** Controlled input value. */
  value: string;
  /** Called on every keystroke with the new value. */
  onChange: (next: string) => void;
  /** Called on submit (Enter / Preview button) with the trimmed value. */
  onSubmit: (value: string) => void;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Footer status line (parser/safety provenance). Optional. */
  statusLine?: string;
  /** Disable input + submit while a request is in flight. */
  busy?: boolean;
}

export function ComposerPill({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type an intent in plain English…',
  statusLine,
  busy = false,
}: ComposerPillProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    onSubmit(trimmed);
  };

  return (
    <div className="relative z-10 shrink-0 px-7 pb-6">
      <div className="mx-auto max-w-[680px]">
        <ActionRail busy={busy} draft={value} inputRef={inputRef} onPrefill={onChange} />

        <form
          onSubmit={submit}
          className="rounded-full p-px"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.05) 35%, rgba(0,225,255,0.4) 100%)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.45)',
          }}
        >
          <div
            className="flex items-center gap-3 rounded-full px-4 py-3"
            style={{
              background: 'rgba(8,10,30,0.55)',
              backdropFilter: 'blur(28px) saturate(160%)',
              WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            }}
          >
            <span className="font-mono text-[13px]" style={{ color: '#A6F2FF' }} aria-hidden="true">
              ›
            </span>
            <label htmlFor="composer-intent" className="sr-only">
              Intent
            </label>
            <input
              ref={inputRef}
              data-testid="chat-input"
              id="composer-intent"
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={busy}
              autoComplete="off"
              className="flex-1 bg-transparent font-mono text-[13.5px] text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
              style={{ caretColor: '#00E1FF' }}
            />
            <span className="hidden font-mono text-[10px] opacity-50 md:inline">
              ⏎ preview · ⌘K search
            </span>
            <button
              type="submit"
              disabled={busy || value.trim().length === 0}
              className="gradient-cerulean cerulean-glow-fx rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold text-[#06081A] disabled:opacity-50"
            >
              {busy ? 'Parsing…' : 'Preview ⏎'}
            </button>
          </div>
        </form>

        {statusLine && (
          <div className="mt-2 text-center font-mono text-[10px] opacity-55">{statusLine}</div>
        )}
      </div>
    </div>
  );
}
