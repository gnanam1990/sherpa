# Smoke Testing

## Purpose

Verify all contract functions work correctly on mainnet after deployment. Run immediately after deployment, before enabling user traffic.

## Prerequisites

- [ ] Contracts deployed to Base Mainnet
- [ ] Contracts verified on Basescan
- [ ] Ownership transferred to Safe
- [ ] Token allowlist configured
- [ ] Test wallet funded with ETH and tokens

## Test Wallet Setup

```bash
# Create test wallet (or use existing)
TEST_PRIVATE_KEY=<test-wallet-private-key>
TEST_ADDRESS=$(cast wallet address $TEST_PRIVATE_KEY)

# Fund with ETH
cast send $TEST_ADDRESS \
  --value 0.1ether \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY

# Fund with USDC (from existing holdings)
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  $TEST_ADDRESS 10000000 \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Test 1: $1 Swap Test

**Purpose**: Verify Aerodrome swap integration works.

```bash
# Approve USDC to Aerodrome router
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "approve(address,uint256)" \
  0xcF77a3Ba9A5CA399B7c97c74d58e6B70f0B5b12C \
  1000000 \
  --rpc-url https://mainnet.base.org \
  --private-key $TEST_PRIVATE_KEY

# Execute swap via SherpaRouter (1 USDC → ETH)
# Note: swap function not yet implemented, test when ready
```

**Expected**: Transaction succeeds, USDC deducted, ETH received.
**Verify**: Check balances on Basescan.

## Test 2: $1 Lend Test

**Purpose**: Verify Aave supply integration works.

```bash
# Approve USDC to Aave pool
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "approve(address,uint256)" \
  0xA238Dd80C259a72e81d7e4664a9801593F98d1c5 \
  1000000 \
  --rpc-url https://mainnet.base.org \
  --private-key $TEST_PRIVATE_KEY

# Execute supply via SherpaRouter
# Note: supply function not yet implemented, test when ready
```

**Expected**: Transaction succeeds, aUSDC received.
**Verify**: Check aToken balance on Basescan.

## Test 3: $1 Borrow Test

**Purpose**: Verify Aave borrow integration works.

```bash
# Check health factor before
cast call <ROUTER_ADDRESS> \
  "getUserPositions(address)" \
  $TEST_ADDRESS \
  --rpc-url https://mainnet.base.org

# Execute borrow via SherpaRouter
# Note: borrow function not yet implemented, test when ready
```

**Expected**: Transaction succeeds, health factor > 1.2, borrowed tokens received.
**Verify**: Check health factor and token balance.

## Test 4: Health Factor Monitoring

**Purpose**: Verify health factor reads correctly.

```bash
# Read user positions
cast call <ROUTER_ADDRESS> \
  "getUserPositions(address)" \
  $TEST_ADDRESS \
  --rpc-url https://mainnet.base.org

# Expected return values:
# totalCollateralBase: > 0
# totalDebtBase: > 0 (if borrow executed)
# availableBorrowsBase: > 0
# currentLiquidationThreshold: > 0
# ltv: > 0
# healthFactor: > 1.5e18
```

**Expected**: All values returned, health factor > 1.5e18.

## Test 5: Fee Collection Verification

**Purpose**: Verify fees accumulate in SherpaTreasury.

```bash
# Check treasury balance before swap
cast call <TREASURY_ADDRESS> \
  "balance(address)" \
  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --rpc-url https://mainnet.base.org

# Execute swap (triggers fee collection)

# Check treasury balance after swap
cast call <TREASURY_ADDRESS> \
  "balance(address)" \
  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --rpc-url https://mainnet.base.org

# Expected: balance increased by fee amount (0.1% of swap)
```

**Expected**: Treasury balance increases by 0.1% of swap amount.

## Test 6: Allowlist Enforcement

**Purpose**: Verify non-allowed tokens are rejected.

```bash
# Attempt swap with non-allowed token
# Expected: Transaction reverts with TokenNotAllowed error
```

**Expected**: Transaction reverts.

## Test 7: Slippage Enforcement

**Purpose**: Verify slippage bounds are enforced.

```bash
# Attempt swap with slippage > 500 bps
# Expected: Transaction reverts with SafetyCheck.InvalidSlippage error

# Attempt swap with slippage < 10 bps
# Expected: Transaction reverts with SafetyCheck.InvalidSlippage error
```

**Expected**: Transactions revert.

## Post-Smoke Checklist

- [ ] $1 swap executed successfully
- [ ] $1 lend executed successfully
- [ ] $1 borrow executed successfully
- [ ] Health factor reads correctly
- [ ] Fees collected in treasury
- [ ] Allowlist enforcement verified
- [ ] Slippage enforcement verified
- [ ] All transactions visible on Basescan
- [ ] No unexpected errors in logs
- [ ] Gas costs reasonable (< $0.10 per tx on Base)

## Sign-Off

| Tester | Date | Result |
|---|---|---|
| `<name>` | `<date>` | Pass/Fail |

## Rollback Triggers

If any smoke test fails:
1. Do NOT enable user traffic
2. Investigate failure
3. Fix and redeploy if needed
4. Re-run smoke tests
