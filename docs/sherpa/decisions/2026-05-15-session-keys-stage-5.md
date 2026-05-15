# Decision: Session Keys (Stage 5 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 5 P2

## Context
Sherpa needs session keys for zero-signature automation (DCA, alerts, auto-repay).

## Design Decisions
- Session keys are smart wallet sub-keys with limited permissions
- Each key has: spend limit, valid duration, target contracts, function selectors
- Keys can be revoked at any time
- Max 30 days validity, max $10,000 spend
- Max 10 permissions per key

## Security Model
- Ring 6 simulation still applies to session key transactions
- Spend tracking in DB (not just on-chain)
- Auto-revoke on spend limit exceeded
- Auto-revoke on max executions reached

## Integration Points
- DCA uses session keys for zero-signature execution
- Auto-repay uses session keys for emergency repayment
- Alerts can trigger session key transactions

## Future Work
- ERC-4337 paymaster integration for session keys
- Session key delegation (sub-keys)
- Cross-chain session keys
