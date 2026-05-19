# Security Policy

## Supported Versions

| Version           | Supported   |
| ----------------- | ----------- |
| Mainnet (current) | Yes         |
| Testnet           | Best-effort |

## Security Review History

Sherpa has undergone independent security review by two individual reviewers:

- Independent security review 1: anandh8x, 2026-05-17, GitHub issues #34-#40.
- Independent security review 2: vasanthdev2004, 2026-05-17, Stage 2 issue
  report.

These were independent security reviews, not formal audit-firm reports.

Combined findings after remediation: 0 critical, 0 high.

Static analysis: Slither clean for high and critical findings.

Coverage:

- SherpaRouter: 96.94%
- SherpaTreasury: 100%

Security review materials live in `docs/sherpa/audit/stage-2/`.

A formal external audit by a recognized audit firm is planned before the v1.0
release.

## Reporting Vulnerabilities

If you discover a security vulnerability in Sherpa, please report it responsibly.

DO NOT open a public GitHub issue.

Use GitHub private vulnerability reporting once it is enabled for this
repository. If private reporting is unavailable, contact the maintainer
privately before publishing details.

We aim to acknowledge reports within 48 hours and provide a timeline for fixes
within 5 business days.

## Responsible Disclosure

- Allow reasonable time for fixes before public disclosure.
- Provide reproducible test cases when possible.
- Credit will be given to reporters who follow responsible disclosure.

## Bug Bounty

We are not currently running a formal bug bounty program. Responsible disclosure
is appreciated and will be publicly credited.

## Scope

In scope:

- The Sherpa monorepo.
- Sherpa-owned deployed services.
- Sherpa-owned deployed contracts.

Out of scope:

- Vulnerabilities in third-party dependencies; report those upstream.
- Vulnerabilities in Coinbase Smart Wallets; report those to Coinbase.
- Vulnerabilities in Aave, Aerodrome, or other integrated protocols; report
  those upstream.
