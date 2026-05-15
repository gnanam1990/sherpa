# Decision: STAKE/BRIDGE/LP Intents (Stage 2 P7)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 2 P7 (Optional)

## Context
Sherpa needs STAKE, BRIDGE, and LP intents for Stage 2 completeness.

## Decisions

### STAKE (Lido)
- Liquid staking via Lido on Base
- stETH (rebasing) as default, wstETH optional
- No unbonding period on Base (liquid)
- Min stake: 0.01 ETH

### BRIDGE (Across)
- Base ↔ Ethereum, Base ↔ Optimism, Base ↔ Arbitrum
- Quote-based execution via Across API
- Fast finality (~30 seconds)
- Relayer fee displayed in card

### LP (Aerodrome)
- Full-range LP only for V1
- Two-asset provision (both sides of pair)
- Impermanent loss warning prominent in card
- LP tokens tracked in audit_log

## Future Work
- Concentrated LP (V2)
- STAKE via native CSM
- More bridge providers
