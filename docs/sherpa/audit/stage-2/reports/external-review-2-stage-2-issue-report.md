# External Review Round 2 — Stage 2 Issue Report

Source: external reviewer handoff titled "Sherpa Stage 2 issue report".

Status: all findings are remediated or confirmed already fixed at
`b3fb02ab623aef26d071c6e02b1e8d60cab111c9`.

| ID | Severity | Finding | Status |
|---|---:|---|---|
| ER2-1 | High | `borrow()` sends borrowed funds to the router, not the user. | Fixed |
| ER2-2 | High | `withdraw()` uses non-standard Aave Pool function `getReserveAToken`. | Fixed |
| ER2-3 | Medium / High | `repay()` can strand overpayments in the router. | Already fixed in round 1; regression test remains green. |
| ER2-4 | Medium | Swap route is not validated against `tokenIn` / `tokenOut`. | Fixed |
| ER2-5 | Low | Audit package references missing tag / branch. | Fixed |

See `../AUDIT_REMEDIATION.md` for the remediation mapping and verification.

