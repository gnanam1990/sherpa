# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Mainnet (current) | Yes |
| Testnet | Best-effort |

## Audit History

- Audit Round 1: 2026-05-17, external review round covering GitHub issues #34-#40.
- Audit Round 2: 2026-05-17, external Stage 2 issue report review.

Combined findings: 0 critical, 0 high after remediation.

Static analysis: Slither clean for high and critical findings.

Coverage:

- SherpaRouter: 96.94%
- SherpaTreasury: 100%

Audit materials live in `docs/sherpa/audit/stage-2/`.

## Reporting Vulnerabilities

If you discover a security vulnerability in Sherpa, please report it responsibly.

DO NOT open a public GitHub issue.

Use GitHub private vulnerability reporting when it is enabled for this repository.
If private reporting is unavailable, contact the maintainer privately before
publishing details.

Contact: maintainer to provide email before public launch.

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
