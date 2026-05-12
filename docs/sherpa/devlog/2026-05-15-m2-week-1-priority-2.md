# 2026-05-15 — M2 Week 1 Priority 2

## Scope

Priority 2 wires the ConfirmationCard end-to-end for the M2 web app. This PR owns the client/UI layer and does not redesign M3's API routes.

## Shipped in this PR

- Split `packages/ui/src/components.tsx` so `ConfirmationCard.tsx` owns transaction card UI and `components.tsx` keeps shared shell primitives.
- Render SEND, BUY, BET, BALANCE, and HISTORY confirmation variants using the serialized `@sherpa/core` card shape.
- Convert card UI from inline styles to Tailwind classes.
- Add pending, success, and failure card variants.
- Add `useExecuteConfirm` for exponential backoff polling: 1s, 2s, 3s, 5s, then 5s until 60s timeout.
- Wire Prompt -> parse -> confirmation -> execute -> wallet send -> confirmation polling with mocked API coverage.
- Add coverage thresholds: 70%+ statements for `packages/ui` and 60%+ statements for `apps/web`.

## Known cross-domain limitations

`/api/paymaster` is still M3's responsibility and is not on main yet. When the user taps Proceed and the executor returns an EIP-5792 batch with `paymasterService`, Coinbase Smart Wallet will try to use `/api/paymaster`; until M3 ships that proxy, the real sponsored transaction path can fail clearly after Proceed. The confirmation card UI, polling states, and success/failure UI still work with mocked API coverage.

M3 is expected to ship `/api/paymaster` in a parallel PR. Both M2 Priority 2 and the M3 paymaster proxy should merge before M2 Priority 3 starts so the demo can complete a real Sepolia transaction.

## M3 to add

- Add a read/status endpoint for confirmation polling. Current main has `POST /api/execute/:id/confirm` as a write callback; M2 needs a status read such as `GET /api/execute/:id/confirm` or an equivalent route.
- Status response should include `status`, `txHash`, and `error_detail` so M2 can render success/failure cards without parsing raw storage internals.
- Populate optional `risk_indicators` on `ConfirmationCardProps` when safety/risk data exists. M2 renders the field as optional so current responses stay compatible.
