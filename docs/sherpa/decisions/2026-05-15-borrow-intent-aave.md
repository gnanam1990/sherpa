# Decision: BORROW Intent via Aave V3

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 2 P4

## Context

Sherpa needs a BORROW intent that lets users take loans against their Aave collateral using natural language.

## Decisions

### Health Factor Display
- Health factor is shown prominently in ConfirmationCard
- Risk badges: HF < 1.1 = red (danger), HF < 1.5 = yellow (warning)
- Post-borrow HF computed before execution

### Interest Rate Mode
- Default: variable (Aave V3's actual default)
- User can specify "at stable rate" or "at variable rate"

### Risk Assessment
- HF < 1.1: HEALTH_FACTOR_DANGER badge, block execution
- HF < 1.5: HEALTH_FACTOR_WARNING badge, warn but allow
- Borrow utilization > 80%: HIGH_BORROW_UTILIZATION badge

### Collateral Inference
- If user doesn't specify collateral: infer from largest Aave deposit
- Show inferred collateral in ConfirmationCard
- Allow override via "against X" syntax

### Target Health Factor
- If user specifies "health factor 2.0": enforceable
- If current borrow can't achieve target: error with reason

## Future Work
- AUTO_REPAY (Stage 4 P3): automatic repayment when HF drops
- Notification when HF drops below user threshold
- Session keys for automated borrow management
