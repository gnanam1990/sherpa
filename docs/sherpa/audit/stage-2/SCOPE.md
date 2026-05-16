# Sherpa Stage 2 — Audit Scope

## Project

**Sherpa** — natural-language DeFi agent on Base L2. Users describe an
intent ("swap 100 USDC for ETH", "lend 50 USDC to Aave"); Sherpa builds and
executes safe on-chain transactions through Smart Wallets.

Stage 1 (token send) is live. **Stage 2** adds DeFi primitives: swap
(Aerodrome V2), supply / withdraw / borrow / repay (Aave V3), and a
read-only positions view.

- **Repository**: https://github.com/gnanam1990/sherpa
- **Audit tag**: `stage-2-pre-audit-v1.0.0` — the canonical immutable
  reference. Run `git checkout stage-2-pre-audit-v1.0.0`.
- **Deployment-record parent**: `944d7e3` — the parent of the tagged commit;
  it records the Base Sepolia deployment. The tagged commit adds this docs
  package on top of it.
- **Audit branch**: `audit/stage-2` (frozen, points at the tag)
- **Compiler**: Solidity 0.8.24, optimizer enabled (200 runs), `via_ir = true`
- **Framework**: Foundry

## Contracts in scope

| Contract | Path | Lines | Inherits |
|---|---|---|---|
| `SherpaRouter` | `packages/contracts/src/SherpaRouter.sol` | 258 | `Ownable`, `ReentrancyGuard`, `ISherpaRouter` |
| `SherpaTreasury` | `packages/contracts/src/SherpaTreasury.sol` | 83 | `Ownable` |
| `FeeCalculator` | `packages/contracts/src/libraries/FeeCalculator.sol` | 23 | pure library |
| `SafetyCheck` | `packages/contracts/src/libraries/SafetyCheck.sol` | 31 | pure/view library |

**Total in-scope Solidity: 395 lines across 4 units (2 contracts + 2 libraries).**

Supporting interfaces (in `packages/contracts/src/interfaces/`, no executable
logic, included for completeness — 302 lines total): `ISherpaRouter.sol`,
`IAerodromeRouter.sol`, `IAavePool.sol`, `IAaveOracle.sol`.

Total `src/` tree (contracts + libraries + interfaces): 697 lines, 8 files.

## Functions in scope

### SherpaRouter

| Function | Visibility | Mutability | Notes |
|---|---|---|---|
| `constructor` | public | — | Sets owner, rejects zero addresses for router/pool/treasury |
| `setSwapTokenAllowed` | external | state-changing | `onlyOwner`, single-token allowlist |
| `batchSetSwapTokenAllowed` | external | state-changing | `onlyOwner`, batch allowlist, length-checked |
| `getUserPositions` | external | view | Proxies Aave `getUserAccountData` |
| `swap` | external | state-changing | `nonReentrant`; Aerodrome swap, 10 bps fee to treasury |
| `supply` | external | state-changing | `nonReentrant`; Aave supply, `onBehalfOf = msg.sender` |
| `withdraw` | external | state-changing | `nonReentrant`; pulls aToken, post-HF guard at 1.5e18 if debt |
| `borrow` | external | state-changing | `nonReentrant`; post-HF guard at 1.2e18 |
| `repay` | external | state-changing | `nonReentrant`; Aave repay, returns repaid amount in event |

### SherpaTreasury

| Function | Visibility | Mutability | Notes |
|---|---|---|---|
| `constructor` | public | — | Sets owner |
| `withdraw` | external | state-changing | `onlyOwner`, single token, balance-checked |
| `batchWithdraw` | external | state-changing | `onlyOwner`, multiple tokens, length + balance checked |
| `balance` | external | view | Token balance query |

### Libraries

| Function | Library | Notes |
|---|---|---|
| `calculateFee` | FeeCalculator | Pure, bps fee math |
| `afterFee` | FeeCalculator | Pure, net-of-fee amount |
| `validateSlippage` | SafetyCheck | Pure, bounds check (10–500 bps) |
| `validateDeadline` | SafetyCheck | View, `block.timestamp` check |

## Out of scope

- Frontend (`apps/web`, `apps/miniapp`, `apps/telegram-bot`)
- Backend API (`apps/api`) — separate security review
- Parser / executor (`packages/core`), safety rings (`packages/safety`) — separate audit
- Stage 7 session keys — not implemented in contracts, separate audit
- Test files (`packages/contracts/test/`) and deploy scripts (`packages/contracts/script/`)
- External protocols (Aerodrome V2, Aave V3) — independently audited; integration correctness is in scope, their internals are not

## Deployment (audit target — Base Sepolia)

- **Network**: Base Sepolia, chainId **84532**
- **Deployment date**: 2026-05-16T15:21:22Z
- **Deployer / owner (EOA)**: `0xdd8FA0CD3BB2fB1D1964C6E5d168081C21973D8c`

| Contract | Address | Block | Verified |
|---|---|---|---|
| SherpaRouter | `0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032` | 41588233 | ✅ basescan-sepolia |
| SherpaTreasury | `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee` | 41588193 | ✅ basescan-sepolia |

**External dependencies (testnet):**

| Dependency | Address | Type |
|---|---|---|
| Aave V3 Pool | `0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27` | Real Aave V3 (Base Sepolia) |
| Aerodrome Router | `0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933` | **MOCK** (Aerodrome has no official Base Sepolia router) |

> ⚠️ The Aerodrome router on the testnet target is a **mock** deployed solely
> for swap-path smoke testing. The swap path will be re-validated against real
> Aerodrome on Base mainnet pre-launch. See `KNOWN_ISSUES.md`.

**Post-deploy configuration:**

- `FEE_BPS` = 10 (0.1%)
- `MIN_HEALTH_FACTOR` = `1200000000000000000` (1.2e18)
- `MIN_WITHDRAW_HEALTH_FACTOR` = `1500000000000000000` (1.5e18)
- `BUILDER_CODE` = `bc_97ju6eu2`
- Allowlisted tokens (swap + Aave): USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, WETH `0x4200000000000000000000000000000000000006`

## Core invariants

1. **Fee is exactly 10 bps**, computed from the input amount before any
   external call; it cannot be inflated post-hoc.
2. **Aave `onBehalfOf` is always `msg.sender`** — never `address(this)`. The
   router never holds user lending positions.
3. **Borrow reverts** if post-borrow health factor < `1.2e18`.
4. **Withdraw reverts** if the user has debt and post-withdraw health factor
   < `1.5e18`.
5. **Only allowlisted tokens** can be swapped, supplied, withdrawn, borrowed,
   or repaid; allowlist is `onlyOwner`.
6. **Treasury funds are withdrawable only by the owner.**
7. **`forceApprove`** resets the router's allowance to the exact amount before
   each external protocol call.
8. **Treasury balance conservation** — withdrawals never exceed held balance
   (enforced + covered by `TreasuryInvariants.t.sol`).

## Build & test

```bash
git clone https://github.com/gnanam1990/sherpa.git
cd sherpa
git checkout stage-2-pre-audit-v1.0.0
cd packages/contracts
forge install
forge test -vv                         # 101 tests
forge coverage --report summary --ir-minimum
forge snapshot
```

> `forge coverage` requires `--ir-minimum` because the project compiles with
> `via_ir = true`.

## Verification results (this package)

| Check | Result | Artifact |
|---|---|---|
| Tests | **101 passed, 0 failed, 0 skipped** | `test-output.txt` |
| Coverage | **100%** lines/statements/branches/functions on all 4 in-scope units | `coverage-summary.txt` |
| Slither | **0 high, 0 critical** — 4 medium (`unused-return`), 2 low, 5 informational | `slither-summary.txt`, `slither.json` |
| Gas | snapshot of all 101 test cases | `gas-snapshot.txt` |

> Coverage `Total` row in `coverage-summary.txt` reads ~78% because it counts
> deploy scripts (out of scope) and test mocks. Every in-scope `src/` unit
> (`SherpaRouter`, `SherpaTreasury`, `FeeCalculator`, `SafetyCheck`) is at 100%.

## Contact

- Primary: @0x_art (Twitter)
- Email: _[user fills in]_
- Telegram: _[user fills in]_
- Response within 24h for clarifications
