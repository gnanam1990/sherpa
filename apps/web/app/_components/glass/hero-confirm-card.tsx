'use client';

import { Avatar, ChainPill, TokenIcon } from './brand';
import type { ChainTone } from './brand';
import { ArrowIcon } from './icons';
import { GlassChip, LensBorder, MetaLabel, Pip } from './primitives';
import type { ChipTone } from './primitives';

/**
 * Glass Aurora hero confirmation card — the signature surface.
 *
 * `lens-border` + `glass-deep`, an Instrument-Serif ice-gradient amount, a
 * safety-ring pip cluster, and a cerulean Confirm button. Fully prop-driven
 * so it renders the *real* parsed plan and safety result (wired in Phase 3);
 * it never embeds a sample transaction. Used inside a client tree because
 * `onCancel`/`onConfirm` are interactive.
 */

/** One end (From / To) of the transfer header. */
export interface ConfirmParty {
  /** Primary label, e.g. an ENS/basename or contract name. */
  label: string;
  /** Secondary line, e.g. a shortened address. */
  sub?: string;
  /** Avatar seed — pass the address/ENS for a stable gradient. */
  seed?: string | number;
}

/** A single bottom-row metadata cell. */
export interface ConfirmMetaCell {
  k: string;
  v: string;
  sub?: string;
  /** Accent colour for the value (e.g. mint for "passed"). */
  color?: string;
  /** Render the value in mono (hashes/ids). */
  mono?: boolean;
}

export interface HeroConfirmCardProps {
  /** Status chip, e.g. awaiting signature + countdown. */
  status: { label: string; tone?: ChipTone; countdown?: string };
  /** Network the plan executes on. */
  chain: { label: string; tone?: ChainTone };
  from: ConfirmParty;
  to: ConfirmParty;
  /** Verb shown under the connector arrow, e.g. `send`. */
  action: string;
  /** The headline amount, split so the fraction can dim. */
  amount: {
    whole: string;
    fraction?: string;
    token: string;
    usd?: string;
    rate?: string;
  };
  /** Exactly the cells to show in the 3-up footer (gas / rings / hash). */
  meta: ReadonlyArray<ConfirmMetaCell>;
  /** Safety-ring summary; renders a pip per ring (filled = passed). */
  safety?: { total: number; passed: number };
  /** Confirm button label. Default `Confirm in Smart Wallet  →`. */
  confirmLabel?: string;
  /** Disable both actions while a signature is in flight. */
  busy?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
}

function MetaCell({ k, v, sub, color, mono }: ConfirmMetaCell) {
  return (
    <div className="px-4 py-3">
      <MetaLabel>{k}</MetaLabel>
      <div
        className={`mt-1 text-[12.5px] ${mono ? 'font-mono' : 'font-semibold'}`}
        style={color ? { color } : undefined}
      >
        {v}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[9.5px] opacity-55">{sub}</div>}
    </div>
  );
}

export function HeroConfirmCard({
  status,
  chain,
  from,
  to,
  action,
  amount,
  meta,
  safety,
  confirmLabel = 'Confirm in Smart Wallet  →',
  busy = false,
  onCancel,
  onConfirm,
}: HeroConfirmCardProps) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full opacity-80 blur-3xl"
        style={{ background: 'radial-gradient(circle, #00E1FF, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -right-10 h-44 w-44 rounded-full opacity-80 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FF4DB8, transparent 70%)' }}
        aria-hidden="true"
      />

      <LensBorder>
        <div className="glass-deep relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            }}
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="flex items-center gap-2">
              <MetaLabel>Confirmation</MetaLabel>
              <GlassChip tone={status.tone ?? 'warning'}>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300"
                  aria-hidden="true"
                />
                {status.label}
                {status.countdown ? ` · ${status.countdown}` : ''}
              </GlassChip>
            </div>
            <ChainPill chain={chain.label} tone={chain.tone ?? 'mainnet'} />
          </div>

          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-5">
            <div>
              <MetaLabel>From</MetaLabel>
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar seed={from.seed ?? from.label} size={28} />
                <div>
                  <div className="text-[13px] font-semibold">{from.label}</div>
                  {from.sub && (
                    <div className="font-mono text-[10px] opacity-65">
                      {from.sub}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="gradient-cerulean cerulean-glow-fx flex h-7 w-7 items-center justify-center rounded-full">
                <ArrowIcon size={14} />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">
                {action}
              </span>
            </div>
            <div className="text-right">
              <MetaLabel className="text-right">To</MetaLabel>
              <div className="mt-1.5 flex items-center justify-end gap-2">
                <div className="text-right">
                  <div className="text-[13px] font-semibold">{to.label}</div>
                  {to.sub && (
                    <div className="font-mono text-[10px] opacity-65">
                      {to.sub}
                    </div>
                  )}
                </div>
                <Avatar seed={to.seed ?? to.label} size={28} />
              </div>
            </div>
          </div>

          <div className="relative border-y border-white/10">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
              style={{
                background: 'radial-gradient(ellipse, #00E1FF, transparent 70%)',
              }}
              aria-hidden="true"
            />
            <div className="relative flex items-baseline justify-center gap-3 py-7">
              <TokenIcon symbol={amount.token} size={38} />
              <span
                className="text-gradient-ice font-serif italic leading-none tracking-tight"
                style={{ fontSize: 64 }}
              >
                {amount.whole}
                {amount.fraction !== undefined && (
                  <span style={{ opacity: 0.5 }}>.{amount.fraction}</span>
                )}
              </span>
              <span className="pb-1.5 font-mono text-[14px] uppercase tracking-[0.18em] opacity-75">
                {amount.token}
              </span>
            </div>
            {(amount.usd || amount.rate) && (
              <div className="pb-3 text-center font-mono text-[11px] opacity-60">
                {[amount.usd, amount.rate].filter(Boolean).join(' · ')}
              </div>
            )}
            {safety && (
              <div
                className="flex items-center justify-center gap-1 pb-3"
                aria-label={`Safety ${safety.passed} of ${safety.total} passed`}
              >
                {Array.from({ length: safety.total }, (_, i) => (
                  <Pip key={i} filled={i < safety.passed} />
                ))}
              </div>
            )}
          </div>

          <div className="relative grid grid-cols-3 divide-x divide-white/10 text-[11px]">
            {meta.map((cell) => (
              <MetaCell key={cell.k} {...cell} />
            ))}
          </div>

          <div className="relative grid grid-cols-[1fr_2fr] items-center gap-2 border-t border-white/10 p-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="glass-thin rounded-2xl py-3 text-[12.5px] font-medium opacity-80 transition hover:opacity-100 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="gradient-cerulean cerulean-glow-fx relative overflow-hidden rounded-2xl py-3 text-[13px] font-semibold text-[#06081A] disabled:opacity-60"
            >
              <span className="relative z-10">
                {busy ? 'Awaiting signature…' : confirmLabel}
              </span>
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.45), transparent)',
                }}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </LensBorder>
    </div>
  );
}
