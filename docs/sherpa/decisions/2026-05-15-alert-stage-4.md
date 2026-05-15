# Decision: ALERT - Price/Balance Triggers (Stage 4 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 4 P2

## Context
Sherpa needs ALERT intent for price/balance/health-factor notifications.

## Decisions
- 5-minute cron for price/balance alerts
- 1-minute cron for health-factor alerts (emergency)
- "Cross" comparison uses last_value for transition detection
- Default channel: web push
- Rate limiting: 1 trigger per 6 hours per alert
- Triggered intents notify only (no auto-execute)

## Future Work
- Webhooks for external integrations
- Email notifications
- Multi-condition alerts
