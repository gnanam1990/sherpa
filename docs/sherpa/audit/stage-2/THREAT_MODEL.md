# Sherpa Stage 2 — Threat Model

Scope: `SherpaRouter`, `SherpaTreasury`, `FeeCalculator`, `SafetyCheck`.
Deployment target: Base Sepolia (chainId 84532). See `SCOPE.md`.

## Attack surface categories

### 1. Swap threats

**Sandwich attacks**
- Risk: MEV bot front-runs the swap and back-runs to extract value.
- Mitigation: user-set slippage tolerance (10–500 bps) enforced via `amountOutMin`.
- Mitigation: deadline parameter (20 min default in the app), enforced on-chain (`block.timestamp > deadline` reverts).
- Mitigation: UI shows price impact before signing.
- Out of contract scope: sequencer ordering (Base's responsibility).

**Price impact manipulation**
- Risk: low-liquidity pool causes high price impact.
- Mitigation: `amountOutMin` enforcement (slippage protection passed through to Aerodrome).
- Mitigation: hard block at 1500 bps price impact (UI-side).

**Route manipulation**
- Risk: a malicious routing path drains user funds.
- Mitigation: `swap` requires both `tokenIn` and `tokenOut` to be on the owner-managed allowlist.
- Mitigation: single-hop routing only in Stage 2.

**Approval drain**
- Risk: user approves max allowance and an attacker drains it.
- Mitigation: `forceApprove` resets the router's allowance to the exact spend amount before each external call.
- Mitigation: users approve only `SherpaRouter`, not arbitrary contracts.

### 2. Lending threats

**aToken / position theft**
- Risk: Aave position credited to the wrong address.
- Mitigation: `supply`/`borrow`/`withdraw`/`repay` always pass `onBehalfOf = msg.sender` — never `address(this)`.
- Mitigation: `nonReentrant` prevents intercept across the external call.

**Reserve disabled mid-tx**
- Risk: Aave disables a reserve during the transaction.
- Mitigation: Aave Pool's own reverts propagate cleanly (no swallowed errors).
- Mitigation: allowlist limits exposure to known reserves.

### 3. Borrowing threats

**Forced liquidation**
- Risk: borrow followed by a price drop pushes the position to liquidation.
- Mitigation: hard health-factor block at `1.5e18` in `SherpaRouter.borrow` (reverts `UnhealthyPosition`).
- Mitigation: UI warns at HF < 1.5e18 and < 1.3e18.

**Wrong rate mode**
- Risk: user borrows stable when only variable is available.
- Mitigation: `borrow`/`repay` reject any `interestRateMode` other than 1 or 2 (`InvalidInterestRateMode`).
- Mitigation: Aave reverts cleanly on an unavailable rate mode; UI auto-detects available modes.

**Oracle manipulation**
- Risk: spot-price manipulation enables an unhealthy borrow.
- Mitigation: health factor is read from Aave's own `getUserAccountData` (Chainlink-based oracle).
- Mitigation: Sherpa never uses Aerodrome spot prices for borrow decisions.

### 4. Withdraw threats

**Withdraw causes liquidation**
- Risk: removing collateral drops HF below 1.0.
- Mitigation: stricter post-withdraw HF block at `1.5e18` in `SherpaRouter.withdraw` when the user has outstanding debt (`totalDebt > 0`).

### 5. Treasury threats

**Unauthorized withdrawal**
- Risk: a non-owner drains the treasury.
- Mitigation: `onlyOwner` on `withdraw` and `batchWithdraw`.
- Mitigation: Safe multisig as owner (mainnet plan).

**Owner key compromise**
- Risk: a single key controls the treasury.
- Mitigation: Safe multisig with 2-of-4 threshold (mainnet).
- Acknowledged: the Base Sepolia audit target uses an EOA owner (`0xdd8F…3D8c`); multisig is a mainnet pre-launch step.

**Fee inflation**
- Risk: an attacker inflates the protocol fee.
- Mitigation: fee is exactly 10 bps (`FEE_BPS` constant), computed from the input amount before any transfer — it cannot be inflated post-hoc.

### 6. Admin threats

**Malicious allowlist additions**
- Risk: owner allowlists a malicious token.
- Mitigation: multisig governance (mainnet); every change emits `TokenAllowlistUpdated` for transparency.

**DoS via allowlist removal**
- Risk: owner removes a legitimate token.
- Mitigation: removal does not affect existing Aave positions (already supplied/borrowed via Aave directly).
- Mitigation: multisig requires multiple signers (mainnet).

## Cross-cutting concerns

### Reentrancy
- All state-changing external functions on `SherpaRouter`
  (`swap`, `supply`, `withdraw`, `borrow`, `repay`) carry OpenZeppelin
  `ReentrancyGuard` (`nonReentrant`).
- `SherpaTreasury` does **not** use `ReentrancyGuard`; its withdrawal
  functions are `onlyOwner` and transfer to an owner-chosen recipient, so
  there is no untrusted reentrancy path. This is intentional — auditors
  should still confirm the reasoning holds.
- Slither (0.11.5) reports **0 high / 0 critical**. See "Slither residue" below.

### Front-running
- On-chain deadline check bounds the transaction window.
- Slippage (`amountOutMin`) bounds value loss.
- Smart Wallet (ERC-4337) does not itself provide MEV protection.

### Sandwich attacks
- Slippage bounds maximum loss; user sees price impact before signing.
- No privileged information that could be profitably front-run.

### Slither residue (disclosed, reviewed)
Static analysis surfaced 11 findings, none high/critical:
- **4 × Medium `unused-return`** — return values of `AAVE_POOL.withdraw`
  and tuple fields of `getUserAccountData` are intentionally not consumed
  where they are not needed (the post-HF guard explicitly destructures only
  `totalDebt` and `healthFactor`). Reviewed; benign. See `KNOWN_ISSUES.md`.
- **1 × Low `calls-loop`** — `SherpaTreasury.batchWithdraw` makes external
  `balanceOf` calls inside a loop; `onlyOwner`, bounded by caller-supplied
  array. Acceptable.
- **1 × Low `timestamp`** — `swap` compares `block.timestamp` to the
  user-supplied deadline. Intended behavior.
- **5 × Informational `naming-convention`** — immutables in SCREAMING_CASE.
  Style only.

## Specific attack scenarios

### Scenario 1 — Drain treasury via swap fees
Attacker → `SherpaRouter.swap(huge_amount)`
- 0.1% of input goes to treasury (`FEE_BPS = 10`); 0.1% is the maximum extraction rate.
- Treasury is withdrawable only by the owner (Safe multisig on mainnet).
- Attack gas cost > attack value. **Not profitable.**

### Scenario 2 — Force liquidation via borrow
Attacker → `SherpaRouter.borrow(amount)` such that post-HF < 1.5e18
- **BLOCKED** by the contract check (`revert UnhealthyPosition`).
- Even if bypassed, Aave Pool enforces its own collateralization checks.

### Scenario 3 — Oracle manipulation
Attacker manipulates Aerodrome spot price
- Sherpa does not use Aerodrome prices for borrow/withdraw decisions.
- Health factor comes from Aave's Chainlink-based oracle. **No effect.**

### Scenario 4 — Reentrancy via malicious token
Attacker tries a token with a reentrant `transfer`
- Token allowlist gates entry: only owner-approved tokens.
- Even if allowlisted, `nonReentrant` on every router state-changing function catches the reentry.

### Scenario 5 — Approval race
User approves USDC to `SherpaRouter`
- `forceApprove` resets allowance to the exact amount before each external call.
- User approval is scoped to `SherpaRouter` only.
- Transfers use `SafeERC20`'s `safeTransferFrom` allowance pattern.

## Out-of-scope risks (acknowledged)

- L2 sequencer downtime (Base's responsibility)
- L2 sequencer transaction reordering (mitigated by on-chain deadline)
- Aave governance changes (we follow Aave)
- Aerodrome governance changes (we follow Aerodrome)
- General Base platform risks
- Wallet provider issues (Coinbase Smart Wallet)
- Mock Aerodrome router on the testnet target — swap path re-validated on mainnet pre-launch (see `KNOWN_ISSUES.md`)
