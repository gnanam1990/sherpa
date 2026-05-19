# Sherpa v0.5.0 - first open source release

Sherpa is now prepared for its first public open-source release.

This release makes the Sherpa monorepo ready for public review: Apache 2.0
licensing, public contribution guidelines, security disclosure policy, GitHub
templates, verified contract references, and presentation-ready project
documentation are all in place.

## Summary

Sherpa is a natural-language DeFi agent for Base.

Users type intents like:

```text
supply 100 USDC to Aave
```

Sherpa parses the intent, runs deterministic safety checks, shows an explicit
confirmation, and routes supported Base mainnet actions through independently
reviewed smart contracts.

## Live links

| Surface        | Link                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| Web / Mini App | `https://sherpa-miniapp.vercel.app`                                       |
| GitHub         | `https://github.com/gnanam1990/sherpa`                                    |
| Farcaster      | `https://farcaster.xyz/gnanam.eth`                                        |
| X              | `https://x.com/0x_art`                                                    |
| Router         | `https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` |
| Treasury       | `https://basescan.org/address/0xF4e72beAA559E1815f4671e39EDb1295aD975918` |

## Verified Base mainnet contracts

| Contract       | Address                                      | Status                    |
| -------------- | -------------------------------------------- | ------------------------- |
| SherpaRouter   | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` | Verified on Basescan      |
| SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` | Verified on Basescan      |
| Owner          | Safe multisig                                | Mainnet ownership guarded |

## Features shipped

| Area                    | Status | Notes                                                                  |
| ----------------------- | ------ | ---------------------------------------------------------------------- |
| Natural-language parser | Live   | Parses supported send, swap, lending, automation, and account intents  |
| Base mainnet execution  | Live   | Base is the only chain where Sherpa signs transactions                 |
| Aave V3 lending actions | Live   | Supply, borrow, repay, and withdraw through the reviewed router        |
| Aerodrome swaps         | Live   | Swap flow uses route validation and slippage checks                    |
| Multi-chain portfolio   | Live   | Read-only balances for Ethereum, Polygon, Optimism, Arbitrum, and Base |
| Alerts                  | Live   | Notification framework with production surfaces documented             |
| DCA                     | Live   | Scheduler-backed automation surface                                    |
| Auto-repay              | Live   | Guarded automation surface for health-factor protection                |
| Telegram bot            | Live   | Chat surface for Sherpa interactions                                   |
| Mini App                | Live   | Farcaster FID `976779`, Base App app_id `6a06efd3067444793fb8ddba`     |

## Security review and verification status

- 2 independent security reviews completed (anandh8x, vasanthdev2004)
- 0 critical findings, 0 high findings after remediation
- Slither: 0 high / 0 critical
- SherpaRouter coverage: 96.94%
- SherpaTreasury coverage: 100%
- Workspace tests: 2,200 passing, 2 skipped
- Formal external audit planned before v1.0

See `SECURITY.md` for the public security policy and review summary.

## Safety model

Sherpa's execution flow is intentionally deterministic:

```text
User intent
  -> Parser
  -> Safety checks
  -> Explicit confirmation
  -> Reviewed router
  -> Onchain execution
```

LLMs do not bypass safety checks. Wallet signatures still require explicit user
confirmation.

## Known limitations

These limitations are intentional and public:

- Session keys are pending Coinbase Smart Wallet general availability.
- Morpho Blue is scaffolded but not wired for production execution.
- Multi-chain transactions are not enabled. Non-Base chains are read-only
  portfolio display only.
- Bridge functionality is disabled until adapters are reviewed or audited.
- Base mainnet is the only chain where Sherpa signs transactions.

## Open source preparation included

- Apache 2.0 `LICENSE`
- `NOTICE` with maintainer and verified contract information
- `SECURITY.md` responsible disclosure policy
- `CONTRIBUTING.md` contribution guidelines
- Apache 2.0 source headers on 298 source files
- Presentation-ready root `README.md`
- GitHub issue templates
- GitHub pull request template
- Placeholder `FUNDING.yml`
- Hardened `.gitignore`
- Public repository setup checklist

## Installation

```bash
git clone https://github.com/gnanam1990/sherpa.git
cd sherpa
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

## Maintainer

- GitHub: `@gnanam1990`
- Farcaster: `gnanam.eth`
- X: `@0x_art`
- Location: Ooty, Tamil Nadu, India

## Acknowledgments

Thanks to independent security reviewers anandh8x and vasanthdev2004 for helping
harden the Stage 2 contracts, and to the Base, Aave, Aerodrome, Farcaster, Mini
App, Viem, Wagmi, Foundry, and Next.js ecosystems that Sherpa builds on.

This release is intentionally honest: what is live is marked live, what is
read-only is marked read-only, and what is blocked on future review, audit, or
platform availability is called out directly.
