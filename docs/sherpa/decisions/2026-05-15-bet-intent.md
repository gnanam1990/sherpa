# Decision: BET Intent (Stage 3 P3)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 3 P3

## Context
Sherpa needs BET intent for prediction market integration.

## Decisions

### Market Providers
- Limitless: primary (Base-native, biggest Base prediction market)
- PolyForge: fallback (existing project)

### Market Matching
- Keyword search for V1 (simpler, faster)
- Pick most-liquid market when multiple match
- Cosine similarity for V2

### Fee
- 0.5% on entry only (matches markets' own fees)

## Future Work
- BET history tracking
- Resolution notifications
- Embedding-based market matching
