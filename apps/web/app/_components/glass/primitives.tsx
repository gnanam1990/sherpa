import type { CSSProperties, ReactNode } from 'react';

/**
 * Glass Aurora structural primitives.
 *
 * These are pure, server-renderable presentational components — no hooks,
 * no data, no `'use client'`. They are the lowest layer of the design
 * system; every higher surface (hero card, rail, top bar) composes them.
 */

/** Semantic tone shared by chips and status accents across the system. */
export type ChipTone = 'success' | 'warning' | 'danger' | 'info';

const CHIP_TONE_STYLE: Record<ChipTone, CSSProperties> = {
  success: {
    background: 'rgba(124,255,203,0.12)',
    color: '#9CFFD7',
    boxShadow: 'inset 0 0 0 1px rgba(124,255,203,0.2)',
  },
  warning: {
    background: 'rgba(245,166,35,0.16)',
    color: '#FFD180',
    boxShadow: 'inset 0 0 0 1px rgba(245,166,35,0.25)',
  },
  danger: {
    background: 'rgba(255,90,95,0.16)',
    color: '#FFB3B6',
    boxShadow: 'inset 0 0 0 1px rgba(255,90,95,0.25)',
  },
  info: {
    background: 'rgba(0,225,255,0.16)',
    color: '#A6F2FF',
    boxShadow: 'inset 0 0 0 1px rgba(0,225,255,0.25)',
  },
};

export interface GlassPanelProps {
  children: ReactNode;
  /** Extra classes appended after the glass surface classes. */
  className?: string;
  /** Inline style passthrough (e.g. min-width on a rail panel). */
  style?: CSSProperties;
  /**
   * `true` selects the heavier `glass-deep` treatment (28px blur, brighter
   * highlight) for hero-emphasis surfaces. Default `false` (standard 24px).
   */
  deep?: boolean;
}

/**
 * The default frosted surface. Use for cards, list containers, side panels.
 * Reach for `deep` only on the single most important surface on screen;
 * for the signature confirmation surface use {@link LensBorder} around a
 * `deep` panel instead.
 */
export function GlassPanel({
  children,
  className = '',
  style,
  deep = false,
}: GlassPanelProps) {
  return (
    <div
      className={`rounded-3xl ${deep ? 'glass-deep' : 'glass'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export interface GlassChipProps {
  children: ReactNode;
  className?: string;
  /**
   * Optional semantic tone. When omitted the chip uses the neutral
   * `glass-thin` treatment — use neutral for metadata, a tone only to
   * signal status (success / warning / danger / info).
   */
  tone?: ChipTone;
}

/**
 * A small inline pill for metadata and status. Neutral by default; pass a
 * `tone` to convey state. Prefer one toned chip per cluster so the colour
 * actually means something.
 */
export function GlassChip({ children, className = '', tone }: GlassChipProps) {
  const toneStyle = tone ? CHIP_TONE_STYLE[tone] : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] ${
        toneStyle ? '' : 'glass-thin'
      } ${className}`}
      style={toneStyle}
    >
      {children}
    </span>
  );
}

export interface MetaLabelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Uppercase mono section label (e.g. "Confirmation", "From"). This is the
 * Glass Aurora variant; it is intentionally separate from the legacy
 * global `.meta-label` class so existing pages are unaffected.
 */
export function MetaLabel({ children, className = '' }: MetaLabelProps) {
  return (
    <div
      className={`font-mono text-[10px] uppercase tracking-[0.18em] opacity-60 ${className}`}
    >
      {children}
    </div>
  );
}

export interface PipProps {
  /** Filled (passed/active) vs hollow (pending). Default filled. */
  filled?: boolean;
  /** Fill colour when `filled`. Default mint. */
  color?: string;
}

/**
 * A single status dot. Render a row of these for the safety-ring cluster
 * on the hero confirm card (one Pip per ring, filled = passed).
 */
export function Pip({ filled = true, color = '#7CFFCB' }: PipProps) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: filled ? color : 'rgba(255,255,255,0.18)' }}
    />
  );
}

export interface LensBorderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Gradient "lens" rim for the highest-emphasis surface only (the hero
 * confirm card). Wrap a single child; the rim adds 1px of gradient and a
 * deep drop shadow. Do not nest or use for ordinary cards — overuse kills
 * the emphasis it is meant to create.
 */
export function LensBorder({ children, className = '' }: LensBorderProps) {
  return <div className={`lens-border ${className}`}>{children}</div>;
}
