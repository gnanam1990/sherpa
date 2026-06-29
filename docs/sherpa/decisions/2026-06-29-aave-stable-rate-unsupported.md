# ADR: Reject Aave V3 stable-rate borrowing (Base is variable-only)

**Date:** 2026-06-29
**Status:** Accepted (off-chain); on-chain change deferred to next redeploy

## Context

Aave V3 has stable-rate borrowing disabled on Base (and protocol-wide). A
`borrow`/`repay` with `interestRateMode == 1` reverts at the Aave pool. The
Sherpa stack previously:

- accepted the `stable` keyword in the parser (`BORROW_RATE_RE`) and produced a
  `BORROW` intent with `interestMode: 'stable'`;
- silently downgraded it to variable in the executor (`planBorrow` hardcodes
  variable), so the user's stated intent was ignored without notice;
- `SherpaRouter.borrow()` / `repay()` accept `interestRateMode == 1` and rely on
  Aave's own revert.

## Decision

**Off-chain (shipped now):** reject stable-rate borrowing before a confirmation
is ever built, with a clear `STABLE_RATE_UNSUPPORTED` error code and the message
"Aave V3 on Base only supports variable-rate borrowing." Enforced at three
layers (defense-in-depth):

1. **Parser** (`packages/core/src/parser.ts`): `stable` is still recognized but
   flagged `slots.unsupported = true` with `unsupportedReason`, instead of being
   silently downgraded. The LLM prompt no longer offers `stable`.
2. **Planner** (`packages/core/src/executor.ts` `planBorrow`): refuses
   `interestMode === 'stable'` / `slots.unsupported`, returning
   `{ ok: false, error, errorCode: 'STABLE_RATE_UNSUPPORTED' }`.
3. **Calldata builder** (`packages/tools/src/aave/borrow-builder.ts`): both
   `buildBorrowCall` and `buildRepayCall` throw `StableRateUnsupportedError`
   (`code = 'STABLE_RATE_UNSUPPORTED'`) on `interestRateMode === 1`, so no path
   can produce stable-rate calldata.

## Deferred — on-chain (needs redeploy, do NOT change deployed bytecode)

Track a v-next `SherpaRouter` change to reject mode 1 explicitly with a custom
error `StableRateNotSupported()` (replacing reliance on Aave's revert) in
`borrow()`/`repay()`, and update the `ISherpaRouter` interface / `MIN_*` docs.
Until that redeploy, the **deployed contract relies on Aave's own revert** for
mode 1; the off-chain guards above ensure users never reach that path.

## Consequences

- A stable-rate borrow now yields a friendly refusal instead of a silent
  downgrade or an on-chain revert.
- The multi-chain Aave adapters (`arbitrum.ts`/`optimism.ts`/`polygon.ts`) still
  map `stable -> 1`; they are not on the Base production path. The v-next work
  should converge them on the same guard.
