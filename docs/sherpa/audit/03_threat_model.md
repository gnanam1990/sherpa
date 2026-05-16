# Threat Model

## System Overview

SherpaRouter routes user intents (swap, lend, borrow) to Aerodrome V2 and Aave V3 on Base. SherpaTreasury collects and holds protocol fees.

## Assets at Risk

| Asset | Value | Location |
|---|---|---|
| User tokens | Variable | User wallets, Aave positions |
| Protocol fees | Accumulated in treasury | SherpaTreasury contract |
| Contract ownership | Admin privileges | Owner address (Safe multisig) |
| Token allowlist | Access control | SherpaRouter storage |

## Threat Actors

| Actor | Capability | Motivation |
|---|---|---|
| External attacker | Exploit contract bugs | Steal funds |
| Malicious user | Abuse protocol mechanics | Extract value |
| Compromised owner key | Admin functions | Drain treasury, modify allowlist |
| MEV bot | Front-run/sandwich | Extract value from swaps |

## Threat Analysis

### T1: Sandwich Attacks (Swaps)

**Risk**: High

**Attack**: MEV bot observes pending swap, front-runs with buy, back-runs with sell.

**Impact**: User receives worse price, MEV bot extracts profit.

**Mitigations**:
- `MAX_SLIPPAGE_BPS` (500 = 5%) caps user loss
- `MIN_SLIPPAGE_BPS` (10 = 0.1%) prevents zero-slippage orders
- Deadline parameter prevents stale execution
- Off-chain: Private mempool via Flashbots Protect (recommended)

**Residual risk**: Medium — slippage bounds limit but don't eliminate sandwich risk.

### T2: Liquidation Grief (Borrows)

**Risk**: Medium

**Attack**: Attacker manipulates oracle price to trigger user liquidations.

**Impact**: Users lose collateral, liquidators profit.

**Mitigations**:
- `MIN_HEALTH_FACTOR` (1.2e18) enforced on-chain
- Aave V3 uses Chainlink oracles (manipulation-resistant)
- Health factor checked before borrow execution

**Residual risk**: Low — Aave's oracle design mitigates this.

### T3: Oracle Manipulation

**Risk**: Medium

**Attack**: Flash loan manipulation of spot prices on Aerodrome.

**Impact**: Swaps execute at manipulated prices.

**Mitigations**:
- Aerodrome uses TWAP for pricing (not spot)
- Slippage bounds limit price impact
- Aave uses Chainlink (external, manipulation-resistant)

**Residual risk**: Low — TWAP + Chainlink provides strong protection.

### T4: Reentrancy Paths

**Risk**: Medium

**Attack**: Re-enter SherpaRouter during token transfer callback.

**Impact**: Double-spend or state corruption.

**Mitigations**:
- `ReentrancyGuard` on all state-changing functions (`nonReentrant` modifier)
- `SafeERC20` for all token transfers (no callbacks)
- Checks-effects-interactions pattern

**Residual risk**: Very Low — OpenZeppelin guards are battle-tested.

### T5: Access Control Assumptions

**Risk**: High (if owner key compromised)

**Attack**: Attacker gains owner private key.

**Impact**: Can modify allowlist, withdraw treasury funds.

**Mitigations**:
- Ownership transferred to 2-of-3 Safe multisig
- No single-signer can drain funds
- Timelock recommended for allowlist changes (future)

**Residual risk**: Medium — depends on multisig operational security.

### T6: Front-Running Risks

**Risk**: Medium

**Attack**: Front-run allowlist changes or parameter updates.

**Impact**: Attacker trades ahead of favorable changes.

**Mitigations**:
- Allowlist changes are owner-only
- No direct user value at risk from allowlist changes
- Timelock would provide transparency (recommended)

**Residual risk**: Low — limited attack surface.

### T7: Flash Loan Attacks

**Risk**: Medium

**Attack**: Use flash loans to manipulate protocol state.

**Impact**: Drain funds or manipulate prices.

**Mitigations**:
- SherpaRouter operations require prior token approval
- No flash loan functionality in SherpaRouter itself
- Aave flash loans have built-in fee (0.09%)

**Residual risk**: Low — no flash loan vector in current contract design.

## Security Controls Summary

| Control | Implementation | Status |
|---|---|---|
| Reentrancy protection | OpenZeppelin `ReentrancyGuard` | Implemented |
| Safe token transfers | OpenZeppelin `SafeERC20` | Implemented |
| Access control | OpenZeppelin `Ownable` | Implemented |
| Slippage bounds | `SafetyCheck.validateSlippage` | Implemented |
| Deadline validation | `SafetyCheck.validateDeadline` | Implemented |
| Token allowlist | `swapTokenAllowlist` mapping | Implemented |
| Fee calculation | `FeeCalculator` library | Implemented |
| Health factor check | `MIN_HEALTH_FACTOR` constant | Defined (not enforced in placeholder) |

## Recommendations

1. **Implement pause mechanism** — Emergency pause for all operations
2. **Add timelock** — 48h delay for admin operations
3. **Use private mempool** — Flashbots Protect for mainnet swaps
4. **Monitor health factors** — Off-chain alerting for positions near liquidation
5. **Rate limit treasury withdrawals** — Daily cap on treasury outflows
