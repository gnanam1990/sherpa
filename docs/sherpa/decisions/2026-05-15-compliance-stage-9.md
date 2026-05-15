# ADR: Compliance Checking (Stage 9 P4)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 9 — Compliance Checking

## Context

Sherpa needs compliance checks to ensure transactions meet regulatory requirements before execution. This includes OFAC sanctions screening, transaction amount limits, and address risk scoring. Compliance is a gate — non-compliant transactions must be blocked, not just warned.

## Decision

### Compliance Module (`packages/tools/src/compliance/`)

- **Checker** (`checker.ts`): Three functions:
  - `checkCompliance(address, config?, deps)` → returns `ComplianceCheck` with compliance status, risk level, and flags.
  - `isOFACSanctioned(address)` → pure function; checks address against OFAC sanctions list.
  - `validateTransactionAmount(amount, maxAmount)` → pure function; validates amount against compliance limit.
- **Sanctions** (`sanctions.ts`): Hardcoded sanctioned address set with `isSanctioned()` lookup.
- **Types** (`types.ts`): `ComplianceCheck`, `ComplianceFlag`, `ComplianceConfig`, `ComplianceDeps`.

### Default Configuration

```ts
DEFAULT_COMPLIANCE_CONFIG = {
  enableSanctionsCheck: true,
  enableOFACCheck: true,
  blockedJurisdictions: ['KP', 'IR', 'SY', 'CU'],
  maxTransactionAmount: 10_000_000_000_000n, // 10M USDC (6 decimals)
}
```

### Integration Points

- Compliance checks run as a pre-flight gate before `plan()` builds transactions.
- `validateTransactionAmount` is called in executor paths that handle large amounts.
- Sanctions list is extensible — `SANCTIONED_ADDRESSES` set can be updated without code changes.

## Alternatives Considered

1. **External API for sanctions** — deferred; hardcoded list covers MVP. Real-time OFAC API integration planned for Stage 10.
2. **Soft warnings only** — rejected; compliance must be a hard block for sanctioned addresses and over-limit transactions.

## Consequences

- +1 test file (`checker.test.ts`), +2 doc files.
- Sanctions list is static; production deployment needs dynamic OFAC API.
- `isOFACSanctioned` and `validateTransactionAmount` are pure — no async, no external calls.
- `checkCompliance` currently returns stub `isCompliant: true`; real checks wired in Stage 10.
