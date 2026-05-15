# Decision: Telegram Bot (Stage 3 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 3 P2

## Context
Sherpa needs a Telegram bot to reach Asian and non-Farcaster crypto users.

## Decisions

### Why Telegram
- Massive user base, especially in Asia
- Fewer crypto-native barriers than Farcaster
- Rich bot API with inline keyboards

### Signing Flow
- Telegram CAN'T host Smart Wallet Passkeys
- Bot generates one-time signing URL (5min expiry)
- User opens in browser → connects wallet → signs
- Webhook back to bot → confirmation message

### User Auth
- Telegram user ID → Smart Wallet address mapping
- Two flows: existing wallet link OR new wallet creation
- Single-user (whitelist) for first 7 days

## Future Work
- Telegram Mini Apps (TMA) for full UX
- Telegram Stars for fee handling
