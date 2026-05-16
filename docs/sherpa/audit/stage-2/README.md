# Sherpa Stage 2 Audit Package

This folder contains everything needed to audit Stage 2 of Sherpa.

## Read in this order

1. **SCOPE.md** — what's in/out, deployment info, invariants, build instructions
2. **THREAT_MODEL.md** — 6-category attack-surface analysis
3. **KNOWN_ISSUES.md** — acknowledged tradeoffs, what to skip
4. **coverage-summary.txt** — test coverage report
5. **slither-summary.txt** / **slither.json** — static analysis findings
6. **gas-snapshot.txt** — gas cost per test case
7. **test-output.txt** — full test run output

## Live deployed contracts (audit target)

- Network: Base Sepolia (chainId 84532)
- SherpaRouter: `0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032`
- SherpaTreasury: `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee`
- All contracts verified on basescan-sepolia
- ⚠️ Aerodrome router on this target is a **mock** — see KNOWN_ISSUES.md

## Repository

- GitHub: https://github.com/gnanam1990/sherpa
- Audit tag: `stage-2-pre-audit-v1.0.0` — canonical immutable reference
- Audit branch: `audit/stage-2` (frozen, points at the tag)

> Run `git checkout stage-2-pre-audit-v1.0.0`. Its parent `944d7e3` is the
> deployment-record commit; this docs package sits one commit above it.

## Snapshot of verification (reproducible)

| Check | Result |
|---|---|
| Foundry tests | 101 passed, 0 failed, 0 skipped |
| Coverage | 100% on all 4 in-scope units (SherpaRouter, SherpaTreasury, FeeCalculator, SafetyCheck) |
| Slither | 0 high, 0 critical — 4 medium / 2 low / 5 informational, all disclosed in KNOWN_ISSUES.md |

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
