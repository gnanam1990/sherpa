# Audit Scope Document

## Project

**Sherpa** — Natural-language DeFi agent on Base L2

**Repository**: `/home/gnanasekaran/dev/serpha/sherpa`

**Commit**: `<to be filled at audit start>`

## Contracts In Scope

### SherpaRouter (`packages/contracts/src/SherpaRouter.sol`)
- Lines: 193
- Inherits: `Ownable`, `ReentrancyGuard`, `ISherpaRouter`
- Integrations: Aerodrome V2 (swaps), Aave V3 (lending/borrowing)

### SherpaTreasury (`packages/contracts/src/SherpaTreasury.sol`)
- Lines: 83
- Inherits: `Ownable`
- Purpose: Holds protocol fees, owner-only withdrawals

### SafetyCheck (`packages/contracts/src/libraries/SafetyCheck.sol`)
- Lines: 31
- Pure library for slippage and deadline validation

### FeeCalculator (`packages/contracts/src/libraries/FeeCalculator.sol`)
- Lines: 23
- Pure library for fee calculations

### Interfaces
- `ISherpaRouter.sol` — Router interface with events
- `IAerodromeRouter.sol` — Aerodrome V2 router interface
- `IAavePool.sol` — Aave V3 pool interface
- `IAaveOracle.sol` — Aave oracle interface

## Functions In Scope

### SherpaRouter
| Function | Visibility | Mutability | Notes |
|---|---|---|---|
| `constructor` | public | — | Sets owner, validates addresses |
| `setSwapTokenAllowed` | external | state-changing | Owner-only, allowlist management |
| `batchSetSwapTokenAllowed` | external | state-changing | Owner-only, batch allowlist |
| `getUserPositions` | external | view | Reads Aave user data |
| `swap` | external | state-changing | Aerodrome swap (placeholder) |
| `supply` | external | state-changing | Aave supply (placeholder) |
| `withdraw` | external | state-changing | Aave withdraw (placeholder) |
| `borrow` | external | state-changing | Aave borrow (placeholder) |
| `repay` | external | state-changing | Aave repay (placeholder) |

### SherpaTreasury
| Function | Visibility | Mutability | Notes |
|---|---|---|---|
| `constructor` | public | — | Sets owner |
| `withdraw` | external | state-changing | Owner-only, single token |
| `batchWithdraw` | external | state-changing | Owner-only, multiple tokens |
| `balance` | external | view | Token balance query |

### Libraries
| Function | Library | Notes |
|---|---|---|
| `validateSlippage` | SafetyCheck | Pure, bounds check |
| `validateDeadline` | SafetyCheck | View, timestamp check |
| `calculateFee` | FeeCalculator | Pure, bps math |
| `afterFee` | FeeCalculator | Pure, net amount |

## Out of Scope

- **Stage 7 session keys** — Separate audit required (not yet implemented in contracts)
- **Frontend** (`apps/web`, `apps/miniapp`, `apps/telegram-bot`)
- **Backend API** (`apps/api`) — Separate security review
- **Parser/executor** (`packages/core`) — Separate audit
- **Safety rings** (`packages/safety`) — Separate audit
- **Test files** (`packages/contracts/test/`)
- **Deployment scripts** (`packages/contracts/script/`)

## Known Limitations

1. **Placeholder functions**: `swap`, `supply`, `withdraw`, `borrow`, `repay` currently revert with `"not implemented"`. These will be implemented before audit.
2. **No token approval management**: Users must approve tokens directly to Aerodrome/Aave routers.
3. **Fixed fee**: 10 bps (0.1%) hardcoded, not configurable per-token.
4. **No pause mechanism**: Contract cannot be paused in emergencies.

## Test Coverage Summary

### Contract Tests
| File | Tests | Coverage |
|---|---|---|
| `SherpaRouter.t.sol` | Router unit tests | Constructor, allowlist, view functions |
| `SherpaTreasury.t.sol` | Treasury unit tests | Withdraw, batch withdraw, balance |
| `FeeCalculator.t.sol` | Library tests | Fee math, edge cases |
| `SafetyCheck.t.sol` | Library tests | Slippage bounds, deadline validation |
| `TreasuryInvariants.t.sol` | Invariant tests | Balance conservation |

### Mock Contracts
- `MockERC20.sol` — Standard ERC20 for testing
- `MockAavePool.sol` — Aave pool mock
- `MockAerodromeRouter.sol` — Aerodrome router mock
- `SafetyCheckWrapper.sol` — Wrapper for library testing

### Running Tests
```bash
cd packages/contracts
forge test -vvv
```

## Deployment Environment

- **Chain**: Base (L2 on OP Stack)
- **Chain ID**: 8453 (mainnet), 84532 (Sepolia)
- **External Protocols**: Aerodrome V2, Aave V3
- **Compiler**: Solidity 0.8.24
- **Framework**: Foundry
