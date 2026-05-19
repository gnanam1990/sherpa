# @sherpa/web

Sherpa web app — part of the Sherpa open source project. See the
[root README](../../README.md) for the full project overview, contracts, audit
status, and release posture.

Sherpa's web app — Next.js 15, App Router, port **3100** in dev.

Owner: M2 (frontend). Routes call the paymaster proxy at `/api/paymaster`, which is owned by M3 in `apps/api`.

## Environment

Copy `.env.example` to `.env.local` and fill in the values:

| Key | Where to get it | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_WC_PROJECT_ID` | [cloud.reown.com](https://cloud.reown.com) — free WalletConnect project ID | Public |
| `NEXT_PUBLIC_CDP_PROJECT_ID` | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) — Coinbase Developer Platform | Public |
| `SHERPA_PAYMASTER_RPC` (apps/api) | Coinbase CDP paymaster URL | **Secret — never inline in apps/web** |

Browser-side Sentry is wired through `@sentry/nextjs` in `instrumentation-client.ts`, `app/error.tsx`, and `app/global-error.tsx`. It is active when `NEXT_PUBLIC_SENTRY_DSN` is set; server-side errors on `apps/api` report when `SENTRY_DSN` is set.

The paymaster URL lives on `apps/api` because the browser must never see it (anyone with the URL can drain the gas budget). `apps/web` always calls `/api/paymaster` instead.

## Local dev

```bash
pnpm install
pnpm --filter @sherpa/ui --filter @sherpa/core --filter @sherpa/logger build
pnpm --filter @sherpa/web dev   # http://localhost:3100
```

The first build is required so workspace packages emit their `dist/` outputs — Next.js doesn't transpile them.

To run with the paymaster proxy too:

```bash
pnpm --filter @sherpa/api dev   # http://localhost:3001
pnpm --filter @sherpa/web dev   # http://localhost:3100
```

## Tests

```bash
pnpm --filter @sherpa/web test
pnpm --filter @sherpa/web exec vitest run --coverage
```

Coverage gate is 60% statements. New code should keep the project above that.

## Deploy

See [docs/sherpa/setup/STAGE_1_LAUNCH_CHECKLIST.md](../../docs/sherpa/setup/STAGE_1_LAUNCH_CHECKLIST.md) for the full Stage 1 deploy walkthrough — Vercel setup, env var provisioning, custom domain, smoke test, and rollback plan.

## Design system — Glass Aurora

The active design system is **Glass Aurora** — a dark, frosted-glass UI on
a mountain-aurora sky. It is a visual replacement only (same routes, data
flow, parser/safety/signing). Full reference:
[docs/design/GLASS_AURORA.md](../../docs/design/GLASS_AURORA.md). Source
design canvas was a Babel prototype, re-implemented in strict TypeScript
under `app/_components/glass/`.

It currently ships **behind a feature flag** during a one-week dogfooding
period (legacy UI is the flag-off default):

```bash
# apps/web/.env.local
NEXT_PUBLIC_GLASS_AURORA=1   # Glass Aurora
NEXT_PUBLIC_GLASS_AURORA=0   # legacy UI (production-safe default)
```

`lib/feature-flags.ts` reads this. Every route flag-branches; the legacy
render path for each is snapshotted in `app/_archive/*.legacy.tsx` for
one-command rollback (kept until Phase 5b). Production screenshots:
[docs/screenshots/glass-aurora/](../../docs/screenshots/glass-aurora/).

## Routes

| Path | File | Notes |
| --- | --- | --- |
| `/` | `app/page.tsx` → `GlassHome` \| `_components/HomeContent.tsx` | Home (connect + prompt); flag-branched |
| `/about` | `app/about/page.tsx` → `GlassAbout` \| `LegacyAbout` | Marketing page; flag-branched |
| `/not-found` | `app/not-found.tsx` | 404 handler |
| `/error` | `app/error.tsx` | Segment error boundary — reports to Sentry when configured |
| `/global-error` | `app/global-error.tsx` | Root error boundary — reports to Sentry when configured |
| `/loading` | `app/loading.tsx` | Skeleton shown during route transitions |

## Accessibility

- Focus visible: Base blue (`#0052FF`) 2px outline with 2px offset (globals.css)
- Skip-to-content link in `layout.tsx` jumps to `id="main-content"` on every page
- `prefers-reduced-motion` honored globally
- All icon-only links carry `aria-label`; decorative icons are `aria-hidden`
