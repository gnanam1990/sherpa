# 2026-05-15 — M2 Week 1 Priority 1

## PR #17 shipment

Wallet connection ships in PR #17. The web app uses WalletConnect and Coinbase Smart Wallet on Base Sepolia, and wallet connection was verified locally at `localhost:3100`.

## Paymaster security fix

The public paymaster RPC env var was removed from apps/web. The browser must never receive the Coinbase Paymaster URL because `NEXT_PUBLIC_*` values are baked into the client bundle.

Wagmi sponsorship now points at the relative `/api/paymaster` proxy. The real paymaster RPC belongs in apps/api as `SHERPA_PAYMASTER_RPC` and stays server-side.

## Cross-domain blocker

The `/api/paymaster` route is M3's responsibility and is deferred to a follow-up PR. Wallet connection does not need the paymaster route, so it works before M3 ships the proxy. The first sponsored UserOp will return 404 until that route exists.

## M3 follow-up task spec

- Add `POST /api/paymaster`.
- Validate the connected wallet by recovering the address from the signed UserOp.
- Rate limit sponsored traffic to 3 UserOps per address per 24h.
- Write audit logs with `surface='paymaster'`.
- Forward valid requests to `env.SHERPA_PAYMASTER_RPC`.
- Expected scope: about 50 lines of code and about 30 minutes of M3 work.
