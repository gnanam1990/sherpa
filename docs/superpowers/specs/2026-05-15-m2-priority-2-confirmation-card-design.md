# M2 Priority 2 Confirmation Card Design

## Context

Priority 2 turns the current preview-only card into a complete transaction workspace. Baseline on `feat/m2-week-1-priority-2` is clean: install, typecheck, lint, tests, and web dev render pass. The implementation stays in M2-owned UI and web files and treats `apps/api/src/server.ts` as the current M3 contract.

## Chosen Approach

Use a dashboard-style transaction surface: compact hierarchy, status badges, explicit steps, semantic state cards, and restrained motion. This matches Sherpa's operator/task UI better than an editorial or decorative card.

The card split is small and direct:

- `packages/ui/src/ConfirmationCard.tsx` owns confirmation, pending, success, failure, risk, and sponsored badge components.
- `packages/ui/src/components.tsx` keeps only the shared `Shell` wrapper.
- `packages/ui/src/index.ts` exports the new card module.
- `apps/web/app/_components/Prompt.tsx` owns the action flow state and renders the card variants.
- `apps/web/app/_components/useExecuteConfirm.ts` owns polling/backoff and is tested independently.

## Data Flow

The user enters text in `Prompt`, then M2 calls the existing M3 endpoints:

- Preview: `POST /api/parse` with `{ input, userKey }`.
- Execute: `POST /api/execute` with `{ input, userAddress }`.
- Wallet action: if the returned card has `batch`, M2 submits `wallet_sendCalls` through `useSherpaSendCalls`.
- Confirmation status: `useExecuteConfirm` polls `GET /api/execute/:id/confirm` with 1s, 2s, 3s, 5s, then 5s intervals until success, failure, or 60s timeout.

Current M3 main only has `POST /api/execute/:id/confirm` as a write callback. The missing read/status contract is documented in the devlog as an M3 follow-up. Until that lands, real polling can fail clearly while mocked API tests prove the M2 flow.

## Card Behavior

`ConfirmationCard` renders SEND, BUY, BET, BALANCE, and HISTORY using the serialized shape produced from `@sherpa/core.ConfirmationCardProps`:

- Header combines action and amount, such as `Send 5 USDC`.
- Body shows recipient, resolver metadata, secondary amount, gas, ETA, warnings, risk indicators, and all steps.
- Stage 1 always shows all steps because SEND/BUY/BET are 1-2 steps.
- Sponsored gas renders a `SponsoredBadge` when `gas_display` contains `sponsored` or the batch includes `paymasterService`.
- `Proceed` and `Cancel` are explicit `type="button"` actions.
- Mobile width 375px uses compact text, no raw payload panel, and no nested scroll area.

Success and failure replace the confirmation card:

- Success shows tx hash, Basescan link, and `Send another`.
- Failure maps known raw `error_detail` values to plain English, shows `We tried to: ...`, and offers `Try again`, `Edit and retry`, and `Send another`.
- `Send another` clears input, parsed intent, current card, and execution state, keeps wallet/session state, and focuses the prompt input.
- `Edit and retry` keeps the original input, clears failure state, and focuses the prompt input.
- `Try again` re-runs execute with the same input and wallet params.

## Error Translation

Known raw errors map to readable copy:

- `INSUFFICIENT_FUNDS_FOR_GAS` -> `Not enough Sepolia ETH for gas`
- `RECIPIENT_INVALID` -> `Recipient address couldn't be resolved`
- `SIMULATION_FAILED` -> `Transaction would fail. Try a smaller amount or different recipient.`
- `TIMEOUT` -> `Transaction took too long. Check basescan with the tx hash.`
- default -> raw detail string

## M3 Gaps To Document

M2 will document these as M3 follow-ups without changing M3 endpoints in this PR:

- Add a read/status polling contract for `GET /api/execute/:id/confirm` or equivalent. The current `POST` route only writes confirmation state.
- Include `status`, `txHash`, and `error_detail` in the status response.
- Populate optional `risk_indicators` on confirmation cards when M3/safety has risk details to surface.
- Ship `/api/paymaster`; until then sponsored `wallet_sendCalls` can fail clearly after Proceed.

## Tests

TDD implementation will add failing tests first:

- `packages/ui/src/ConfirmationCard.test.tsx`: SEND, BUY, BET, BALANCE, HISTORY render cases, action buttons, risk badges, sponsored badge, success/failure cards, mobile 375px snapshot.
- `apps/web/app/_components/useExecuteConfirm.test.tsx`: backoff sequence, 30s long-wait copy, 60s timeout, success, failure, and error mapping.
- `apps/web/app/_components/Prompt.test.tsx`: mocked API end-to-end Prompt -> parse -> confirmation card -> execute -> wallet send -> confirm poll -> success/failure.
- Coverage commands will enforce 70%+ statements for `packages/ui` and 60%+ statements for `apps/web` via Vitest coverage thresholds.
