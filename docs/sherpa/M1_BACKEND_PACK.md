# Sherpa — Member 1 (M1) Complete Build Pack

## Backend / Tools / Safety — The Lead Engineer

**Member:** M1 (Gnanam, @0x_art)  
**Role:** Lead engineer, safety owner, tool author  
**CLI:** Claude Code (primary) + Codex (review)  
**Worktree:** `worktrees/m1-week-{N}`  
**Branch pattern:** `feat/m1-week-{N}-{description}`

---

## 1. Who you are in this team

You are the **lead engineer**. Three things are uniquely yours:

1. **Safety system (Rings 1–7)** — sole owner, nobody else commits here without your approval
2. **Protocol adapters** — every external protocol Sherpa talks to (USDC, Limitless, Uniswap, Aerodrome, Morpho, Aave, Lido, Across, Zora, Clanker, Farcaster Hub, Basenames)
3. **Agent core** — the executor, planner, parser, openclaude wrapper

You also have **tiebreaker authority** on architectural disagreements. M2 and M3 own their domains, but disputes that span domains escalate to you.

---

## 2. Your domain (what you own)

```
packages/
├── safety/        ← M1 ONLY. Rings 1-7. No other member commits here.
├── tools/         ← M1 ONLY. All protocol adapters.
├── core/          ← M1 ONLY. Executor, planner, parser, disambig.
├── llm/           ← M1 ONLY. openclaude wrapper, cost tracking.
└── agentkit/      ← M1 ONLY. Coinbase AgentKit fallback.
```

**You do NOT touch:**

- `apps/web/*` — that's M2
- `apps/miniapp/*` — that's M2
- `packages/ui/*` — that's M2
- `packages/identity/*` — that's M3
- `packages/memory/*` — that's M3
- `packages/scheduler/*` — that's M3
- `apps/api/*` — that's M3
- `scripts/db/migrations/*` — that's M3

If you need a change in someone else's domain, **ask in #sherpa-blockers** during standup. Don't edit it yourself.

---

## 3. Your contracts with M2 and M3

These are the type interfaces you own. When they change, you announce in standup BEFORE merging.

### Contract with M2 (Frontend)

**You produce:** `ConfirmationCardProps` from your executor's plan output.

```typescript
// packages/core/src/executor.ts (you write this)
export type ConfirmationCardProps = {
  intent: 'SEND' | 'BUY' | 'BET' | 'SWAP' | /* ...all Stage 1+ intents */;
  primary_action_label: string;       // "Send", "Buy", "Bet"
  primary_amount_display: string;      // "5 USDC"
  secondary_amount_display?: string;   // "≈ $5.00"
  recipient_display?: string;          // "@vitalik"
  recipient_metadata?: any;
  steps: ExecutionStep[];              // multi-step plan
  gas_display: string;                 // "$0.00 (sponsored ✓)" or "~$0.04"
  warnings: string[];                  // risk indicators
  estimated_completion_ms: number;
};
```

M2 imports this type and renders it. You guarantee shape stability — never break this contract without 24h notice.

### Contract with M3 (Infra)

**You consume:** `ResolvedAddress` from `packages/identity`.

```typescript
// packages/identity/src/types.ts (M3 writes this)
export type ResolvedAddress = {
  address: Address;
  source: 'farcaster' | 'basename' | 'ens' | 'direct';
  display: string;
  metadata?: { ... };
};
```

You **never** call Farcaster, ENS, or Basenames directly. Always go through `packages/identity.resolve()`.

**You produce:** every audit log row write/update goes through M3's `packages/memory` interface.

```typescript
// packages/memory/src/audit.ts (M3 writes this)
export async function createAuditLog(input: CreateAuditLogInput): Promise<number>;
export async function updateAuditLog(id: number, patch: Partial<AuditLogPatch>): Promise<void>;
```

You write to audit log via these functions. You never INSERT into the table directly.

---

## 4. The maintainer prompt — load this every CLI session

Save this as `docs/sherpa/MAINTAINER_PROMPT.md`. Every Claude Code / Codex session starts by reading it.

```markdown
# Sherpa — Maintainer Prompt for M1 (Backend/Tools/Safety)

You are working on **Sherpa**, the natural-language Base agent.
You are M1 — the lead backend/safety engineer in a 3-person team.

## Read on every session

1. This file
2. The current week spec at docs/sherpa/specs/M1*WEEK*{N}.md
3. Last 3 commits to understand context

## Your domain (sole ownership)

- packages/safety/\* — Rings 1-7
- packages/tools/\* — all protocol adapters
- packages/core/\* — executor, planner, parser
- packages/llm/\* — openclaude wrapper
- packages/agentkit/\* — fallback adapter

## Hard rules (non-negotiable)

- TypeScript strict mode. No `any` without justification comment.
- Every protocol adapter exports: quote(), buildTx(), verify(). Naming non-negotiable.
- Every adapter imports ALLOWED_CONTRACTS from packages/safety and asserts target before building tx.
- LLM-generated addresses NEVER execute. All recipients via packages/identity (M3 owns).
- Amount caps enforced at safety layer. Tools never bypass.
- audit_log written BEFORE submitting tx, UPDATED after confirmation. Use M3's createAuditLog/updateAuditLog functions.
- EIP-5792 sponsorability wrapper required on every write tool.
- Test coverage: packages/safety = 90%+, packages/tools = 80%+, packages/core = 80%+.

## Pre-locked decisions

- Network: Base Sepolia for dev. Mainnet only after Stage 4 audit.
- BET target: Limitless primary, PolyForge fallback.
- Revenue: 0.1% swap fee from Stage 2 onward.
- Wallet: Coinbase Smart Wallet only (no MetaMask Stages 1-3).
- LLM router: openclaude (existing infra).

## Patterns inherited from PolyForge

1. Clarification round: ask 3-5 questions BEFORE writing code for any new spec.
2. Postgres event indexer: idempotent UPSERT on (tx_hash, log_index), REORG_LOOKBACK = 20 blocks.
3. EIP-5792 sponsorability detection on every tx.
4. Sensitive env vars marked at add time in Vercel.

## Forbidden in this codebase

- `tengu_` references (any kind)
- `USER_TYPE === 'ant'` checks
- Hardcoded API tokens
- `localStorage` / `sessionStorage` (banned everywhere)
- Direct INSERTs into audit_log (use M3's wrapper)
- LLM-generated 0x addresses bypassing identity package
- Direct Farcaster/ENS/Basenames API calls (use packages/identity)

## Cross-domain coordination

- Need a UI change? Ask M2 in #sherpa-blockers, don't edit apps/web/\*.
- Need a new identity resolver? Ask M3, don't edit packages/identity/\*.
- Need a new audit log column? Ask M3 to write the migration.
- Type contract change in your exports? Announce in standup BEFORE merging.

## Communication style

- Concise, direct, no preamble.
- Number your clarifying questions.
- Surface blockers immediately, not at end of day.
- Don't fix bugs in M2's or M3's code — report in #sherpa-blockers, let them fix.

## When to escalate to the team

- Cross-domain spec ambiguity → #sherpa-decisions
- Safety ring change proposal → 24h pause + group discussion
- New contract address for allowlist → group review
- Anything touching mainnet money → ALL THREE approve

## Failure modes to avoid

- Skipping the clarification round (saves 5 hours per stage)
- Building without specs (every package has a spec file first)
- Adding protocols not in current stage (defer to next stage)
- Premature optimization (Vercel Hobby + daily cron is fine for Stage 1)
- Touching M2/M3 domains directly
```

---

## 5. Day-1 kickoff prompt for Claude Code

Open Claude Code in your worktree. Paste this exact prompt:

```
You are working on Sherpa Stage 1, Week 1 — as M1 (Backend/Tools/Safety lead).

Read these files in order before doing anything else:
1. docs/sherpa/MAINTAINER_PROMPT.md (your constitution)
2. docs/sherpa/specs/M1_WEEK_1.md (this week's spec for M1)
3. docs/sherpa/SHERPA_PRD_v3_TEAM.md (full product context)
4. docs/sherpa/SHERPA_TEAM_PLAN.md (how the 3 of us coordinate)

After reading, do NOT write code yet.

Step 1: Confirm you understand:
- Your domain (safety, tools, core, llm, agentkit) and what you do NOT touch
- Your type contracts with M2 (ConfirmationCardProps) and M3 (ResolvedAddress, audit_log)
- The 5 hard rules

Step 2: Ask me 3-5 clarifying questions about the Week 1 M1 deliverables.

Step 3: Wait for my answers before proposing a Day 1 plan.

Do NOT make any assumptions about what M2 and M3 are doing. If a task seems
to bleed into their domain, flag it. Don't try to do their work.
```

---

## 6. Your Stage 1 deliverables (4 weeks)

### Week 1 — Foundation (Days 1–5)

**Branch:** `feat/m1-week-1-foundation`

| Day | Deliverable                                                                                                                                                            | Coverage gate          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Turborepo scaffold (root config, turbo.json, tsconfig project refs). Stub all packages with empty exports.                                                             | Compiles, no tests yet |
| 2   | `packages/safety/src/allowlist.ts` with Base Sepolia addresses (USDC, Limitless factory placeholder). `packages/safety/src/types.ts` with all 7 Ring type definitions. | 100% types             |
| 3   | `packages/llm/src/openclaude.ts` skeleton with provider routing types. Define `LLMTask`, `LLMRequest`, `LLMResponse`. No real impl yet.                                | Types compile          |
| 4   | `packages/tools/src/types.ts` with adapter shape (`quote/buildTx/verify` signatures). Stub `packages/tools/src/usdc.ts` with empty function bodies.                    | Types compile          |
| 5   | `packages/core/src/types.ts` with `ParsedIntent`, `ExecutionStep`, `ExecutionPlan`, `ConfirmationCardProps`. Wire all package.json deps. CI green.                     | Coverage N/A this week |

**Definition of done Week 1:** All M1 packages compile, types exported, M2 and M3 can import them. No implementation yet.

### Week 2 — Parser + openclaude wrapper (Days 6–10)

**Branch:** `feat/m1-week-2-parser`

| Day | Deliverable                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ |
| 6   | Full `packages/llm/src/openclaude.ts` impl. Provider routing (GPT-4o-mini, Groq, Claude Haiku). Retry + fallback logic.  |
| 7   | `packages/core/src/parser.ts` for Stage 1 intents (SEND, BUY, BET, BALANCE, HISTORY). System prompt + few-shot examples. |
| 8   | `packages/core/src/disambig.ts` multi-turn flow. Session state via M3's KV interface.                                    |
| 9   | LLM cost tracking via M3's `llm_usage` table. Tests for confidence thresholds.                                           |
| 10  | Integration: parser handles all 5 Stage 1 intents end-to-end (no execution yet). 80%+ coverage.                          |

**Coverage gates:** packages/llm 80%+, packages/core 80%+.

### Week 3 — SEND tool + safety rings (Days 11–15)

**Branch:** `feat/m1-week-3-send`

| Day | Deliverable                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| 11  | `packages/safety/src/rings.ts` full impl of Rings 1, 2, 3, 5. Ring 4 (caps) tied to M3's getUserHistorySnapshot. |
| 12  | `packages/tools/src/usdc.ts` full impl: quote(), buildTx(), verify(). Multicall for balance + allowance.         |
| 13  | `packages/safety/src/sponsor.ts` — EIP-5792 sponsorability wrapper.                                              |
| 14  | `packages/core/src/executor.ts` — sequential plan execution with audit log updates.                              |
| 15  | Integration: real SEND on Base Sepolia. M2 wires up confirmation card, M3 wires up API. End-to-end test passes.  |

**Coverage gates:** packages/safety 90%+, packages/tools 80%+, packages/core 80%+.

### Week 4 — BET + BUY + Stage 1 launch (Days 16–20)

**Branch:** `feat/m1-week-4-bet-buy`

| Day | Deliverable                                                                                     |
| --- | ----------------------------------------------------------------------------------------------- |
| 16  | `packages/tools/src/limitless.ts` — findMarket, quote, buildBuyTx, verify.                      |
| 17  | `packages/tools/src/uniswap.ts` — quote() and buildSwapTx() for BUY.                            |
| 18  | `packages/tools/src/onramp.ts` — Coinbase Onramp adapter (mocked for Sepolia).                  |
| 19  | Multi-step executor with EIP-5792 batching. PolyForge fallback for BET.                         |
| 20  | Stage 1 launch readiness: full smoke test on Sepolia, audit log review, coverage gate verified. |

**Coverage gates:** all M1 packages at target. Stage 1 ships end of Day 20.

---

## 7. Your daily rhythm

```
09:30 IST — Standup (15 min)
  Your update format:
    Yesterday: [commits]
    Today: [3 max]
    Blockers: [or none]
    Cross-domain asks: ["M2: I need ConfirmationCardProps to accept X"]
                      ["M3: please add column Y to audit_log"]

10:00 IST — Coding starts
  Open tmux session "m1":
    Pane 0: Claude Code in worktrees/m1-week-{N}
    Pane 1: bash for git/test runs
    Pane 2: Codex (review your CC's PR)
    Pane 3: pnpm --filter <package> exec vitest

13:00 — break

14:00 — coding continues

17:30 — End of day:
  - Commit & push current branch
  - Open PR if feature complete
  - Review M2 or M3's PR (whichever is open)
  - Write devlog entry: docs/sherpa/devlog/YYYY-MM-DD-m1.md

18:00+ — async (no required time)
```

---

## 8. PR review workflow (you review M2's or M3's, they review yours)

When you open a PR, post in `#sherpa-prs`:

```
🟢 M1 PR ready: feat/m1-week-1-foundation
- Touches: packages/safety, packages/tools, packages/core
- Tests added: yes (90% coverage)
- Cross-domain impact: M2 needs to update import paths (notified above)
- Review request: M3 (since it's M3's turn)
```

When reviewing M2's or M3's PR:

1. Read the diff in your terminal: `gh pr checkout <PR>`
2. Run `pnpm test` locally
3. Run Codex (your review CLI) on the diff with this prompt:
   ```
   Review this PR for the Sherpa project. I'm M1 (backend/safety lead).
   The PR is from M2 (frontend) or M3 (infra).
   Look for:
   - Type contract violations with my packages
   - Imports from my domain that shouldn't be there
   - Anything that bypasses my safety rings
   - Test coverage gaps
   - PolyForge pattern adherence
   Don't review style — that's prettier's job.
   ```
4. Post Codex's findings as PR comments
5. Approve if clean, request changes if not

---

## 9. The 7 safety rings (your masterpiece)

You are the sole owner of `packages/safety/`. The rings are the heart of Sherpa.

| Ring | What it does         | When it runs              | Owner test cases                                                |
| ---- | -------------------- | ------------------------- | --------------------------------------------------------------- |
| 1    | Intent allowlist     | After parse               | Stage 1: only [SEND, BUY, BET, BALANCE, HISTORY]                |
| 2    | Contract allowlist   | Before tx build           | Reject tx to address not in ALLOWED_CONTRACTS                   |
| 3    | Address verification | After identity resolve    | Reject zero address, malformed, contracts (when not expected)   |
| 4    | Amount caps          | Before tx build           | $50 new user, $500 standard, $2000 daily                        |
| 5    | Audit trail          | Throughout                | audit_log row exists, status updates correctly                  |
| 6    | Tenderly simulation  | Before signing (Stage 2+) | Skip if < $100, fail if simulation reverts                      |
| 7    | Anomaly detection    | Before signing (Stage 2+) | Multiple large txs, zero-activity recipient, unlimited approval |

**You ship rings 1–5 in Stage 1. Rings 6–7 in Stage 2.**

---

## 10. Failure modes to avoid

These cost you the most time if you slip:

1. **Touching M2 or M3's domain** — even "just a tiny fix" — breaks the trust contract. Always ask first.
2. **LLM hallucinating addresses** — if any address comes from openclaude output and goes to a tx, that's a Ring 3 bypass. Ban this in code reviews.
3. **Skipping the clarification round** — every spec phase, ask Claude Code 3-5 questions first. Never write code blind.
4. **Deploying to mainnet "just to test"** — Sepolia only through Stage 4.
5. **Adding `console.log` in production paths** — use the pino logger from `packages/logger` (M3 owns).
6. **Hardcoding env vars** — go through `packages/config/env.ts` (M3 owns) with zod validation.
7. **Self-merging your own PR** — always wait for M2 or M3's approval first.

---

## 11. Your equity and accountability

Per the team agreement (Option B from team plan):

- M1 (you): 50%
- M2: 25%
- M3: 25%

You earn this by:

- Owning Sherpa's safety + reliability (no Ring bypasses, no money lost)
- Direction-setting on architectural decisions
- Tiebreaker authority on disputes
- Highest accountability if Sherpa fails

If you slow down or vanish for 1+ week without notice, M2 and M3 have the right to escalate. The equity reflects authority + responsibility, not entitlement.

---

## 12. Tools & accounts you need on Day 1

```
☐ GitHub access to Sherpa repo (you create it)
☐ Vercel account (you create org, add M2/M3)
☐ Supabase account (you create project, add M2/M3 to team — M3 manages migrations)
☐ Coinbase Cloud account (RPC, free tier)
☐ Alchemy free tier (ETH mainnet RPC for ENS)
☐ Tenderly account (Stage 2 prep)
☐ Coinbase Paymaster credits ($600 free — claim Day 1)
☐ Talent Protocol profile (Builder Rewards eligibility — claim Day 1)
☐ OpenAI API key (for openclaude provider)
☐ Groq API key (for fast disambig)
☐ Anthropic API key (Claude Haiku fallback)
☐ Discord channels created (you set up)
☐ Coinbase Smart Wallet on Base Sepolia (test wallet, fund with Sepolia ETH)
☐ Claude Code installed locally
☐ Codex CLI installed locally
```

---

## 13. Your 6-month commitment

You are signing up for:

- **16 weeks build** (4 stages of 4 weeks)
- **6 hours/day, 5 days/week** average
- **15-min daily standup**, 30-min Friday demo
- **Owning safety until forever** (Sherpa lives only as long as it's safe)
- **Being on-call for security incidents** (you carry the responsibility)

If you're not sure you can give this — say so before Day 1, not Day 30.

---

## 14. Read this last

You are not alone in this build. You have M2 and M3, both as friends and as competent engineers. **Trust them. Don't reach into their domains.** The whole point of the split is that you can focus 100% on safety + tools + core, while they handle the surface area you'd otherwise be drowning in.

If M2 ships a confirmation card you'd have built differently — let it be. They own UX. If M3 sets up a Postgres schema you'd have indexed differently — let it be. They own infra.

Your job is to make Sherpa **safe and correct**. Their job is to make it **usable and shipped**. All three jobs are equal in importance.

Ship safe. Ship right. Ship together.

---

_M1 pack v1 — April 30, 2026._  
_Print this. Tape it to your monitor. Read once a week._
