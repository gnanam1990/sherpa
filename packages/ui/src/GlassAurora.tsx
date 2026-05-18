'use client';

import type { ReactNode } from 'react';

type GlassSurfaceProps = {
  children: ReactNode;
  className?: string;
};

type GlassActionCardProps = {
  href?: string;
  label: string;
  meta: string;
};

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export function SherpaGlassMark({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#0052FF" height="32" rx="8" width="32" />
      <path d="M5 24 L12 12 L17 19 L21 14 L27 24 Z" fill="#FFFFFF" />
      <circle cx="21" cy="9" fill="#00E1FF" r="2.2" />
    </svg>
  );
}

export function GlassAuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#04061A_0%,#0B0F38_45%,#180E42_74%,#250B3A_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,82,255,0.35)_0%,transparent_28%,rgba(0,225,255,0.18)_48%,transparent_68%,rgba(255,77,184,0.18)_100%)]" />
      <svg
        className="absolute bottom-0 left-0 h-[52%] w-full opacity-90"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 1200 500"
      >
        <defs>
          <linearGradient id="sherpa-glass-far" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5B6CD9" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#1B0C44" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sherpa-glass-mid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2E1F5E" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#100827" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="sherpa-glass-near" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#080923" stopOpacity="1" />
            <stop offset="100%" stopColor="#04061A" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="sherpa-glass-snow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#E6F4FF" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#E6F4FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 380 L120 280 L220 320 L320 240 L420 290 L520 220 L640 290 L760 250 L880 310 L1000 240 L1100 300 L1200 270 L1200 500 L0 500 Z"
          fill="url(#sherpa-glass-far)"
        />
        <path
          d="M-20 420 L60 330 L160 360 L260 280 L360 340 L440 300 L540 360 L640 280 L760 330 L860 290 L960 360 L1080 310 L1220 360 L1220 500 L-20 500 Z"
          fill="url(#sherpa-glass-mid)"
        />
        <path
          d="M-20 500 L100 420 L220 440 L320 360 L440 420 L540 380 L600 280 L660 230 L720 290 L800 380 L880 360 L980 410 L1100 380 L1220 440 L1220 500 Z"
          fill="url(#sherpa-glass-near)"
        />
        <path
          d="M540 380 L600 280 L660 230 L720 290 L675 320 L640 295 L605 320 Z"
          fill="url(#sherpa-glass-snow)"
          opacity="0.7"
        />
        <line stroke="#00E1FF" strokeWidth="1.2" x1="660" x2="660" y1="230" y2="206" />
        <path d="M660 208 L676 213 L660 218 Z" fill="#00E1FF" />
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,6,26,0.58)_76%,rgba(4,6,26,0.9)_100%)]" />
    </div>
  );
}

export function GlassSurface({ children, className }: GlassSurfaceProps) {
  return (
    <div
      className={cx(
        'rounded-[24px] border border-white/15 bg-white/[0.08] shadow-[0_22px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassPill({ children, className }: GlassSurfaceProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white/72 backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function GlassActionCard({ href, label, meta }: GlassActionCardProps) {
  const content = (
    <>
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-1 font-mono text-[11px] text-white/55">{meta}</div>
    </>
  );

  if (href) {
    return (
      <a
        className="rounded-2xl border border-white/12 bg-white/[0.07] p-3.5 backdrop-blur-xl transition hover:border-[#00E1FF]/45 hover:bg-white/[0.1]"
        href={href}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.07] p-3.5 backdrop-blur-xl">
      {content}
    </div>
  );
}

export function GlassDeviceFrame({ children }: GlassSurfaceProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#04061A] text-white">
      <GlassAuroraBackground />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
      </div>
    </main>
  );
}
