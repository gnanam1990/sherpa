# Audit Firm Selection

## Overview

Sherpa requires a smart contract audit before mainnet deployment of `SherpaRouter` and `SherpaTreasury`. This document evaluates three leading audit firms.

## Firm Comparison

| Criteria | Code4rena | Spearbit | Trail of Bits |
|---|---|---|---|
| **Model** | Competitive audit contests | Boutique firm | Full-service security firm |
| **Cost** | $3–8k (contest pool) | $8–15k | $15–20k+ |
| **Timeline** | 1–2 weeks (contest) | 2–4 weeks | 4–6 weeks |
| **Deliverable** | Findings from multiple auditors | 1 senior auditor + review | Formal report + tooling |
| **Best For** | Broad coverage, fast turnaround | Deep DeFi expertise | Enterprise-grade assurance |
| **Reputation** | High (open competitions) | High (DeFi specialists) | Very high (industry standard) |

## Sherpa Contract Summary

- **Lines of code**: ~300 (SherpaRouter: 193, SherpaTreasury: 83, libraries: 54)
- **Complexity**: Low-medium (integrations with Aerodrome + Aave)
- **Dependencies**: OpenZeppelin v5 (Ownable, ReentrancyGuard, SafeERC20)

## Recommendation

**Phase 1 (Pre-launch)**: Code4rena contest — $3–5k, 1 week, broad coverage for the small contract surface.

**Phase 2 (Post-launch)**: Spearbit or Trail of Bits deep audit — $10–15k, 2–4 weeks, covering session keys (Stage 7) and automation (Stage 4).

## Timeline

| Milestone | Target |
|---|---|
| Firm engaged | Week 1 |
| Code freeze | Week 1 |
| Audit begins | Week 2 |
| Findings received | Week 3 |
| Fixes applied | Week 3–4 |
| Re-audit (if needed) | Week 4 |
| Report published | Week 5 |

## Budget

| Item | Cost |
|---|---|
| Phase 1 audit (Code4rena) | $5,000 |
| Phase 2 audit (Spearbit) | $12,000 |
| Internal review tooling (Slither, Mythril) | $0 (open source) |
| **Total** | **$17,000** |
