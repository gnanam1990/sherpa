# Sherpa Stage 2 Audit Package

This folder contains everything needed to audit Stage 2 of Sherpa.

## Read in this order

1. **SCOPE.md** — what's in/out, deployment info, invariants, build instructions
2. **THREAT_MODEL.md** — 6-category attack-surface analysis
3. **AUDIT_REMEDIATION.md** — external review findings, fixes, and remaining blockers
4. **KNOWN_ISSUES.md** — acknowledged tradeoffs, what to skip
5. **MAINNET_READINESS.md** — mainnet go/no-go gates and deployment controls
6. **coverage-summary.txt** — test coverage report
7. **slither-summary.txt** / **slither.json** — static analysis findings
8. **gas-snapshot.txt** — gas cost per test case
9. **test-output.txt** — full test run output

## Base Sepolia deployment status

- Network: Base Sepolia (chainId 84532)
- Patched verified SherpaRouter: `0x7CfdE6a4D1A85236419d4343a3A466d0677A0056`
- SherpaTreasury: `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee`
- Contracts verified on basescan-sepolia
- Patched router deploy tx:
  `0x273084f0ee61bdd166a729ba319736e60f4fe2405a4ff2f690c6695e55f26b37`
- ⚠️ Aerodrome router on this testnet deployment is a **mock** — see
  KNOWN_ISSUES.md

## Repository

- GitHub: https://github.com/gnanam1990/sherpa
- Audit tag: `stage-2-pre-audit-v1.0.0` — canonical immutable reference
- Audit branch: `audit/stage-2` (points at the tag)

> Run `git checkout stage-2-pre-audit-v1.0.0`. The tag is the canonical source
> reference for review and matches the patched Base Sepolia router above.

## Snapshot of verification (reproducible)

| Check | Result |
|---|---|
| Foundry tests | 113 passed, 0 failed, 0 skipped |
| Coverage | SherpaRouter: 96.94% lines / 95.35% statements / 90.00% branches / 100% functions; SherpaTreasury, FeeCalculator, SafetyCheck: 100% |
| Slither | 0 high, 0 critical — 3 medium / 1 low / 7 informational, all disclosed in KNOWN_ISSUES.md |

## Mainnet readiness

Mainnet contract deployment is complete. The guarded script lives at
`packages/contracts/script/DeployMainnet.s.sol`, the go/no-go and post-deploy
record lives in `MAINNET_READINESS.md`, and the deployment artifact is
`deployments/base-mainnet.json`.

| Contract | Address | Basescan |
|---|---|---|
| SherpaRouter | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` | https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b |
| SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` | https://basescan.org/address/0xF4e72beAA559E1815f4671e39EDb1295aD975918 |

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
