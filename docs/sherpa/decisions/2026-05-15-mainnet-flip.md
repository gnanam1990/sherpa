# Decision: Mainnet Flip (Stage 2 P6)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 2 P6

## Context
Sherpa needs to support Base Mainnet in addition to Base Sepolia. This is a configuration-driven flip, not a code change.

## Decisions

### Chain Configuration
- SHERPA_CHAIN env var: 'base-sepolia' | 'base-mainnet'
- chainId derived automatically (84532 or 8453)
- Hard cutover: Sepolia URL retires same day mainnet goes live

### Address Resolution
- Token addresses resolved by chainId
- Protocol addresses (Aerodrome, Aave) resolved by chainId
- Sepolia: from env vars (not deployed on-chain)
- Mainnet: hardcoded defaults + env override

### Safety Strictness
- Simulation fail-closed on mainnet (reject if sim fails)
- Simulation fail-open on Sepolia (allow if service down)
- Protocol fee REQUIRED on mainnet
- Treasury address REQUIRED on mainnet
- Startup validation blocks boot if mainnet config incomplete

### Pre-Flip Requirements
- External security audit complete
- All audit findings addressed
- Mainnet Coinbase Paymaster policy with caps
- Treasury wallet set up (2-of-3 Gnosis Safe)
- Mainnet Supabase project created
- Stage 2 P1-P5 working on Sepolia for 14+ days

## Rollback Plan
- Set SHERPA_CHAIN=base-sepolia in Railway + Vercel
- Redeploy both services
- All traffic returns to Sepolia

## Monitoring
- Intensified Sentry monitoring for 7 days post-flip
- Daily tx count and volume tracking
- Paymaster spend monitoring
- User-reported issue tracking
