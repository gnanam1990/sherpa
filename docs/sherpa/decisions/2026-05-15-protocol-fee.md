# Decision: 0.1% Protocol Fee

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 2 P5

## Context
Sherpa needs a protocol fee mechanism to generate revenue from SWAP and BRIDGE intents.

## Decisions

### Fee Model
- Basis points (bps) for precision: 10 bps = 0.1%
- Fee taken in output asset (simpler, user already approved input)
- No smart contract initially (avoids audit gate)
- Configurable per-intent type via env vars

### Implementation
- Fee as ERC-20 transfer call appended to swap calls
- Treasury address from env var (EOA or multisig)
- Fee disabled on Sepolia (SHERPA_FEE_ENABLED=false)
- Fee enabled on mainnet (SHERPA_FEE_ENABLED=true)

### Safety
- Treasury address in allowlist (Ring 4)
- Fee amount validated against max bps
- Fee transfer logged in audit trail

## Future Work
- Smart contract fee taker if volume warrants
- Per-intent fee configuration (SWAP 0.1%, BRIDGE 0.2%)
- Fee revenue reporting dashboard
