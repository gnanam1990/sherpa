# Known Issues / Acknowledged Tradeoffs

This document tells the auditor what is **intentional** so review time is
spent on real issues. None of the items below are bugs we want reported as
findings; novel exploitation paths around them are in scope.

## Design decisions (intentional)

### Single-hop routing only
- Stage 2 swaps route through one Aerodrome pool only.
- Multi-hop deferred to Stage 5+.
- The majority of USDC / WETH / cbETH pairs work fine single-hop.

### Fee taken from the input token
- Fee (10 bps) is computed from `amountIn` and transferred to the treasury
  before the swap.
- Alternative (fee on output) is more complex and gas-heavier. Current design
  is simpler and the fee is bounded and non-inflatable.

### Stable-rate borrowing may revert
- Aave V3 sometimes disables stable rates per asset.
- `borrow`/`repay` accept `interestRateMode` 1 or 2 only and otherwise revert
  cleanly (`InvalidInterestRateMode`); the UI suggests variable rate.

### Health factor uses Aave's oracle
- We do not reimplement HF math. `getUserAccountData` is the single source of
  truth (Chainlink-based Aave oracle).

### Treasury cannot auto-distribute
- Owner must withdraw manually (`withdraw` / `batchWithdraw`, `onlyOwner`).
- Time-locked auto-distribution is future work, not Stage 2.

### Emergency pause scope
- Stage 2 includes `Pausable` on user-facing DeFi operations:
  `swap`, `supply`, `withdraw`, `borrow`, and `repay`.
- Owner allowlist updates remain callable while paused so operators can remove
  risky assets during an incident.
- Existing Aave positions are unaffected by pause state because positions live in
  Aave, not in the router.

### SherpaTreasury has no ReentrancyGuard
- Intentional: `withdraw`/`batchWithdraw` are `onlyOwner` and send to an
  owner-chosen recipient — no untrusted reentrancy path.

### Mock Aerodrome on Base Sepolia
- Aerodrome has no official Base Sepolia router.
- A `MockAerodromeRouter` is deployed at
  `0x135Ea0F5422fB1D4aDeaC8A205735498ffA5B933` for non-swap and swap-path
  smoke testing only.
- The real swap path will be re-tested against Aerodrome on Base mainnet
  pre-launch. **Do not treat the mock as production behavior.**

## Slither — disclosed static-analysis residue

Slither 0.11.5, run with the same args as CI
(`--filter-paths "lib/,test/" --exclude-dependencies`). Full output in
`slither-summary.txt` / `slither.json`.

**0 high, 0 critical.** Remaining reviewed findings are tracked in
`slither-summary.txt` / `slither.json`:

| Severity | Detector | Count | Disposition |
|---|---|---|---|
| Medium | `unused-return` | 3 | Tuple return values from `getUserAccountData` are intentionally ignored except the fields needed for HF checks; `getUserPositions` directly returns Aave account data. |
| Low | `calls-loop` | 1 | `batchWithdraw` external calls in a loop; `onlyOwner`, caller-bounded array. Acceptable. |
| Informational | `assembly` | 1 | Bounded ABI word decode for Aave `aTokenAddress` from `getReserveData`; success, length, and zero-address checks are enforced. |
| Informational | `low-level-calls` | 1 | Staticcall to Aave `getReserveData` to tolerate V3 reserve-data shape drift while preserving explicit failure checks. |
| Informational | `naming-convention` | 5 | Immutables in SCREAMING_CASE. Style only. |

Please do not file these as findings.

### `forge build` lint warnings
Latest local `forge build` is clean. `src/` contains zero raw `.transfer(`
calls — all token movement uses OpenZeppelin `SafeERC20`.

## Pre-audit findings (internal review)

Manual internal review caught a set of P0/P1 issues, all fixed and merged via
**PR #33** ("Audit Stage 2-9 scaffold before launch", merged 2026-05-16).

### Notable fixes from internal audit (verifiable in PR #33 diff):
- `SherpaRouter` swap/supply/withdraw/borrow/repay were originally stubbed as
  "not implemented" → real implementations.
- DCA execution had a fake-success path → now throws.
- Auto-repay treated an RPC failure as success → now throws.
- Health-factor evaluator silently returned 0 on errors → now throws.

## What auditors should focus on

1. Reentrancy across nested external calls (Aave/Aerodrome callbacks).
2. Fee calculation edge cases (0 amount, max uint, dust, rounding).
3. Approval reset correctness (`forceApprove` vs `approve`).
4. Event emission completeness (including `BUILDER_CODE` propagation).
5. Access control on admin functions.
6. Storage layout consistency (collision-safety for future upgrades).
7. Gas optimizations vs security tradeoffs.
8. Multi-step interactions (e.g. supply then immediate withdraw).
9. Aave integration correctness — especially `onBehalfOf = msg.sender`.
10. Health-factor guard correctness under edge conditions (zero debt, exactly-at-threshold).
