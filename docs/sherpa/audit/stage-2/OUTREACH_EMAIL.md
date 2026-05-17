# Code4rena Engagement Request — Sherpa Stage 2

> This file is for **you** to copy/paste into the Code4rena submission form.
> It is not part of the auditor-facing package. Fill in the email/telegram
> placeholders before sending.

Subject: Audit request — Sherpa Stage 2 (DeFi router for Base)

---

Hi Code4rena team,

I'd like to request a contest audit for Sherpa Stage 2.

## Project

Sherpa is a natural-language AI agent for Base. Users describe what they
want ("swap 100 USDC for ETH", "lend 50 USDC to Aave") and Sherpa builds
safe on-chain transactions via Smart Wallets.

Stage 1 (send tokens) is already live at sherpa-web.vercel.app.

Stage 2 adds DeFi primitives: swap (Aerodrome V2), supply/withdraw/borrow/repay
(Aave V3), and a read-only positions view.

## Scope

- 441 lines of Solidity across 4 in-scope units (2 contracts +
  2 pure libraries); 736 lines including supporting interfaces.
- Battle-tested patterns: OpenZeppelin `Ownable`, `Pausable`,
  `ReentrancyGuard`, `SafeERC20`.
- Integrates Aerodrome V2 and Aave V3 Pool (both independently audited).
- Patched deployment verified on Base Sepolia:
  - SherpaRouter: `0x7CfdE6a4D1A85236419d4343a3A466d0677A0056`
  - SherpaTreasury: `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee`
  - Note: the testnet Aerodrome router is a mock (no official Aerodrome on
    Base Sepolia); the swap path is re-validated on mainnet pre-launch.

## Repository

- Public: https://github.com/gnanam1990/sherpa
- Audit tag: `stage-2-pre-audit-v1.0.0` (canonical reference)
- Audit branch: `audit/stage-2`
- Audit package: `docs/sherpa/audit/stage-2/`

## Test coverage

- 113 Foundry tests passing (0 failed, 0 skipped).
- SherpaRouter coverage: 96.94% lines / 95.35% statements / 90.00% branches /
  100% functions; SherpaTreasury, FeeCalculator, and SafetyCheck are 100%.
- Includes fuzz tests and treasury invariant tests.
- Slither: **0 high, 0 critical**. Residue: 3 medium (`unused-return`),
  1 low, 7 informational — all disclosed in the package's
  KNOWN_ISSUES.md.

## Budget + timeline

- Budget: $3,000 – $8,000 range
- Timeline: as soon as your schedule allows
- Comfortable with a 1–2 week contest window
- Public report after the fix period is preferred

## About me

Solo developer (@0x_art on Twitter). No investors, no token plans. Sherpa
is open source.

Previous projects: openlawb (~20k GitHub stars), PolyForge, KiteIndex.

Happy to provide more context. Looking forward to working with C4.

Thanks,
Gnanam
