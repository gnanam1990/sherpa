# Decision: Strategy Marketplace (Stage 5 P3)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 5 P3

## Context
Sherpa needs a strategy marketplace for users to share and follow automated strategies.

## Design Decisions
- Strategies are templates of intents with parameters
- Public strategies can be discovered and followed
- Each user can customize parameters when following
- Execution history is tracked per-user

## Strategy Model
- A strategy contains: name, description, intents, parameters
- Intents are templates like "swap {{amount}} USDC for ETH"
- Parameters are user-configurable values
- Conditions control when steps execute

## Marketplace Features
- Browse public strategies sorted by followers/volume
- Follow/unfollow strategies
- Run strategies with custom parameters
- Track execution history and success rate

## Security
- Max 10 steps per strategy
- Only allowed intents (SWAP, LEND, BORROW, DCA, ALERT, AUTO_REPAY)
- Session keys for automated execution
- Ring 6 simulation applies

## Future Work
- Strategy analytics dashboard
- Revenue sharing with strategy creators
- Strategy composition (strategies calling strategies)
- AI-generated strategies from natural language
