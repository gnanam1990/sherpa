# Sherpa Stage 2 Audit Package

This folder contains everything needed to audit Stage 2 of Sherpa.

## Read in this order

1. **SCOPE.md** — what's in/out, deployment info, invariants, build instructions
2. **THREAT_MODEL.md** — 6-category attack-surface analysis
3. **AUDIT_REMEDIATION.md** — external review findings, fixes, and remaining blockers
4. **KNOWN_ISSUES.md** — acknowledged tradeoffs, what to skip
5. **coverage-summary.txt** — test coverage report
6. **slither-summary.txt** / **slither.json** — static analysis findings
7. **gas-snapshot.txt** — gas cost per test case
8. **test-output.txt** — full test run output

## Base Sepolia deployment status

- Network: Base Sepolia (chainId 84532)
- Previous verified SherpaRouter: `0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032`
- SherpaTreasury: `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee`
- Previous contracts verified on basescan-sepolia
- ⚠️ The router above predates the issue-report remediation that forwards
  borrowed funds to the user, decodes Aave reserve data, and validates swap
  route endpoints. Treat it as a historical smoke-test target until the patched
  router is redeployed.
- ⚠️ Aerodrome router on this testnet deployment is a **mock** — see
  KNOWN_ISSUES.md

## Repository

- GitHub: https://github.com/gnanam1990/sherpa
- Audit tag: `stage-2-pre-audit-v1.0.0` — canonical immutable reference
- Audit branch: `audit/stage-2` (points at the tag)

> Run `git checkout stage-2-pre-audit-v1.0.0`. The tag is the canonical source
> reference for review. The existing Base Sepolia address should be redeployed
> from this tag before any auditor relies on live bytecode behavior.

## Snapshot of verification (reproducible)

| Check | Result |
|---|---|
| Foundry tests | 113 passed, 0 failed, 0 skipped |
| Coverage | SherpaRouter: 96.94% lines / 95.35% statements / 90.00% branches / 100% functions; SherpaTreasury, FeeCalculator, SafetyCheck: 100% |
| Slither | 0 high, 0 critical — 3 medium / 1 low / 7 informational, all disclosed in KNOWN_ISSUES.md |

## Test the build

```bash
git clone https://github.com/gnanam1990/sherpa.git
cd sherpa
git checkout stage-2-pre-audit-v1.0.0
cd packages/contracts
forge install
forge test -vv
forge coverage --report summary --ir-minimum
```

> `--ir-minimum` is required for coverage because the project compiles with
> `via_ir = true`.

## Contact

- Primary: @0x_art (Twitter)
- Email: _[user fills in]_
- Telegram: _[user fills in]_
- Response within 24h for clarifications
