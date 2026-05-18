# Glass Aurora — Sherpa Design System

Glass Aurora is Sherpa's web visual system: a dark, frosted-glass interface
set against a layered mountain-aurora sky. It is a **visual replacement
only** — every route's data flow, parser, safety pipeline, signing flow,
and component tree is unchanged. It currently ships **behind the
`NEXT_PUBLIC_GLASS_AURORA` feature flag** while it is dogfooded; the legacy
UI is the flag-off default and is preserved in `app/_archive/` for
rollback.

Source design reference: a Babel-prototype canvas (`_sherpa-glass-source.html`
+ `glass-*.jsx`). Those were treated as **design reference only** and
re-implemented in strict TypeScript following Sherpa's component
conventions — no prototype code shipped.

---

## 1. Aesthetic philosophy

- **Dark-only, by design.** Glass Aurora is a single dark theme. The
  frosted surfaces, ice-gradient type, and aurora orbs depend on a deep
  backdrop; there is no light variant and one is not planned. (The legacy
  UI keeps its light/dark `next-themes` support at flag-off.)
- **Mountain metaphor.** Sherpa = a guide up the mountain. The constant
  background is a layered horizon (three ranges + snowcaps) with a single
  cerulean **summit flag** — the brand's north star — and a hand-placed
  starfield.
- **Restrained glass.** Frost is a hierarchy tool, not decoration. Most
  surfaces use the standard `.glass`; `.glass-deep` + `.lens-border` are
  reserved for the single highest-emphasis surface on a screen (the hero
  confirmation card). Overuse kills the emphasis it creates.
- **Honest by construction.** No fabricated data anywhere: amounts are the
  API's display strings, safety shows the real `risk_indicators[]` /
  `warnings[]` (there is **no fake "7/7 rings"** cluster), disconnected
  states show a Connect button (never a placeholder address), and gated
  features keep their honest blocker copy verbatim.

---

## 2. Color palette

All tokens were added **additively** to `apps/web/tailwind.config.ts`; no
pre-existing token was renamed or removed (backward compatible with the
legacy UI).

### Aurora backdrop

| Token | Hex | Use |
| --- | --- | --- |
| `aurora-deep` | `#04061A` | Top of the sky gradient |
| `aurora-mid` | `#0B0F38` | Upper-mid sky |
| `aurora-violet` | `#1B0C44` | Lower-mid sky |
| `aurora-warm` | `#2B0640` | Horizon glow |

`aurora-base` background-image = `linear-gradient(180deg, #04061A 0%,
#0B0F38 45%, #1B0C44 75%, #2B0640 100%)` (the `.aurora-root` fill).

### Cerulean / accent

| Token | Hex | Use |
| --- | --- | --- |
| `base-cerulean` | `#00E1FF` | Primary accent (pre-existing, kept) |
| `base-cerulean-ice` | `#CFF6FF` | Ice-gradient highlight, user bubble |
| `base-cerulean-light` | `#A6F2FF` | Active icon / chevron tint |
| `base-magenta` | `#FF4DB8` | Secondary orb, badges |
| `base-purple` | `#9D4EFF` | Tertiary orb |
| `base-blue` | `#0052FF` | Brand ground (pre-existing, kept) |

Orb background-images: `blue-orb`, `cerulean-orb`, `magenta-orb`,
`purple-orb` (radial gradients). `gradient-cerulean` =
`linear-gradient(135deg,#CFF6FF,#00E1FF,#4D80FF)`. `gradient-text-ice` =
`linear-gradient(180deg,#FFFFFF,#CFF6FF)`.

### Status (chips)

`chip-success` mint `#9CFFD7`, `chip-warning` amber `#FFD180`,
`chip-danger` `#FFB3B6`, `chip-info` cerulean `#A6F2FF` — each on a
low-opacity tinted background with an inset ring.

---

## 3. Typography

| Family | Token | Use |
| --- | --- | --- |
| **Inter** | `font-sans` | Body, UI labels (pre-existing) |
| **IBM Plex Mono** | `font-mono` | Addresses, hashes, meta labels, amounts in lists (pre-existing) |
| **Instrument Serif** (italic) | `font-serif` | Signature display: the `sherpa` wordmark, hero amounts, route/section H2s |

> Phase 1 carry-over fix: Instrument Serif was added to the font `@import`
> **and** to `theme.fontFamily.serif` (additive — no prior `serif` key).
> Without the second step `font-serif` silently fell back to Georgia.

Hero amount = Instrument Serif italic, `64px`, clipped through
`.text-gradient-ice`.

---

## 4. Glass primitives (globals.css `@layer components`)

Added additively; the legacy `.meta-label` / `.base-*` classes are
untouched.

| Class | Blur | Use |
| --- | --- | --- |
| `.glass` | 24px | Default frosted surface (cards, lists, panels) |
| `.glass-thin` | 16px | Low-emphasis (chips, tooltips, rail buttons, ambient replies) |
| `.glass-deep` | 28px | Hero-emphasis surface (confirm card, center-shell) |
| `.glass-active` | — | Selected nav state (cerulean inset ring + glow) |
| `.lens-border` | — | Gradient rim + deep shadow; **hero card only** |
| `.cerulean-glow-fx` | — | Cerulean drop shadow utility |
| `.magenta-glow` | — | Magenta drop shadow utility |
| `.gradient-cerulean` | — | Cerulean linear-gradient fill (buttons) |
| `.text-gradient-ice` | — | Clipped ice gradient text |
| `.aurora-root` | — | `position: fixed` full-viewport sky gradient |
| `.pulse-dot` | — | Animated live indicator (`ping-slow`) |
| `.caret` | — | Blinking cursor (`caret-blink`) |
| `.noise` | — | SVG turbulence overlay |
| `.chip-success/-warning/-danger/-info` | — | Status pills |

> **Naming collision (documented):** the reference names its cerulean
> shadow `.cerulean-glow`, but `cerulean-glow` is already a Tailwind
> `backgroundImage` key (`bg-cerulean-glow`). Shipped as
> **`.cerulean-glow-fx`** to avoid the clash. Animation keyframes
> (`caret-blink`, `ping-slow`, `aurora-drift`) are defined once in
> `tailwind.config.ts` and referenced by the CSS classes — single source
> of truth, no duplicate `@keyframes`.

`backdropBlur` scale: `thin` 16px · `glass` 24px · `deep` 28px.

---

## 5. Layout system

```
AppFrame                       app/_components/glass/app-frame.tsx
├── AuroraBackground           background/aurora-background.tsx  (aria-hidden, decorative)
├── IconRail  (>= sm)          icon-rail.tsx     (14-route nav, URL-driven active state)
├── MobileNav (< 640px)        mobile-nav.tsx    (hamburger → slide-in IconRail sheet)
└── main
    ├── TopBar                 top-bar.tsx       (wordmark · chain · breadcrumb · account)
    └── {route content}
```

- **Route awareness** is URL-driven via `route-context.tsx`
  (`usePathname()`); there is no in-memory screen state, so nav can't
  drift from the URL. `ROUTES` (14 entries) is the single source of truth;
  `IconRail` defaults to it but accepts an `items` override.
- **`GlassCenterShell`** (no rail) is used for one-shot deep-link
  landings (`/link`, `/sign`).
- **TopBar data** comes from one shared `useGlassTopBar()`
  (`top-bar-data.tsx`) — real wagmi account/ENS/balance/chain — so every
  restyled route gets identical, honest chrome.

---

## 6. Component inventory

All under `apps/web/app/_components/glass/` unless noted.

| Component | File | Role |
| --- | --- | --- |
| `AppFrame` | `app-frame.tsx` | Shell composition |
| `AuroraBackground` | `background/aurora-background.tsx` | Constant sky/horizon/stars |
| `IconRail` / `MobileNav` | `icon-rail.tsx` / `mobile-nav.tsx` | Navigation |
| `TopBar` / `useGlassTopBar` | `top-bar.tsx` / `top-bar-data.tsx` | Header chrome + data |
| `GlassPanel` `GlassChip` `MetaLabel` `Pip` `LensBorder` | `primitives.tsx` | Structural primitives |
| `SherpaMark` `Avatar` `TokenIcon` `ChainPill` `shortHex` | `brand.tsx` | Brand atoms |
| `UserBubble` `SherpaBubble` `SherpaAvatar` `IntentChips` | `chat-bubbles.tsx` | Conversation atoms |
| `HeroConfirmCard` | `hero-confirm-card.tsx` | Signature confirmation surface |
| `ComposerPill` | `composer-pill.tsx` | Intent input |
| route icons | `icons/index.tsx` | One stroke glyph per rail route |
| `GlassHome` | `glass-home.tsx` | Home/chat screen |
| `GlassPositions` | `glass-positions.tsx` | Aave positions screen |
| `GlassIntentPage` | `intent-page.tsx` | swap/lend/borrow/repay/withdraw |
| `GlassAutomationShell` | `automation-shell.tsx` | dca/alerts/auto-repay/multi-chain/session-keys/governance/strategies wrapper |
| `GlassCenterShell` | `glass-center-shell.tsx` | link/sign landings |
| `GlassAbout` | `glass-about.tsx` | About marketing page |
| `usePromptFlow` | `app/../hooks/usePromptFlow.ts` | Extracted parse→safety→sign pipeline (shared by legacy `Prompt` + `GlassHome`) |
| `usePositionsData` | `app/../hooks/usePositionsData.ts` | Extracted Aave read pipeline (shared by legacy `PositionsView` + `GlassPositions`) |
| `GLASS_AURORA_ENABLED` | `app/../lib/feature-flags.ts` | Rollout gate |

Two **behaviour-preserving extractions** (`usePromptFlow`,
`usePositionsData`) give legacy + Glass one source of truth for the
non-trivial logic; their original test files (`Prompt.test.tsx`,
`PositionsView.test.tsx`) are the unchanged contracts. Every other route
either uses a static shared component or **chrome-wraps the proven legacy
panel unchanged** (so `AutomationPanels`/`AdvancedPanels` and their test
contracts are untouched).

---

## 7. Performance notes

- **Backdrop blur cost.** `backdrop-filter: blur()` is GPU-bound. Glass
  Aurora keeps blurred surfaces bounded (rail buttons, panels, the one
  hero card) and uses static gradients for the large orbs (no
  per-frame blur animation). `aurora-drift` is an opt-in transform loop
  and respects `prefers-reduced-motion` (the global reduce rule in
  globals.css zeroes animation/transition durations).
- **Decorative tree is inert.** The entire `AuroraBackground` (orbs,
  mountains, stars, noise) is `aria-hidden` + `pointer-events-none` and
  never traps focus or the cursor.
- **Rendering strategy.** Wallet/data-driven routes are
  `export const dynamic = 'force-dynamic'` (positions, dca, alerts,
  auto-repay, multi-chain, session-keys, governance, strategies, link,
  sign). They have no meaningful static HTML (entirely wallet-state
  driven; `/api/*` is rewritten to a runtime backend), so this is the
  correct strategy, not a workaround. Static informational routes
  (`/swap` `/lend` `/borrow` `/repay` `/withdraw` `/telegram` `/about`)
  stay statically prerendered.

---

## 8. Honest limitations

- **Dark-only.** No light theme; intentional.
- **Mobile nav is a sheet, not tabs.** The rail has 14 routes — too many
  for an honest 4-tab bar — so `< 640px` opens the full rail as a
  hamburger slide-in sheet.
- **Automation form controls keep legacy input styling.** `/dca`,
  `/alerts`, `/auto-repay`, `/multi-chain`, `/session-keys`,
  `/governance`, `/strategies` chrome-wrap the proven panels unchanged
  (their forms/effects/test contracts are high-risk to re-implement). The
  Glass shell/aurora/top-bar dress them; the inner inputs remain legacy
  styled. Deliberate fidelity/risk trade-off.
- **One unexplained RSC issue, mitigated.** After extracting
  `usePositionsData`, `/positions` static prerender failed with
  `WagmiProviderNotFound` (other Glass+wagmi routes prerender fine; root
  cause in Next's RSC client-reference graph not identified).
  `force-dynamic` resolves it and is the correct strategy for that route
  regardless. Logged for future investigation.
- **Legacy retained.** The feature flag, `lib/feature-flags.ts`, and
  `app/_archive/*.legacy.tsx` are intentionally kept through the
  dogfooding period. Removing them, deleting `_archive/`, and tagging the
  release is **Phase 5b**, after a week of flag-on dogfooding.
- **`/base` excluded.** The Farcaster/Base Mini App launch target is
  deferred (project Decision B) to avoid risking the verified embed flow.

---

## 9. Toggling

```bash
# apps/web/.env.local
NEXT_PUBLIC_GLASS_AURORA=1   # Glass Aurora
NEXT_PUBLIC_GLASS_AURORA=0   # legacy (production-safe default)
```

Per Vercel environment during dogfooding: Preview `=1`, Production `=0`
until Phase 5b.
