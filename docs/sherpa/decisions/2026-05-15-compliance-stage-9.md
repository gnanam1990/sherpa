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

## Update — 2026-06-29: maintained sanctions list + mainnet honesty gate

The hardcoded 2–3 address stub has been replaced with a maintained dataset
(Path A). Screening source and wiring are now:

- **Source:** OFAC SDN digital-currency address lists (EVM / `0x`-format),
  derived from `sanctions.gov` via the reproducible community mirror
  `https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses`.
- **Generation:** `scripts/compliance/build-sanctions.ts` fetches, normalizes
  (lowercase, dedupe, sort), and writes the committed generated file
  `packages/safety/src/sanctions-data.generated.ts` (with provenance header).
  Re-run on OFAC updates and commit the result. The script fails closed if the
  fetch returns fewer than 50 addresses.
- **Single source of truth:** the canonical list now lives in `@sherpa/safety`
  (the leaf security package). `@sherpa/tools` re-exports it (tools already
  depends on safety), so both the ring-0 sanctions check and the compliance
  checker screen against the same list — no duplication, no circular dependency.
- **Mainnet honesty gate:** `assertMainnetSafety` now refuses to operate on
  mainnet unless a real sanctions source is loaded (`SANCTIONED_ADDRESSES.size
  >= 50`), so the list can never silently regress to a stub in production. A CI
  unit test enforces the same floor.
