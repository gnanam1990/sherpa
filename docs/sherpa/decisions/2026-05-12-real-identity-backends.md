# Real identity backends — Neynar + Basenames + ENS (M3 Priority 2)

Date: 2026-05-12
Owner: M3
Branch: `feat/m3-week-1-priority-2`

## Context

`@sherpa/identity` shipped a regex dispatcher in P1 that routed to stubs
returning `api_error: backend not configured`. P2 wires real backends so
M1's tools (and the API surface) can resolve `@vitalik`, `vitalik.eth`,
`jesse.base.eth`, and direct addresses.

## Decisions

### 1. Neynar `/v2/farcaster/user/by_username`, prefer `verified_addresses`

`verified_addresses.eth_addresses[0]` over `custody_address`. Verified
addresses are the user's actively-signed proof of ownership; custody is
the Farcaster recovery key — sending USDC there can be unrecoverable for
users who delegated custody to a fid manager. Custody is a fallback only
when no verifieds exist.

`fetchImpl` injectable matches `tools/limitless.ts` for test parity.

### 2. Basenames: direct L2Resolver read, NOT viem `getEnsAddress`

The kickoff prompt said "viem `getEnsAddress` against the Basenames
resolver." Initial research found Base mainnet does **not** ship an ENS
Universal Resolver — viem's `base` chain config has no
`ensUniversalResolver` field (verified locally). `getEnsAddress` requires
a UR (it calls UR-specific `findResolver` / `resolve` methods); passing a
plain Resolver address would fail at runtime.

Decision (per clarifying-question reconciliation): call the L2Resolver's
`addr(bytes32 node)` method directly via `client.readContract`. This
matches what `github.com/base-org/basenames` examples do and is robust to
future UR deployments.

The L2Resolver address `0xC6d566A56A1aFf6508b41f6c90ff131615583BCD` is
hardcoded in `@sherpa/config`'s `ONCHAIN_ADDRESSES` constant, sourced from
the canonical Basenames repo. JSDoc explains the cross-chain pattern: the
runtime chain is Base Sepolia, but Basenames live on Base mainnet, so the
backend creates a dedicated mainnet client.

### 3. ENS: viem `getEnsAddress`, public RPC fallback

`viem/actions.getEnsAddress` works fine on Ethereum mainnet — the UR is
baked into viem's `mainnet` chain config. RPC URL: `ALCHEMY_ETH_MAINNET_RPC`
when set, falling back to `https://ethereum.publicnode.com` (Allnodes,
unmetered for read calls).

Tested by mocking `viem/actions` directly via `vi.mock` rather than
constructing a fake PublicClient — viem's internal call path is
implementation detail, the contract is "given a name, get an address."

### 4. Address backend on Base Sepolia: parallel reads, not Multicall3

The kickoff said "multicall (getCode + getTransactionCount)." Multicall3
batches **contract reads** into one `eth_call` to the Multicall3 contract.
`getTransactionCount` is an RPC method (`eth_getTransactionCount`), not a
contract call — it cannot be packed into Multicall3. The closest
optimization is `Promise.all([getTransactionCount, getCode])`, which
issues two RPC calls in parallel; same wall-clock as a real multicall
without the wrapping overhead.

`has_activity = nonce > 0`. `is_contract = code !== '0x'`. Both surface
in `metadata`. RPC failures degrade gracefully — the address still
resolves, just without activity metadata, because dropping the address on
a transient RPC blip is worse UX than showing it unwarned.

### 5. Layered cache: LRU(5000) → Vercel KV → backend

Two layers, write-through. LRU is closure-local per server instance. KV
is shared across instances and survives cold starts. When KV creds are
absent (local dev, tests), the LRU is the only layer.

Cache key: `resolve:${source}:${input.toLowerCase()}`. Inputs longer than
200 chars throw rather than risk multi-KB KV keys. The regex dispatcher
already filters them out; this is defense in depth.

TTLs per `docs/sherpa/SHERPA_FREE_TIER_GUIDE.md`:
- Farcaster 7d (usernames are sticky, fid rebinding is rare)
- Basenames 1h (mutable but slow-moving)
- ENS 1h
- Direct 0 (no caching — TTL would only save one multicall, the LRU
  doesn't have key churn for the same address)

Errors are NOT cached. A flaky upstream that returns `api_error` once
must retry on next call — caching errors would pin a real-but-temporary
outage at a 7-day TTL.

### 6. Empty-string env coercion (carrying PR #11 pattern)

All five new env vars use the `emptyToUndefined` preprocess from
`@sherpa/config`:
- `NEYNAR_API_KEY`
- `NEYNAR_BASE_URL`
- `ALCHEMY_ETH_MAINNET_RPC`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Same bug class as PR #11 bug 2 — `.env.example` ships these as empty
strings; `.optional()` alone wouldn't accept them.

### 7. `metadata.is_contract` is new on `ResolvedAddress`

Added an optional `is_contract?: boolean` to the metadata type. M2 can
render a contract-warning banner ("you're sending to a smart contract")
without making a second RPC call. Optional — older callers ignoring
metadata are unaffected.

## What about the original `resolve(input, backends)` signature?

Preserved. The dispatcher still accepts an optional `backends` object,
just the backend signature widened to return
`Promise<ResolvedAddress | ResolverError>` (was `… | null`) so backends
can distinguish 404s from network errors. M1's existing call sites are
unaffected — they only look at the success path or `isResolved()`.

The new `createResolver(opts)` factory in `index.ts` is the production
entry point. It builds backends from `SherpaConfig`, layers the cache,
and returns a single `(input) => Promise<…>` function. apps/api wires
this in once per server instance.

## Files

- `packages/config/src/index.ts` — env additions + `ONCHAIN_ADDRESSES.basenamesL2Resolver`
- `packages/identity/src/types.ts` — `metadata.is_contract`
- `packages/identity/src/cache.ts` — LRU + KV layered cache
- `packages/identity/src/farcaster.ts` — Neynar
- `packages/identity/src/basenames.ts` — L2Resolver direct read
- `packages/identity/src/ens.ts` — viem getEnsAddress on mainnet
- `packages/identity/src/address.ts` — direct + activity check
- `packages/identity/src/resolve.ts` — dispatcher (signature widened)
- `packages/identity/src/index.ts` — `createResolver(config)` factory
- `.env.example` — five new vars

## Tests

- `cache.test.ts` (7) — key format, length guard, LRU hit, KV→LRU
  promotion, write-through TTL, eviction, KV absent
- `farcaster.test.ts` (7) — endpoint shape, x-api-key header, verified
  preference, custody fallback, 404, 5xx, network throw, empty user
- `basenames.test.ts` (4) — `addr(node)` shape, default resolver address,
  zero-address → not_found, RPC throw, override
- `ens.test.ts` (3) — viem.getEnsAddress success, null → not_found,
  RPC throw → api_error
- `address.test.ts` (5) — invalid format, lowercase, has_activity,
  is_contract, RPC fallthrough
- `index.test.ts` (8) — dispatcher routing (incl. Basenames before ENS),
  no-backend api_error, factory cache hit, error-not-cached, missing key

Coverage on `@sherpa/identity`: **96.87% statements / 88.46% branches**
(gate 80%+). 137 → 167 tests across the workspace.

## Why the mocks are "smart" (carrying PR #11 lesson)

PR #11 caught two bugs that slipped past dumb mocks. Per user feedback,
this PR's mocks verify call shape, not just scripted responses:

- Farcaster mock: asserts the URL has `?username=<encoded>` and the
  `x-api-key` header is set
- Basenames mock: asserts `functionName === 'addr'` and the resolver
  address matches the override or default
- Cache mock: tracks every KV op and verifies LRU shields KV after first
  hit (would catch a regression that bypasses the LRU)
- Address mock: per-method behavior (throw on getTransactionCount,
  succeed on getCode) — would catch a fix that swallowed errors silently
