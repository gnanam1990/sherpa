# Decision: NOTIFICATION — Multi-Channel Notification System (Stage 6 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 6 P2

## Context
Sherpa needs a unified notification system to deliver alerts and messages across multiple channels (push, email, Farcaster, Telegram). Users should be able to subscribe to conditions, set preferred channels, and view active notifications.

## Decisions

### Parser
- `NOTIFICATION` intent with three action modes:
  - `subscribe` — "notify me when ETH > 5000 via push" → sets up a condition-based notification
  - `set_channel` — "set my notification channel to email" → updates user preference
  - `list` — "show my notifications" → displays active subscriptions
- Regex patterns: `NOTIFY_RE`, `NOTIFY_CHANNEL_RE`, `NOTIFY_STATUS_RE`
- Supported channels: `push`, `email`, `farcaster`, `telegram`

### Dispatcher
- `dispatchNotification(channel, recipient, payload, deps)` — single entry point for all channels
- Channel-specific implementations in `notifications/channels/` (push, email, farcaster, telegram)
- Stubs return `{ success: true }` with placeholder message IDs until real integrations land
- Unsupported channels return `{ success: false, error }` gracefully

### Types
- `NotificationPayload` — title, body, optional data and imageUrl
- `NotificationResult` — success flag, optional messageId/error
- `ChannelConfig` — per-channel config (Vapid keys, Postmark API, Neynar API, Telegram bot token)
- `NotificationDeps` — wraps ChannelConfig for dependency injection

## Future Work
- Web Push protocol integration with VAPID keys
- Postmark/SendGrid for email delivery
- Telegram Bot API integration
- Farcaster via Neynar API
- Notification history persistence
- Rate limiting per channel
