# Known Issues

## Static Analysis Results

### Slither

Run: `slither packages/contracts/src/ --solc-remaps @openzeppelin=node_modules/@openzeppelin`

| Finding | Severity | Status | Notes |
|---|---|---|---|
| `SherpaRouter` functions are `not implemented` | Informational | Accepted | Placeholder functions, will be implemented before audit |
| Missing events for state changes | Low | Accepted | `swapTokenAllowlist` emits events; other functions TBD |
| `unchecked` increment in loops | Informational | Accepted | Gas optimization, loop bounds are safe |

### Mythril

Run: `myth analyze packages/contracts/src/SherpaRouter.sol`

| Finding | Severity | Status | Notes |
|---|---|---|---|
| No critical findings | — | — | — |
| Potential integer overflow in fee calculation | Low | Accepted | Solidity 0.8.24 has built-in overflow checks |

## Design Decisions (Accepted Risks)

### 1. Fixed Fee Structure

**Decision**: Fee hardcoded at 10 bps (0.1%) as `FEE_BPS` constant.

**Risk**: Cannot adjust fees per token or per operation.

**Rationale**: Simple, auditable, no admin fee manipulation risk. Fee changes require contract upgrade.

### 2. No Pause Mechanism

**Decision**: Contract has no emergency pause function.

**Risk**: Cannot halt operations if vulnerability discovered.

**Rationale**: Keeps contract simple. Emergency response plan: deploy new contract, update off-chain routing. Trade-off accepted for reduced complexity.

### 3. Placeholder Function Bodies

**Decision**: `swap`, `supply`, `withdraw`, `borrow`, `repay` revert with `"not implemented"`.

**Risk**: Functions cannot be called until implemented.

**Rationale**: Allows interface and infrastructure audit before full implementation. Functions will be implemented and audited before mainnet.

### 4. No Token Approval Management

**Decision**: Users approve tokens directly to Aerodrome/Aave routers, not to SherpaRouter.

**Risk**: Users must manage multiple approvals.

**Rationale**: Reduces contract complexity and attack surface. SherpaRouter never holds user tokens.

### 5. Owner-Only Treasury Withdrawals

**Decision**: Only contract owner can withdraw from SherpaTreasury.

**Risk**: Owner key compromise = treasury drain.

**Rationale**: Mitigated by 2-of-3 Safe multisig ownership. No alternative (DAO governance) for initial launch.

### 6. No Slippage Oracle

**Decision**: Slippage bounds are static constants (10-500 bps).

**Risk**: Cannot dynamically adjust to market conditions.

**Rationale**: Off-chain system calculates and passes appropriate slippage. On-chain bounds are safety net only.

## Open Items (Pre-Audit)

| Item | Priority | Status |
|---|---|---|
| Implement `swap` function body | Critical | Pending |
| Implement `supply` function body | Critical | Pending |
| Implement `withdraw` function body | Critical | Pending |
| Implement `borrow` function body | Critical | Pending |
| Implement `repay` function body | Critical | Pending |
| Add `healthFactor` check in `borrow` | High | Pending |
| Emit events for all operations | Medium | Pending |
| Add NatSpec documentation | Medium | Pending |
| Run Slither on final implementation | Required | Pending |
| Run Mythril on final implementation | Required | Pending |

## Acknowledged Limitations

1. **Single-chain**: Base only, no cross-chain support in contracts
2. **No upgradability**: Contracts are immutable, no proxy pattern
3. **No governance**: No on-chain voting or proposal mechanism
4. **No insurance**: No built-in insurance or fund recovery mechanism
5. **External dependencies**: Relies on Aerodrome and Aave protocol security
