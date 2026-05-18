# Glass Aurora — Production Screenshot Manifest

**Status: capture pending (manual).** These 14 PNGs are not committed yet.
The agent that built Glass Aurora has no browser/screenshot capability and
cannot connect a real wallet to show real on-chain data, so it did **not**
generate placeholder images — that would violate Sherpa's no-fake-data
rule. This manifest specifies exactly what to capture so the set is
deterministic and consistent.

## Capture environment

```bash
# apps/web/.env.local
NEXT_PUBLIC_GLASS_AURORA=1

pnpm --filter @sherpa/ui --filter @sherpa/core --filter @sherpa/logger build
pnpm --filter @sherpa/api dev    # http://localhost:3001  (real data: positions/alerts/etc.)
pnpm --filter @sherpa/web dev    # http://localhost:3100
```

## Specs (every shot)

- **1920×1080**, PNG, browser zoom **100%**
- Clean state: no error toasts, no devtools, no debug panels
- Real wallet connected (Coinbase Smart Wallet) showing **real** data
  where the route is wallet-gated; otherwise the honest disconnected/empty
  state — never a faked address or fabricated record
- Capture after data settles (no spinners)

## Shot list → route → filename

| # | File | Route | What must be visible |
| --- | --- | --- | --- |
| 01 | `01-home-composer.png` | `/` | Aurora bg, IconRail, TopBar, conversation thread, ComposerPill |
| 02 | `02-positions-aave.png` | `/positions` | Real Aave V3 collateral hero + HF chip + stat tiles (or honest empty state) |
| 03 | `03-swap-workspace.png` | `/swap` | Glass intent workspace, suggested prompt, guardrails, Stage2 status |
| 04 | `04-lend-yield.png` | `/lend` | Lend intent workspace + guardrails |
| 05 | `05-borrow-hf.png` | `/borrow` | Borrow workspace + the real 1.5 min-HF guardrail copy |
| 06 | `06-repay-debt.png` | `/repay` | Repay workspace |
| 07 | `07-withdraw-flow.png` | `/withdraw` | Withdraw workspace |
| 08 | `08-dca-schedule.png` | `/dca` | Glass shell + DCA form + real schedule list (or honest empty) |
| 09 | `09-alerts-channels.png` | `/alerts` | Glass shell + 5-channel selector with real configured/active state |
| 10 | `10-auto-repay-hf.png` | `/auto-repay` | Glass shell + HF threshold form + honest gating note |
| 11 | `11-multi-chain-registry.png` | `/multi-chain` | Real chain registry + testnet/experimental badges |
| 12 | `12-session-keys-honest.png` | `/session-keys` | Coinbase Smart Wallet blocker copy prominently visible |
| 13 | `13-governance-snapshot.png` | `/governance` | Real Snapshot proposal feed (or honest empty state) |
| 14 | `14-about-credentials.png` | `/about` | Ice hero + credibility block (audits / coverage / MIT) |

Bonus (optional, for the hero confirm card — the signature surface):
type an intent on `/` (e.g. `send 5 usdc to <addr>`) and capture the
`HeroConfirmCard` with its real `risk_indicators`/`warnings`.

## After capture

Drop the PNGs in this directory with the exact filenames above, then:

```bash
git add docs/screenshots/glass-aurora/*.png
git commit -m "docs(web): add glass aurora production screenshots"
```

The root README references `02-positions-aave.png` as the hero image; it
renders once that file is committed.
