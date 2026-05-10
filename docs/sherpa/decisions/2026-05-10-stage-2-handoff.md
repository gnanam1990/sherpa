# Stage 2 handoff notes

Date: 2026-05-10
Context: End of Priority 3 — pause point before Stage 2

## State of M1's domain
- All Stage 1 + Stage 2 adapters scaffolded (USDC, Limitless, Uniswap, Aerodrome, Morpho, Aave, Onramp, Balance, Basescan)
- 7 safety rings: 1, 2, 3, 4, 6 implemented; 5 in API layer; 7 client-side
- Parser: deterministic + LLM fallback for 8 intents (5 active, 3 stubbed)
- Executor: handles SEND, BUY, BET, DEPOSIT, BALANCE, HISTORY end-to-end
- LLM router: 3 providers, fallback chain, $50/day spend cap
- 119 tests passing across 8 packages

## Open items for Stage 2
- Wire SWAP intent in executor (compare Aerodrome vs Uniswap quotes)
- Wire LEND intent (Morpho primary, Aave fallback, real APY reads)
- Real Sepolia addresses for Aerodrome/Morpho/Aave (currently undefined)
- Replace per-process spend cap with M3 Postgres-backed counter
- Real Limitless API endpoint validation (currently best-guess shape)

## Pause rationale
M1 has shipped 3 PRs in one day (PR #6, #8, #9). Stage 2 work blocked behind:
1. M2 needs to wire real wallet (apps/web) for end-to-end demo
2. M3 needs Postgres migrations + Neynar wiring for production audit log
3. Real Sepolia addresses for Aerodrome/Morpho/Aave need team contact or research

Resuming M1 work in parallel with M2/M3 once their Day 1 lands.

## Tech debt added in PR #10 (M3 P1)
- audit_log has redundant columns: intent (TEXT) + parsed_intent (JSONB),
  plan_hash (TEXT) + plan (JSONB). M1 writes to legacy fields today.
  Resolve in M1 Stage 2 by switching writes to JSONB columns and dropping
  TEXT columns in migration 0005 (or wherever the next M1-touching
  migration lands).
