# Decision: TIME_LOCK - Scheduled Transactions (Stage 4 P4)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 4 P4

## Context
Sherpa needs TIME_LOCK for scheduling future transactions.

## Decisions
- Parse relative times: "in 2 hours", "in 3 days"
- 1-minute minimum delay for safety
- Max 100 scheduled actions per user
- Stored in time_locks table
- Cron checks every minute for due actions

## Future Work
- Absolute time parsing ("at 3pm tomorrow")
- Conditional execution ("if ETH > $5000")
- Recurring schedules
