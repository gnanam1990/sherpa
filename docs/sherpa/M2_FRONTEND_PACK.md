# Sherpa — Member 2 (M2) Complete Build Pack

## Frontend / UX — The Surface Engineer

**Member:** M2  
**Role:** Frontend lead, UX owner, design system author  
**CLI:** Cursor (primary, best for UI iteration) + Claude Code (cross-cutting flows)  
**Worktree:** `worktrees/m2-week-{N}`  
**Branch pattern:** `feat/m2-week-{N}-{description}`

---

## 1. Who you are in this team

You are **the surface engineer**. Three things are uniquely yours:

1. **The web app** — every screen users see at sherpa-app.vercel.app
2. **The Mini App** — Farcaster Frames experience (Stage 3+)
3. **Design system** — confirmation cards, progress indicators, risk badges, brand polish

You make Sherpa **feel different from every other crypto dApp**. M1 makes it safe, M3 makes it run, you make people want to use it.

---

## 2. Your domain (what you own)

```
apps/
├── web/           ← M2 ONLY. Next.js 15 app, all pages, all flows.
└── miniapp/       ← M2 ONLY. Farcaster Mini App (Stage 3 onward).

packages/
└── ui/            ← M2 ONLY. Shared React components, design tokens, theme.
```

**You do NOT touch:**

- `packages/safety/*` — that's M1
- `packages/tools/*` — that's M1
- `packages/core/*` — that's M1
- `packages/llm/*` — that's M1
- `packages/identity/*` — that's M3
- `packages/memory/*` — that's M3
- `packages/scheduler/*` — that's M3
- `apps/api/*` — that's M3
- `apps/telegram/*` — that's M3 (Stage 4)
- `scripts/db/migrations/*` — that's M3

If you need a backend change, **ask in #sherpa-blockers** during standup. Don't edit M1's or M3's code yourself.

---

## 3. Your contracts with M1 and M3

### Contract with M1 (Backend)

**You consume:** `ConfirmationCardProps` from `packages/core/types`.

```typescript
// M1 produces this shape; you render it
import type { ConfirmationCardProps } from '@sherpa/core';

// Your job: <ConfirmationCard {...props} />
```

You **never** make up your own confirmation card data. M1's executor produces the props; you display them. If a field you need isn't there, ask M1 to add it — don't fake it.

**You consume:** `ParsedIntent` from `@sherpa/core` to render disambiguation UI.

**You consume:** `ResolverError` types when displaying recipient resolution failures.

### Contract with M3 (Infra)

**You consume:** API endpoints exposed by M3 at `apps/api`:

- `POST /api/parse` → returns `ParseResponse`
- `POST /api/execute` → returns `ExecutionResult`
- `GET /api/balance/:address` → returns `BalanceSnapshot`
- `GET /api/history/:address` → returns `HistoryPage`

You call these from `apps/web` via your own API client. You **never** import directly from `apps/api` source — you use HTTP.

**You produce:** No backend types. You only consume.

---

## 4. The maintainer prompt — load this every CLI session

Save as `docs/sherpa/MAINTAINER_PROMPT_M2.md`. Every Cursor / Claude Code session starts here.

```markdown
# Sherpa — Maintainer Prompt for M2 (Frontend/UX)

You are working on **Sherpa**, the natural-language Base agent.
You are M2 — the frontend/UX lead in a 3-person team.

## Read on every session

1. This file
2. The current week spec at docs/sherpa/specs/M2*WEEK*{N}.md
3. Last 3 commits to understand context

## Your domain (sole ownership)

- apps/web/\* — the Next.js 15 app
- apps/miniapp/\* — the Farcaster Mini App (Stage 3+)
- packages/ui/\* — shared components, design tokens

## Hard rules (non-negotiable)

- Tailwind for all styling. No inline CSS, no styled-components, no CSS modules.
- Use ONLY Tailwind core utility classes — no Tailwind compiler.
- All form interactions via onClick/onChange. NEVER use HTML <form> tags.
- NEVER use localStorage, sessionStorage, IndexedDB. They are banned in this codebase.
- All state in React useState/useReducer. Cross-page state via URL params or M3's API.
- Confirmation card REQUIRED before every tx. No silent transactions, ever.
- Plain English copy: "Earn yield" not "supply to lending pool". "Swap" not "execute trade".
- Risk indicators on every confirmation card per the spec.
- Mobile-first. Test every screen at 375px width minimum.
- TypeScript strict mode. No `any` without justification comment.

## Pre-locked decisions

- Network: Base Sepolia for dev. Mainnet only after Stage 4 audit.
- Domain: sherpa-app.vercel.app (squatted). sherpa.xyz when ready.
- Wallet: Coinbase Smart Wallet (ERC-4337) primary via RainbowKit.
- Theme: Dark, Base blue (#0052FF) accent, Inter font.

## What you DO NOT touch

- packages/safety/_, packages/tools/_, packages/core/_, packages/llm/_ → M1's domain
- packages/identity/_, packages/memory/_, packages/scheduler/\* → M3's domain
- apps/api/_, apps/telegram/_, scripts/db/\* → M3's domain

## When you need backend changes

- New API endpoint? Ask M3 in #sherpa-blockers
- New ConfirmationCardProps field? Ask M1 in #sherpa-blockers
- Identity resolver edge case? Ask M3
- Don't edit other domains directly. Period.

## Patterns to follow

1. Server Components by default in Next.js 15. Use Client Components only when needed (interactivity, hooks).
2. Loading states required for any async operation. No "frozen UI" while waiting.
3. Error states must be graceful — never raw error messages, always plain English.
4. Empty states designed for every list (no balance, no history, etc.)
5. Skeleton loaders for content > 200ms.

## Forbidden in this codebase

- HTML <form> tags (use button + onClick instead)
- localStorage / sessionStorage / IndexedDB
- Tailwind utilities outside the core set (no plugins, no custom)
- Direct fetches to non-Sherpa APIs (always go through M3's apps/api)
- Hardcoded contract addresses (import from @sherpa/safety)
- Hardcoded RPC URLs (use @sherpa/config)
- console.log in production paths (use pino logger from M3)

## Communication style

- Show, don't describe. If the design is in question, build a quick prototype.
- When asking for a backend change, paste a sample of the props/response you want.
- Surface UX questions in the daily standup, not buried in code reviews.

## When to escalate

- Major design direction shift → group discussion in #sherpa-decisions
- Ambiguous spec → ask M1 (he has tiebreaker)
- Performance regression → flag immediately
- A confirmation card design that hides risk → MUST escalate, never ship silently
```

---

## 5. Day-1 kickoff prompt for Cursor (or Claude Code)

Open Cursor in your worktree. Paste this exact prompt:

```
You are working on Sherpa Stage 1, Week 1 — as M2 (Frontend/UX lead).

Read these files in order before doing anything else:
1. docs/sherpa/MAINTAINER_PROMPT_M2.md (your constitution)
2. docs/sherpa/specs/M2_WEEK_1.md (this week's spec for M2)
3. docs/sherpa/SHERPA_PRD_v3_TEAM.md (full product context)
4. docs/sherpa/SHERPA_TEAM_PLAN.md (how the 3 of us coordinate)

After reading, do NOT write code yet.

Step 1: Confirm you understand:
- Your domain (apps/web, apps/miniapp, packages/ui) and what you do NOT touch
- Your contracts with M1 (ConfirmationCardProps) and M3 (HTTP API endpoints)
- The forbidden patterns (no <form>, no localStorage, no inline CSS)

Step 2: Ask me 3-5 clarifying questions about the Week 1 M2 deliverables.

Step 3: Wait for my answers before proposing a Day 1 plan.

Do NOT make any assumptions about what M1 and M3 are doing. Focus only on
your domain.
```

---

## 6. Your Stage 1 deliverables (4 weeks)

### Week 1 — Web app foundation + design system (Days 1–5)

**Branch:** `feat/m2-week-1-foundation`

| Day | Deliverable                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/web` Next.js 15 scaffold (App Router, Tailwind, TypeScript). Configure `apps/web/lib/wagmi.ts` for Base Sepolia + Coinbase Smart Wallet.                  |
| 2   | Design tokens in `packages/ui/src/tokens.ts`: colors (Base blue), typography (Inter), spacing scale, border radius scale. Theme provider component.             |
| 3   | Connect Wallet flow: RainbowKit `<ConnectButton />` + custom-styled `apps/web/components/ConnectButton.tsx`. Match Sherpa branding.                             |
| 4   | Landing page `apps/web/app/page.tsx` with hero "Type anything. Sherpa does it." + connect prompt + tagline.                                                     |
| 5   | Stub `packages/ui/src/ConfirmationCard.tsx` (no logic yet, just the visual structure). Stub `packages/ui/src/RiskBadge.tsx`, `ProgressIndicator.tsx`. CI green. |

**Definition of done Week 1:** sherpa-app.vercel.app is live, user can connect Smart Wallet, landing page is polished. M3 ships the resolver page.

### Week 2 — Chat input + disambig UI (Days 6–10)

**Branch:** `feat/m2-week-2-chat-input`

| Day | Deliverable                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | `apps/web/components/ChatInput.tsx` — sticky bottom input, sends on Enter, calls M3's `/api/parse`.                                            |
| 7   | `apps/web/components/MessageThread.tsx` — renders message history (user input + parsed intent JSON for now).                                   |
| 8   | Disambiguation UI: when API returns `status: 'disambig'`, render the question + answer input. Multi-turn flow.                                 |
| 9   | Rejection UI: when API returns `status: 'rejected'`, render reason + 3 example phrasings as clickable suggestions.                             |
| 10  | Loading states (spinner during parse), error states (network failure, rate limited), empty state (first-time user prompt). 60%+ test coverage. |

**Coverage gate:** apps/web 60%+, packages/ui 70%+.

### Week 3 — Confirmation card + SEND end-to-end (Days 11–15)

**Branch:** `feat/m2-week-3-confirmation`

| Day | Deliverable                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Full `packages/ui/src/ConfirmationCard.tsx` impl: amount, recipient, gas display, risk indicators, multi-step indicator, sponsored badge. |
| 12  | Success card variant — animation, tx link to Basescan, "Send another" CTA. Failure card variant — error message, retry CTA.               |
| 13  | Wire end-to-end SEND flow: parse → confirm card → user taps Proceed → M1's executor runs → success/failure.                               |
| 14  | Polish: animations, transitions between states, loading shimmer, mobile responsiveness audit (375px, 414px, 768px).                       |
| 15  | E2E test (Playwright): full SEND flow on Anvil fork. Manual smoke test on real Sepolia with M1's actual USDC tool.                        |

**Coverage gate:** packages/ui 80%+, apps/web 60%+.

### Week 4 — BET + BUY + Stage 1 launch polish (Days 16–20)

**Branch:** `feat/m2-week-4-bet-buy`

| Day | Deliverable                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | BET confirmation card variant: market question, shares, max payout, slippage, multi-step note.                                           |
| 17  | BUY confirmation card variant: rate, slippage UI (adjustable), Sherpa fee disclosure.                                                    |
| 18  | Onramp UI: when balance insufficient, show "Add USDC" prompt with Coinbase Onramp launch button. Polling state.                          |
| 19  | Marketing page `apps/web/app/about/page.tsx`: hero, features, how it works, FAQ. Polish for launch.                                      |
| 20  | Final polish: 404 page, error boundary, app shell loading state, accessibility pass (keyboard nav, screen reader basics). Stage 1 ships. |

**Coverage gate:** all M2 packages at target. Stage 1 ships end of Day 20.

---

## 7. Design principles (the Sherpa look & feel)

These are non-negotiable. Every screen follows these:

### 7.1 The "boring is beautiful" principle

Sherpa moves real money. Flashy animations make users distrust it. Use:

- **Neutral palette + ONE accent color** (Base blue, used sparingly)
- **No gradients** unless meaningful (e.g. progress)
- **No emoji in UI chrome** — only in user content (cast composer, etc.)
- **No decorative icons** — every icon must convey information
- **Generous whitespace** — never cramped

### 7.2 The "show the cost" principle

Every screen that triggers a tx must show:

- Exact amount in/out
- Effective rate (for swaps)
- Slippage (for trades)
- Gas estimate (sponsored or not)
- Risk indicator (if any)

If a user can't see what's about to happen, it's not Sherpa — it's a slot machine.

### 7.3 The "two-tap minimum" principle

Every tx requires:

- Tap 1: type intent or use shortcut
- Tap 2: review + Proceed

Never collapse to one tap. Confirmation cards are non-negotiable.

### 7.4 The "mobile-first" principle

375px width is the design target. Desktop is a happy bonus. Test:

- Touch targets ≥ 44px
- No horizontal scroll
- Confirmation cards fit one screen, no scroll

### 7.5 The "graceful failure" principle

Every error state has:

- Plain English explanation (not "ERR_INSUFFICIENT_BALANCE")
- Suggested action ("Get USDC", "Try a smaller amount")
- Path forward (retry, cancel, contact support)

---

## 8. Your daily rhythm

```
09:30 IST — Standup (15 min)
  Your update format:
    Yesterday: [commits + screenshots in #sherpa-devlog]
    Today: [3 max]
    Blockers: [or none]
    Cross-domain asks: ["M1: ConfirmationCardProps needs slippage field"]
                      ["M3: /api/balance returns wrong shape, expected X"]

10:00 IST — Coding starts
  Open tmux session "m2":
    Pane 0: Cursor in worktrees/m2-week-{N}
    Pane 1: bash for git/test runs
    Pane 2: pnpm dev (live preview)
    Pane 3: Claude Code (review your Cursor PR)

13:00 — break

14:00 — coding continues

17:30 — End of day:
  - Commit & push
  - Open PR if feature complete
  - Review M1 or M3's PR
  - Write devlog entry: docs/sherpa/devlog/YYYY-MM-DD-m2.md
  - SCREENSHOT every UI change in #sherpa-devlog (visual record matters for UX)

18:00+ — async (no required time)
```

---

## 9. PR review workflow

When you open a PR, post in `#sherpa-prs`:

```
🟢 M2 PR ready: feat/m2-week-1-foundation
- Touches: apps/web, packages/ui
- Tests added: yes (75% coverage)
- Screenshots: [attach mobile + desktop]
- Cross-domain impact: M3 needs to confirm /api/parse return shape
- Review request: M1 (since it's M1's turn)
```

When reviewing M1's or M3's PR:

1. `gh pr checkout <PR>`
2. Run `pnpm dev` and visually verify their changes don't break your UI
3. Run Claude Code on the diff with this prompt:
   ```
   Review this PR for Sherpa. I'm M2 (frontend/UX lead).
   The PR is from M1 (backend) or M3 (infra).
   Look for:
   - Type contract changes that affect my UI imports
   - New API responses my UI doesn't handle yet
   - Anything that adds backend complexity without UX benefit
   - Performance regressions visible in DevTools
   Don't review their code style — focus on what affects my domain.
   ```
4. Approve if clean, request changes if not

---

## 10. The component library (your masterpiece)

`packages/ui/` is your masterpiece. Required components by Stage 1 end:

### Stage 1 components

- [ ] `Button` — primary, secondary, danger variants
- [ ] `Input` — text, number, address (with validation)
- [ ] `Card` — base container with shadow + border
- [ ] `ConfirmationCard` — the most important component, multiple intent variants
- [ ] `ProgressIndicator` — multi-step transactions
- [ ] `RiskBadge` — yellow/orange/red severity
- [ ] `SponsoredBadge` — gas sponsorship indicator
- [ ] `MessageBubble` — user message and Sherpa message variants
- [ ] `LoadingShimmer` — skeleton loaders
- [ ] `EmptyState` — for lists with no items
- [ ] `ErrorState` — for failure recovery
- [ ] `Toast` — non-blocking notifications

### Stage 2 components (DeFi)

- [ ] `SlippageSelector` — adjustable slippage UI
- [ ] `HealthFactorIndicator` — for borrow operations
- [ ] `YieldComparator` — Morpho vs Aave rates
- [ ] `LPPositionCard` — liquidity position visualization

### Stage 3 components (Social)

- [ ] `CreatorProfileCard`
- [ ] `CastComposer`
- [ ] `MarketCard` (BET intent details)

### Stage 4 components (Power)

- [ ] `PortfolioChart`
- [ ] `ScheduleSelector` (DCA frequency)
- [ ] `AlertConditionBuilder`

---

## 11. Failure modes to avoid

These cost the most time if you slip:

1. **Touching M1 or M3's domain** — even "just to fix a quick bug." Always ask.
2. **Faking confirmation card data** — if M1's executor doesn't produce a field you need, ask. Don't make it up.
3. **Skipping mobile testing** — Sherpa is mobile-first. Every PR tested at 375px.
4. **Adding `<form>` tags** — banned. Use button + onClick.
5. **Reaching for localStorage** — banned. State in React or via M3's API.
6. **Inventing your own design tokens** — use `packages/ui/tokens.ts`. If you need a new color, ADD it to tokens; never inline.
7. **Skipping accessibility** — keyboard nav + screen reader basics required for launch.
8. **Self-merging your own PR** — wait for M1 or M3.

---

## 12. Tools & accounts you need on Day 1

```
☐ GitHub access to Sherpa repo (M1 invites you)
☐ Vercel team membership (M1 invites you)
☐ Supabase team membership (M1 invites you, you have read-only DB access)
☐ Cursor or Claude Code installed
☐ Coinbase Smart Wallet on Base Sepolia (test wallet for UI testing)
☐ Figma access (if M1 sets up team workspace) — for design exploration
☐ Discord access to Sherpa channels
☐ Local pnpm install + node 22 + bun
```

---

## 13. Your equity and accountability

Per team agreement (Option B):

- M1: 50%
- M2 (you): 25%
- M3: 25%

You earn this by:

- Owning Sherpa's UX quality (people want to come back)
- Shipping mobile-first, accessible, polished surfaces
- Catching UX flaws in M1's flows before users do
- Being the user advocate in every architectural decision

If you slip on UX quality (poor mobile, missing error states, ugly polish) — Sherpa ships looking like every other dApp. That's the failure to avoid.

---

## 14. Read this last

You are not "the design person" or "just the frontend dev." You are the reason Sherpa stands out. Every time someone says "wow, that's a smooth crypto experience" — that's because of you.

M1 makes Sherpa correct. M3 makes Sherpa run. **You make Sherpa felt.**

Trust M1's safety work. Trust M3's infra. Spend your full energy on:

- Animations that feel right (not too fast, not too slow)
- Copy that's plain and warm (not jargon, not corporate)
- Edge cases users hit (no balance, slow network, weird inputs)
- Mobile experience nobody else in crypto bothers with

Ship beautiful. Ship felt. Ship together.

---

_M2 pack v1 — April 30, 2026._  
_Your work is what users see. Make it count._
