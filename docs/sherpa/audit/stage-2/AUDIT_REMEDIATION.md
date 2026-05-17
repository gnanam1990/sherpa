# Sherpa Stage 2 Audit Remediation Summary

Date: 2026-05-17

This document maps the two external Stage 2 review rounds to the remediation
commits currently published on `main`, `audit/stage-2`, and
`stage-2-pre-audit-v1.0.0`.

## Current status

| Item | Status |
|---|---|
| External review round 1 | Complete |
| External review round 2 | Complete |
| Finding remediation | Complete in source |
| Final audit source tag | `stage-2-pre-audit-v1.0.0` |
| Final remediated source commit | `b3fb02ab623aef26d071c6e02b1e8d60cab111c9` |
| Audit package head | The `stage-2-pre-audit-v1.0.0` tag includes this remediation summary on top of the remediated source. |
| Patched Base Sepolia router redeploy | Pending |
| Mainnet launch | Blocked until redeploy, final sign-off, and multisig |

## Review sources

| Round | Source | Reference |
|---|---|---|
| External review round 1 | GitHub issues #34-#40 | `reports/external-review-1-github-issues.md` |
| External review round 2 | Stage 2 issue report | `reports/external-review-2-stage-2-issue-report.md` |

## Remediation commits

| Commit | Purpose |
|---|---|
| `c664cb1c9211abb31334755bb7efa3f1fcc6e053` | Resolved external review round 1 findings #34-#40. |
| `b3fb02ab623aef26d071c6e02b1e8d60cab111c9` | Resolved external review round 2 findings and refreshed audit artifacts. |

## Finding matrix

### External review round 1

| ID | Severity | Finding | Status | Remediation |
|---|---:|---|---|---|
| #34 / M-1 | Medium | Missing slippage validation in `swap`; `SafetyCheck` library unused. | Fixed | `swap` now validates quote-derived slippage through `SafetyCheck.validateSlippage`; tests cover below-minimum, excessive, and strict `amountOutMin` cases. Commit: `c664cb1`. |
| #35 / M-2 | Medium | `withdraw` event emitted requested amount rather than actual withdrawn amount. | Fixed | `withdraw` now emits the actual amount returned by Aave and refunds unused aTokens when Aave withdraws less than requested. Commit: `c664cb1`. |
| #36 / L-1 | Low | No emergency pause mechanism. | Fixed | `SherpaRouter` now inherits `Pausable`; owner-only `pause` / `unpause` gate user-facing DeFi operations while allowlist removal remains available. Commit: `c664cb1`. |
| #37 / L-2 | Low | Borrow health-factor threshold was aggressive at `1.2e18`. | Fixed | Borrow minimum health factor raised to `1.5e18`, matching the withdraw debt guard. Commit: `c664cb1`. |
| #38 / L-3 | Low | `repay` did not refund excess when actual repaid amount was lower than requested amount. | Fixed | `repay` now refunds `amount - repaid`; tests cover overpayment. Commit: `c664cb1`. |
| #39 / I-1 | Informational | `SafetyCheck` library imported but only partially used. | Fixed | `swap` now uses `SafetyCheck.validateDeadline` and the internal slippage guard uses `SafetyCheck.validateSlippage`. Commit: `c664cb1`. |
| #40 / I-2 | Informational | No batch completion event for `batchSetSwapTokenAllowed`. | Fixed | `BatchTokenAllowlistUpdated` event added and emitted after successful batch updates. Commit: `c664cb1`. |

### External review round 2

| ID | Severity | Finding | Status | Remediation |
|---|---:|---|---|---|
| ER2-1 | High | `borrow()` created debt for the user but left borrowed funds in the router. | Fixed | After Aave `borrow`, router now transfers the borrowed asset to `msg.sender`; mock Aave now sends borrowed funds to its caller; tests assert user receives borrowed funds. Commit: `b3fb02a`. |
| ER2-2 | High | `withdraw()` used non-standard Aave Pool function `getReserveAToken`. | Fixed | Router now fetches the aToken by staticcalling Aave V3 `getReserveData(address)` and decoding the `aTokenAddress` return word with success, length, and zero-address checks; mock interface updated. Commit: `b3fb02a`. |
| ER2-3 | Medium / High | `repay()` could strand overpayments in the router. | Already fixed | Fixed in round 1 by refunding `amount - repaid`; round 2 artifacts include the passing overpayment regression test. Commits: `c664cb1`, verified in `b3fb02a`. |
| ER2-4 | Medium | `swap()` did not validate route endpoints against `tokenIn` / `tokenOut`. | Fixed | Stage 2 swaps now require exactly one route and require `routes[0].from == tokenIn` and `routes[0].to == tokenOut`; tests cover mismatched endpoints and multi-hop rejection. Commit: `b3fb02a`. |
| ER2-5 | Low | Audit package referenced missing tag / branch. | Fixed | Remote audit branch `audit/stage-2` and annotated tag `stage-2-pre-audit-v1.0.0` now exist and resolve to commit `b3fb02a`. |

## Verification after remediation

The final source reference at `b3fb02a` was verified with:

```bash
pnpm --filter @sherpa/contracts test
pnpm --filter @sherpa/contracts build
pnpm -r typecheck
pnpm -r test
pnpm -r build
forge coverage --report summary --ir-minimum
slither . --filter-paths 'lib/,test/' --exclude-dependencies
```

Results:

| Check | Result |
|---|---|
| Foundry tests | 113 passed, 0 failed, 0 skipped |
| Workspace tests | Passed |
| Workspace typecheck | Passed |
| Workspace build | Passed |
| Slither | 0 high, 0 critical; reviewed residue documented in `KNOWN_ISSUES.md` |
| Coverage | Router 96.94% lines / 95.35% statements / 90.00% branches / 100% functions; Treasury, FeeCalculator, SafetyCheck 100% |

## Remaining launch blockers

1. Redeploy the patched `SherpaRouter` to Base Sepolia from commit `b3fb02a`.
2. Update `deployments/base-sepolia.json`, `README.md`, and `SCOPE.md` with the
   new router address and verification link.
3. Send this remediation summary, the final tag, and the new Basescan link back
   to the external reviewers for final acknowledgement.
4. Use a fresh mainnet deployer or Safe multisig. Do not use any private key
   that has appeared in chat or terminal history for mainnet assets.
