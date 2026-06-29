/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Glass Aurora atmospheric background.
 *
 * The constant scene behind every Glass surface: a deep vertical gradient,
 * four blurred colour orbs, a layered mountain horizon with snowcaps and
 * the Sherpa summit flag, a hand-placed starfield, and a faint noise
 * overlay. Entirely decorative — the whole tree is `aria-hidden` and
 * `pointer-events-none` so it never traps focus or the cursor.
 *
 * Pure and server-renderable. Mount once per shell, behind the content
 * (the shell gives content a higher stacking context).
 */

function MountainHorizon() {
  return (
    <svg
      className="pointer-events-none absolute bottom-0 left-0 z-0 h-[55%] w-full"
      viewBox="0 0 1200 500"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="aurora-farRange" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5B6CD9" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1B0C44" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aurora-midRange" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2E1F5E" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#1B0C44" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="aurora-nearRange" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0A0628" stopOpacity="1" />
          <stop offset="100%" stopColor="#04061A" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="aurora-snow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E6F4FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#E6F4FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 380 L120 280 L220 320 L320 240 L420 290 L520 220 L640 290 L760 250 L880 310 L1000 240 L1100 300 L1200 270 L1200 500 L0 500 Z"
        fill="url(#aurora-farRange)"
      />
      <path
        d="M-20 420 L60 330 L160 360 L260 280 L360 340 L440 300 L540 360 L640 280 L760 330 L860 290 L960 360 L1080 310 L1220 360 L1220 500 L-20 500 Z"
        fill="url(#aurora-midRange)"
      />
      <path
        d="M260 280 L300 300 L330 285 L360 340 L260 360 Z"
        fill="url(#aurora-snow)"
        opacity="0.5"
      />
      <path
        d="M640 280 L680 300 L720 290 L760 330 L640 360 Z"
        fill="url(#aurora-snow)"
        opacity="0.45"
      />
      <path
        d="M-20 500 L100 420 L220 440 L320 360 L440 420 L540 380 L600 280 L660 230 L720 290 L800 380 L880 360 L980 410 L1100 380 L1220 440 L1220 500 Z"
        fill="url(#aurora-nearRange)"
      />
      <path
        d="M540 380 L600 280 L660 230 L720 290 L675 320 L640 295 L605 320 Z"
        fill="url(#aurora-snow)"
        opacity="0.7"
      />
      {/* Sherpa summit flag */}
      <line x1="660" y1="230" x2="660" y2="206" stroke="#00E1FF" strokeWidth="1.2" />
      <path d="M660 208 L676 213 L660 218 Z" fill="#00E1FF" />
    </svg>
  );
}

/** Hand-placed star coordinates: [x, y, radius]. Deterministic. */
const STARS: ReadonlyArray<readonly [number, number, number]> = [
  [80, 50, 1],
  [220, 90, 0.6],
  [340, 40, 1.4],
  [520, 80, 0.8],
  [700, 60, 1],
  [880, 110, 0.6],
  [1020, 50, 1.2],
  [1140, 100, 0.7],
  [180, 160, 0.5],
  [420, 140, 0.7],
  [620, 180, 0.5],
  [820, 200, 0.6],
  [980, 160, 0.5],
  [60, 220, 0.6],
  [1100, 220, 0.5],
  [780, 30, 1.5],
  [350, 200, 0.5],
  [1080, 170, 0.6],
  [40, 130, 0.5],
  [930, 220, 0.5],
];

function Stars() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {STARS.map(([x, y, r], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill="white"
          opacity={0.4 + ((i * 37) % 10) / 25}
        />
      ))}
      {/* Cross-glint accent on the brightest star */}
      <g opacity="0.7">
        <circle cx="780" cy="30" r="2.5" fill="white" />
        <line x1="780" y1="22" x2="780" y2="38" stroke="white" strokeWidth="0.6" />
        <line x1="772" y1="30" x2="788" y2="30" stroke="white" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

/** A single blurred colour orb. */
function Orb({
  className,
  gradient,
}: {
  className: string;
  gradient: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-0 rounded-full ${className}`}
      style={{ background: gradient }}
      aria-hidden="true"
    />
  );
}

/** The full atmospheric scene. Render once, behind shell content. */
export function AuroraBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="aurora-root" />
      <Orb
        className="-left-40 -top-40 h-[560px] w-[560px] opacity-90 blur-[120px]"
        gradient="radial-gradient(circle, #0052FF 0%, transparent 65%)"
      />
      <Orb
        className="-right-32 top-1/4 h-[520px] w-[520px] opacity-80 blur-[110px]"
        gradient="radial-gradient(circle, #00E1FF 0%, transparent 60%)"
      />
      <Orb
        className="left-1/3 -bottom-32 h-[480px] w-[480px] opacity-70 blur-[120px]"
        gradient="radial-gradient(circle, #FF4DB8 0%, transparent 65%)"
      />
      <Orb
        className="right-1/4 -top-20 h-[300px] w-[300px] opacity-60 blur-[100px]"
        gradient="radial-gradient(circle, #9D4EFF 0%, transparent 65%)"
      />
      <MountainHorizon />
      <Stars />
      <div className="noise pointer-events-none absolute inset-0 z-0 opacity-50" />
    </div>
  );
}
