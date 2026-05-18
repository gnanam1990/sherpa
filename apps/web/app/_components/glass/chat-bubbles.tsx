import type { ReactNode } from 'react';
import { SherpaMark } from './brand';
import { GlassChip } from './primitives';

/**
 * Glass Aurora conversation atoms.
 *
 * Pure presentational pieces for the chat thread. They render whatever
 * text/slots they are given — no parsing, no hardcoded sample turns. The
 * real parser output is wired in Phase 3 when the home route adopts these.
 */

export interface UserBubbleProps {
  /** The user's message text. */
  text: string;
}

/** Right-aligned user message — bright ice gradient, mono, dark ink. */
export function UserBubble({ text }: UserBubbleProps) {
  return (
    <div
      className="rounded-2xl rounded-tr-md px-3.5 py-2 font-mono text-[12.5px] text-[#06081A] shadow-[0_10px_30px_rgba(0,225,255,0.3)]"
      style={{ background: 'linear-gradient(135deg, #CFF6FF, #FFFFFF)' }}
    >
      {text}
    </div>
  );
}

export interface SherpaBubbleProps {
  children: ReactNode;
  /**
   * `true` for short ambient/earlier replies (lighter `glass-thin`).
   * Default `false` (standard glass response container).
   */
  thin?: boolean;
}

/** Left-aligned Sherpa response container. */
export function SherpaBubble({ children, thin = false }: SherpaBubbleProps) {
  return (
    <div
      className={`rounded-2xl rounded-tl-md px-3.5 py-2 text-[12px] ${
        thin ? 'glass-thin' : 'glass'
      }`}
    >
      {children}
    </div>
  );
}

/** Sherpa's circular avatar — cerulean gradient ring around the brand mark. */
export function SherpaAvatar() {
  return (
    <div
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-white/25"
      style={{ background: 'linear-gradient(135deg, #0052FF 0%, #00E1FF 100%)' }}
    >
      <SherpaMark size={14} />
    </div>
  );
}

/** A single parsed slot, e.g. `{ key: 'amount', value: '250 USDC' }`. */
export interface IntentSlot {
  key: string;
  value: string;
}

export interface IntentChipsProps {
  /** Parsed action label, e.g. `SEND`. */
  action: string;
  /**
   * Model confidence in `[0,1]`. Rendered as a percentage next to the
   * action. Omit to hide the confidence segment.
   */
  confidence?: number;
  /** Extracted slots rendered as neutral chips after the action chip. */
  slots?: ReadonlyArray<IntentSlot>;
}

/**
 * The parsed-intent chip row shown above a confirmation. The leading chip
 * is the action + confidence; trailing chips are the extracted slots.
 * Fully driven by props so it reflects the real parser, never a fixture.
 */
export function IntentChips({
  action,
  confidence,
  slots = [],
}: IntentChipsProps) {
  const pct =
    typeof confidence === 'number'
      ? `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`
      : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-widest"
        style={{
          background:
            'linear-gradient(135deg, rgba(0,225,255,0.35), rgba(77,128,255,0.18))',
          color: '#E5FAFF',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
        }}
      >
        ▸ {action}
        {pct ? ` · ${pct}` : ''}
      </span>
      {slots.map((s) => (
        <GlassChip key={s.key}>
          <span className="opacity-60">{s.key}</span>
          <span>{s.value}</span>
        </GlassChip>
      ))}
    </div>
  );
}
