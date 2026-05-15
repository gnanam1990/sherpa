# ADR: AI Agent (Stage 9 P1)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 9 — AI Agent

## Context

Sherpa needs a conversational AI layer that remembers user preferences, explains DeFi concepts, and can plan multi-step strategies — all without requiring on-chain transactions for every interaction.

## Decision

### Memory System
- In-memory `MemoryStore` (Map-backed) per user address, categorized by `preference | fact | goal | risk | strategy`.
- Importance scoring (1-10) controls ranking in search results.
- `forget()` filters by substring match and returns count of removed entries.

### Concept Explainer
- Static lookup table (`explainer.ts`) covers core DeFi concepts: swap, health factor, staking, bridge, LP, lend, borrow, DCA, yield.
- Substring fallback matches partial topics before returning a graceful "I don't have" message.
- No LLM dependency — deterministic explanations for auditability.

### Parser Integration
- Five new regex patterns in `parseDeterministic()`:
  - `AI_REMEMBER_RE` — "remember/save/note that ..."
  - `AI_FORGET_RE` — "forget/delete/remove ..."
  - `AI_CONTEXT_RE` — "what do you know about me"
  - `AI_PLAN_RE` — "plan/create plan/make plan for ..."
  - `AI_EXPLAIN_RE` — "explain/describe/tell me about ..."
- All produce `AI_AGENT` intent with appropriate `aiAction` slot.
- `AI_AGENT` added to `VALID_INTENTS` allowlist for LLM fallback.

### Conversation Context
- `ConversationStore` caps at 50 messages per user (FIFO eviction).
- No persistence — conversations are session-scoped.

## Alternatives Considered

1. **Vector embeddings for memory search** — deferred to Stage 9 P2; substring search is sufficient for initial launch.
2. **LLM-powered explanations** — rejected for P1; static table ensures deterministic cost and latency.

## Consequences

- +3 new test files, +1 parser test block, +2 doc files.
- Zero on-chain calls from AI_AGENT intent (all `calls: []`).
- Memory is ephemeral (lost on restart) — acceptable for P1.
