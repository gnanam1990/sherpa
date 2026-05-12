# Stage 1 launch checklist

Walkthrough for taking `apps/web` + `apps/api` from local-only to a live Vercel deployment on Base Sepolia.

## 1. Vercel project setup

Two projects, one repo:

| Project | Root directory | Framework | Build command |
| --- | --- | --- | --- |
| `sherpa-web` | `apps/web` | Next.js | (auto) |
| `sherpa-api` | `apps/api` | Other | `pnpm --filter @sherpa/api build` |

```bash
# From repo root, one-time:
vercel link --project sherpa-web --cwd apps/web
vercel link --project sherpa-api --cwd apps/api
```

Both projects need workspace builds before deploy. Add to `vercel.json` at the repo root (or the equivalent build settings in the UI):

```json
{
  "buildCommand": "pnpm install --frozen-lockfile && pnpm --filter @sherpa/ui --filter @sherpa/core --filter @sherpa/logger --filter @sherpa/memory --filter @sherpa/config build && pnpm --filter $VERCEL_PROJECT build"
}
```

## 2. Environment variables

Required for **`sherpa-web`** (Production + Preview):

| Key | Value | Secret? | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_WC_PROJECT_ID` | from cloud.reown.com | Public | WalletConnect — required for Coinbase Smart Wallet connection |
| `NEXT_PUBLIC_CDP_PROJECT_ID` | from portal.cdp.coinbase.com | Public | Coinbase Developer Platform identifier |
| `NEXT_PUBLIC_SENTRY_DSN` | from sentry.io browser project | Public by design | **Deferred** — wired in follow-up PR via `@sentry/nextjs` (see notes below). Reserve the slot in the dashboard so it's ready when the follow-up lands. |

Required for **`sherpa-api`** (Production + Preview):

| Key | Value | Secret? | Notes |
| --- | --- | --- | --- |
| `SHERPA_PAYMASTER_RPC` | Coinbase CDP paymaster URL | **Secret — server only** | Anyone with this URL can drain the gas budget |
| `DATABASE_URL` | Supabase pooler URL | Secret | Transaction-mode pooler (see DATABASE_SETUP.md) |
| `SHERPA_USE_REAL_DB` | `true` | Public | Falls back to in-memory if `false` |
| `SENTRY_DSN` | from sentry.io node project | Secret | **Different DSN than browser** — Sentry scopes by platform |

Provision with:

```bash
vercel env add NEXT_PUBLIC_WC_PROJECT_ID production --cwd apps/web
vercel env add NEXT_PUBLIC_WC_PROJECT_ID preview --cwd apps/web
# ... repeat for each key + each env
```

Or paste in the dashboard UI under Settings → Environment Variables.

## 3. Custom domain

In the `sherpa-web` project: Settings → Domains → add `sherpa.app` (or whichever apex) and the `www.` alias. Vercel auto-provisions the TLS cert.

The API surface stays on its own subdomain — wire `api.sherpa.app` to the `sherpa-api` project. Then update the Next.js rewrite (or use `NEXT_PUBLIC_API_BASE`) so `/api/paymaster` proxies cross-origin if you split surfaces.

For Stage 1, **keep both surfaces on one project** (`apps/api` mounted as Next.js Route Handlers) to avoid CORS — that's the simpler path and matches the current code. The two-project layout above is the path for Stage 2 if you want to scale them independently.

## 4. Smoke test plan

Before announcing the deploy, do this in order on the live URL:

1. **Cold load**: open the prod URL in an incognito window. `/` should render the hero in under 2 seconds. No console errors. Sentry session start visible in the dashboard.
2. **Marketing**: navigate `/` → `/about`. All sections render. FAQ items expand. All three footer social links resolve (200).
3. **Connect**: click Connect → Coinbase Smart Wallet → passkey provisioning. Confirm wallet address appears in the header.
4. **Send (Sepolia)**: type `send 0.001 ETH to <test address>`. Confirmation card renders with correct amount + recipient. Sign with passkey. Tx appears on Sepolia basescan within ~10 seconds. **Gas should be sponsored** (your wallet balance unchanged).
5. **Error path**: open devtools → throw a render error in a component → `app/error.tsx` should render with "Something went wrong" + Refresh CTA. Confirm the error appears in Sentry within 60 seconds.
6. **404**: navigate to `/this-does-not-exist`. ASCII art renders. Back-to-home link works.
7. **A11y**: Tab through `/` and `/about` from the URL bar. Focus visible on every step, logical order. Skip-to-content link appears on first Tab.

If any step fails, **do not announce**. Investigate first.

## 5. Rollback plan

Two layers:

**Layer 1 — Vercel deployment rollback** (instant):

```bash
vercel rollback --cwd apps/web
# Or from the dashboard: Deployments → previous deployment → Promote to production
```

This switches the production alias back to the last good deployment. Takes ~30 seconds. No DNS change.

**Layer 2 — Git revert** (for the code itself):

```bash
git revert <bad-merge-sha>   # creates a revert commit
git push origin main         # triggers a fresh deploy via the revert
```

Use Layer 1 first to stop the bleeding, then Layer 2 to keep `main` clean.

**If the paymaster is compromised** (URL leaked, budget drained):

1. Rotate the paymaster URL on Coinbase CDP immediately.
2. Update `SHERPA_PAYMASTER_RPC` on `sherpa-api` Production and Preview.
3. Redeploy `sherpa-api` (the new env vars apply on next build).
4. Add a post-mortem entry under `docs/sherpa/devlog/`.

## 6. Deferred follow-up: browser Sentry

This PR's error boundary (`apps/web/app/error.tsx`) catches render errors and shows the recovery UI, but it logs to `console.error` instead of reporting to Sentry. The reason: `@sentry/browser`'s presence in `apps/web`'s dependency tree caused a wagmi peer-resolution conflict that broke Next.js static export of `/`. Lazy importing didn't help — the issue is the install-time peer resolution, not the runtime import.

The fix is to switch to `@sentry/nextjs` instead, which is the canonical Next.js path (auto-instrumentation, sourcemap upload, edge support). That's a small follow-up PR. Until it lands:

- Browser errors are visible in DevTools console
- `apps/api` errors still report to Sentry via `@sherpa/logger`
- The `NEXT_PUBLIC_SENTRY_DSN` env var stays documented but unused

## 7. Performance gates

Lighthouse CI runs on PRs (see `.github/workflows/lighthouse.yml`) and asserts:

- Performance ≥ 90
- Accessibility ≥ 95
- Best Practices ≥ 90

A build below threshold blocks the PR. Re-run locally with:

```bash
pnpm --filter @sherpa/web build
pnpm --filter @sherpa/web start &
pnpm exec lhci autorun --config=./apps/web/lighthouserc.json
```
