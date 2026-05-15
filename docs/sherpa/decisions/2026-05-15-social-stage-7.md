# Decision: SOCIAL Intent (Stage 7 P3)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 7 P3

## Context
Sherpa needs SOCIAL intent for social trading features — following users, copy trading, viewing leaderboards, and checking profiles.

## Decisions

### Supported Actions
- **follow**: Follow a user by handle or address
- **copy_trade**: Mirror another user's trades
- **leaderboard**: View ranked traders
- **profile**: View own or another user's social profile

### Parser Patterns
- `follow @alice` → `socialAction: 'follow', socialTarget: '@alice'`
- `copy trade @bob` → `socialAction: 'copy_trade', socialTarget: '@bob'`
- `show leaderboard` → `socialAction: 'leaderboard'`
- `view my profile` → `socialAction: 'profile'`

### Social Tools Module
- `getProfile(address)` — returns `SocialUser` with followers, following, volume, success rate, rank
- `getLeaderboard()` — returns ranked list of `SocialUser`
- `startCopyTrade(settings)` — begins mirroring a trader
- `stopCopyTrade(traderAddress)` — stops mirroring
- `getCopyTradeStatus(traderAddress)` — returns current copy trade state

### Types
- `SocialUser` — address, farcasterUsername, fid, displayName, avatarUrl, followers, following, totalVolume, successRate, rank
- `CopyTradeSettings` — traderAddress, maxAmountPerTrade, maxDailyAmount, enabledIntents
- `SocialDeps` — optional apiUrl

## Future Work
- Real Farcaster/Lens protocol integration
- Social graph traversal (followers of followers)
- Copy trade risk scoring and alerts
- Profile NFT gallery display
