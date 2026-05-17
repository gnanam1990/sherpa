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
- **Audit branch**: `audit/stage-2` (points at the tag)
- **Deployment note**: the previously verified Base Sepolia router predates the
  issue-report remediation. The tagged source is canonical; redeploy the patched
  router before using a live testnet target for auditor smoke tests.
- **Compiler**: Solidity 0.8.24, optimizer enabled (200 runs), `via_ir = true`
- **Framework**: Foundry

## Contracts in scope

| Contract | Path | Lines | Inherits |
|---|---|---|---|
| `SherpaRouter` | `packages/contracts/src/SherpaRouter.sol` | 304 | `Ownable`, `ReentrancyGuard`, `Pausable`, `ISherpaRouter` |
| `SherpaTreasury` | `packages/contracts/src/SherpaTreasury.sol` | 83 | `Ownable` |
| `FeeCalculator` | `packages/contracts/src/libraries/FeeCalculator.sol` | 23 | pure library |
| `SafetyCheck` | `packages/contracts/src/libraries/SafetyCheck.sol` | 31 | pure/view library |

**Total in-scope Solidity: 441 lines across 4 units (2 contracts + 2 libraries).**

Supporting interfaces (in `packages/contracts/src/interfaces/`, no executable
logic, included for completeness — 295 lines total): `ISherpaRouter.sol`,
`IAerodromeRouter.sol`, `IAavePool.sol`, `IAaveOracle.sol`.

Total `src/` tree (contracts + libraries + interfaces): 736 lines, 8 files.

## Functions in scope

### SherpaRouter

| Function | Visibility | Mutability | Notes |
|---|---|---|---|
| `constructor` | public | — | Sets owner, rejects zero addresses for router/pool/treasury |
| `setSwapTokenAllowed` | external | state-changing | `onlyOwner`, single-token allowlist |
| `batchSetSwapTokenAllowed` | external | state-changing | `onlyOwner`, batch allowlist, length-checked |
| `getUserPositions` | external | view | Proxies Aave `getUserAccountData` |
| `pause` / `unpause` | external | state-changing | `onlyOwner`; emergency control for user-facing DeFi operations |
| `swap` | external | state-changing | `whenNotPaused`, `nonReentrant`; single-hop Aerodrome swap, route endpoints must match `tokenIn` / `tokenOut`, 10 bps fee to treasury, quote-derived slippage guard |
| `supply` | external | state-changing | `whenNotPaused`, `nonReentrant`; Aave supply, `onBehalfOf = msg.sender` |
| `withdraw` | external | state-changing | `whenNotPaused`, `nonReentrant`; decodes aToken from Aave `getReserveData`, pulls aToken, post-HF guard at 1.5e18 if debt, emits actual withdrawn amount |
| `borrow` | external | state-changing | `whenNotPaused`, `nonReentrant`; post-HF guard at 1.5e18, forwards borrowed funds from router to `msg.sender` |
| `repay` | external | state-changing | `whenNotPaused`, `nonReentrant`; Aave repay, refunds excess, returns repaid amount in event |

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

## Deployment (historical Base Sepolia smoke target)

- **Network**: Base Sepolia, chainId **84532**
- **Deployment date**: 2026-05-16T15:21:22Z
- **Deployer / owner (EOA)**: `0xdd8FA0CD3BB2fB1D1964C6E5d168081C21973D8c`

| Contract | Address | Block | Verified |
|---|---|---|---|
| SherpaRouter | `0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032` | 41588233 | ✅ basescan-sepolia |
| SherpaTreasury | `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee` | 41588193 | ✅ basescan-sepolia |

> ⚠️ The router address above was deployed before the issue-report remediation
> that fixed borrow fund forwarding, Aave reserve-data decoding, and swap route
> endpoint validation. It is retained as historical deployment evidence. The
> patched router should be redeployed from `stage-2-pre-audit-v1.0.0` before an
> external auditor depends on live Base Sepolia bytecode behavior.

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
- `MIN_HEALTH_FACTOR` = `1500000000000000000` (1.5e18)
- `MIN_WITHDRAW_HEALTH_FACTOR` = `1500000000000000000` (1.5e18)
- `BUILDER_CODE` = `bc_97ju6eu2`
- Allowlisted tokens (swap + Aave): USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, WETH `0x4200000000000000000000000000000000000006`

## Core invariants

1. **Fee is exactly 10 bps**, computed from the input amount before any
   external call; it cannot be inflated post-hoc.
2. **Aave `onBehalfOf` is always `msg.sender`** — never `address(this)`. The
   router never holds user lending positions.
3. **Borrow reverts** if post-borrow health factor < `1.5e18`.
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
forge test -vv                         # 113 tests
forge coverage --report summary --ir-minimum
forge snapshot
```

> `forge coverage` requires `--ir-minimum` because the project compiles with
> `via_ir = true`.

## Verification results (this package)

| Check | Result | Artifact |
|---|---|---|
| Tests | **113 passed, 0 failed, 0 skipped** | `test-output.txt` |
| Coverage | SherpaRouter: **96.94%** lines / **95.35%** statements / **90.00%** branches / **100%** functions; SherpaTreasury, FeeCalculator, SafetyCheck: **100%** | `coverage-summary.txt` |
| Slither | **0 high, 0 critical** — 3 medium (`unused-return`), 1 low, 7 informational | `slither-summary.txt`, `slither.json` |
| Gas | snapshot of all 113 test cases | `gas-snapshot.txt` |

> Coverage `Total` row in `coverage-summary.txt` reads ~78% because it counts
> deploy scripts (out of scope) and test mocks. The router has a few defensive
> revert branches that are not covered; the other three in-scope units are at
> 100%.

## Contact

- Primary: @0x_art (Twitter)
- Email: _[user fills in]_
- Telegram: _[user fills in]_
- Response within 24h for clarifications
