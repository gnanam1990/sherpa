# External Review Round 1 — GitHub Issues #34-#40

Source: https://github.com/gnanam1990/sherpa/issues/34 through
https://github.com/gnanam1990/sherpa/issues/40

Reviewer: anandh8x

Status: all issues are closed and remediated in
`c664cb1c9211abb31334755bb7efa3f1fcc6e053`.

| Issue |      Severity | Title                                                                | Status |
| ----- | ------------: | -------------------------------------------------------------------- | ------ |
| #34   |        Medium | Missing slippage validation in swap — SafetyCheck library unused     | Fixed  |
| #35   |        Medium | `withdraw` event emits requested amount, not actual withdrawn amount | Fixed  |
| #36   |           Low | No emergency pause mechanism                                         | Fixed  |
| #37   |           Low | Borrow health factor threshold is aggressive (`1.2e18`)              | Fixed  |
| #38   |           Low | `repay` does not refund excess when repaid amount < requested amount | Fixed  |
| #39   | Informational | SafetyCheck library imported but only partially used                 | Fixed  |
| #40   | Informational | No batch completion event for `batchSetSwapTokenAllowed`             | Fixed  |

See `../AUDIT_REMEDIATION.md` for the remediation mapping and verification.
