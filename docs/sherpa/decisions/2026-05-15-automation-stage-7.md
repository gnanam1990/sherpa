# Decision: AUTOMATION Intent (Stage 7 P4)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 7 P4

## Context
Sherpa needs AUTOMATION intent for conditional and recurring on-chain actions — if/then rules, scheduled tasks, and automation lifecycle management.

## Decisions

### Supported Actions
- **create**: Define a new automation rule (via `if X then Y` or `create automation ...`)
- **list**: View all active automations
- **cancel**: Stop/disable an automation by name

### Parser Patterns
- `if ETH > 5000 then swap 100 USDC for ETH` → `automationAction: 'create'`
- `create automation buy ETH weekly` → `automationAction: 'create'`
- `list my automations` → `automationAction: 'list'`
- `cancel automation buy-eth-weekly` → `automationAction: 'cancel'`

### Automation Engine
- `validateAutomation(rule)` — returns array of validation errors
- `evaluateCondition(rule, deps)` — evaluates condition against current state, returns boolean
- `executeAction(rule, deps)` — executes the automation action, returns success/txHash/error

### Types
- `AutomationRule` — id, name, condition, action, userId, status, maxExecutions, executionCount, lastTriggered
- `Condition` — type (price/balance/health_factor/time/block), operator (>/>=/</<=/==/crosses), value, optional asset
- `Action` — type (SWAP/SEND/etc), params map
- `AutomationDeps` — chainId

### Condition Evaluation
- V1 stubs return `false` (no real chain data yet)
- Future: price feeds via Pyth, balance checks via RPC, health factor via Aave

## Future Work
- Cron-based scheduling via on-chain automation (Gelato, Chainlink Automation)
- Multi-condition rules (AND/OR logic)
- Automation history and audit log
- Gas budget limits per automation
