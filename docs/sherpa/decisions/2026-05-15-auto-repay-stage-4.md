# Decision: AUTO_REPAY - Health Factor Protection (Stage 4 P3)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 4 P3

## Context
Sherpa needs AUTO_REPAY to protect Aave borrowers from liquidation.

## Decisions
- 1-minute cron for HF monitoring (emergencies move fast)
- Pre-authorization: large allowance at setup time
- 3 consecutive failures = auto-disable
- Notification: REQUIRED on every execution
- Max repay per execution: user-configurable, default $1000

## Security
- Capped: max $X per day
- Reversible: auto-disable after 3 failures
- Notified: always inform user
- Simulated: repay tx simulated before execution

## Future Work
- AUTO_BORROW_ON_DEPOSIT
- AUTO_WITHDRAW_ON_HF_HIGH
- Session keys for zero-signature
