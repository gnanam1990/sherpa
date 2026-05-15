# Sherpa Security Audit Preparation

## Scope

### In Scope
- packages/safety/ (7 safety rings)
- packages/core/src/executor.ts (intent execution)
- packages/tools/src/aave/ (Aave integration)
- packages/tools/src/aerodrome/ (DEX integration)
- packages/tools/src/across/ (bridge integration)
- packages/tools/src/session-keys/ (session key management)
- packages/tools/src/composable/ (flash loans, leverage)
- apps/api/src/routes/paymaster.ts (paymaster proxy)
- apps/api/src/routes/ (all API routes)

### Out of Scope
- Frontend (apps/web, apps/miniapp)
- Stub implementations (marked with TODO)
- Test files
- Documentation

## Critical Paths

### 1. Transaction Execution Flow
User Input -> Parser -> Planner -> Safety Rings -> Execution -> Paymaster

Key security checks:
- Ring 1: Allowlist (only approved contracts)
- Ring 2: Amount caps (per-tx and per-day)
- Ring 3: Rate limiting
- Ring 4: Recipient validation
- Ring 5: Risk badges
- Ring 6: Tenderly simulation
- Ring 7: User confirmation

### 2. Paymaster Proxy
- UserOp signature verification (pre-rate-limit)
- Rate limiting (per-sender, 3 ops/24h)
- Sponsored gas enforcement (all values must be 0n)

### 3. Session Keys
- Spend limits enforced
- Duration limits enforced
- Permission-based access (target + selector)
- Auto-revoke on limit exceeded

### 4. Flash Loans
- Must be repaid in same transaction
- Fee calculation (0.09%)
- Amount caps

### 5. Leverage
- Max ratio enforced (5x default)
- Liquidation price calculation
- Health factor monitoring

## Known Issues
- Stub implementations in tools modules (not production-ready)
- In-memory rate limiting (Postgres impl exists for production)
- No multi-sig enforcement yet (module exists, not wired)

## Test Coverage
- 500+ tests across all packages
- Safety rings: 25 tests
- Core parser: 164 tests (all intents)
- Tools: 230 tests

## Recommendations
1. Focus on safety rings and executor flow
2. Review paymaster proxy for signature bypass
3. Verify session key permission enforcement
4. Check flash loan repayment enforcement
5. Validate leverage liquidation calculations
