# Sherpa — Member 3 (M3) Complete Build Pack

## Infra / Identity / Memory / API — The Glue Engineer

**Member:** M3  
**Role:** Infrastructure, identity resolver, memory, API server, scheduler  
**CLI:** OpenCode (primary, low-cost local for high-volume infra) + Codex (review)  
**Worktree:** `worktrees/m3-week-{N}`  
**Branch pattern:** `feat/m3-week-{N}-{description}`

---

## 1. Who you are in this team

You are **the glue engineer**. Three things are uniquely yours:

1. **Identity layer** — every address resolution Sherpa does (Farcaster, Basenames, ENS, direct)
2. **Persistence + memory** — Postgres schemas, audit log, user memory, history snapshots
3. **API + scheduler** — REST endpoints, MCP server, cron jobs, watchers (price alerts, wallet monitors)

You enable both M1 and M2 to do their work. M1's tools call your identity resolver. M2's UI calls your API endpoints. Without you, neither can ship.

---

## 2. Your domain (what you own)

```
packages/
├── identity/      ← M3 ONLY. Farcaster + Basenames + ENS + direct address resolvers.
├── memory/        ← M3 ONLY. User preferences, history snapshots, audit log wrapper.
├── scheduler/     ← M3 ONLY. DCA, alerts, monitors (cron + watchers).
├── config/        ← M3 ONLY. Env validation, chain configs.
└── logger/        ← M3 ONLY. pino setup.

apps/
├── api/           ← M3 ONLY. REST endpoints + MCP server.
└── telegram/      ← M3 ONLY. Telegram bot (Stage 4).

scripts/
└── db/            ← M3 ONLY. Schemas, migrations, seed data.
```

**You do NOT touch:**

- `packages/safety/*` — that's M1
- `packages/tools/*` — that's M1
- `packages/core/*` — that's M1
- `packages/llm/*` — that's M1
- `packages/agentkit/*` — that's M1
- `apps/web/*` — that's M2
- `apps/miniapp/*` — that's M2
- `packages/ui/*` — that's M2

If you need M1's tools to do something differently, **ask in #sherpa-blockers**. Don't edit M1's code yourself.

---

## 3. Your contracts with M1 and M2

### Contract with M1 (Backend)

**You produce:** `ResolvedAddress` — every recipient address Sherpa uses comes from your resolver.

```typescript
// packages/identity/src/types.ts (you write this)
export type ResolvedAddress = {
  address: Address;
  source: 'farcaster' | 'basename' | 'ens' | 'direct';
  display: string;
  metadata?: {
    farcaster_fid?: number;
    farcaster_username?: string;
    basename?: string;
    ens_name?: string;
    has_activity?: boolean;
  };
};

export type ResolverError =
  | { type: 'not_found'; input: string }
  | { type: 'multiple_matches'; input: string; candidates: ResolvedAddress[] }
  | { type: 'invalid_format'; input: string }
  | { type: 'api_error'; input: string; provider: string; message: string };

export async function resolve(input: string): Promise<ResolvedAddress | ResolverError>;
```

M1's tools import and use `resolve()`. They never call Farcaster/ENS/Basenames directly.

**You produce:** Audit log wrapper.

```typescript
// packages/memory/src/audit.ts (you write this)
export async function createAuditLog(input: CreateAuditLogInput): Promise<number>;
export async function updateAuditLog(id: number, patch: Partial<AuditLogPatch>): Promise<void>;
export async function getUserHistorySnapshot(addr: Address): Promise<UserHistorySnapshot>;
```

M1 uses these for every tx (Ring 5). M1 never INSERTs to audit_log directly.

**You produce:** Rate limiter.

```typescript
// packages/safety/... wait, this is M1's domain
// Actually: packages/memory/src/ratelimit.ts (you write this)
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult>;
```

You build the primitive, M1 uses it in their parser endpoint logic.

### Contract with M2 (Frontend)

**You produce:** REST API endpoints at `apps/api`. M2 calls these via HTTP.

```
POST /api/parse           — parse user input (M1's parser, exposed via M3's HTTP)
POST /api/execute         — execute a plan (M1's executor, exposed)
GET  /api/balance/:addr   — balance snapshot (multicall)
GET  /api/history/:addr   — paginated history
GET  /api/portfolio/:addr — Stage 4 portfolio aggregation
POST /api/cron/hourly     — internal endpoint for cron-job.org webhook
POST /api/webhook/<src>   — external webhooks (e.g. Pyth price update)
```

You define request/response shapes. M2 consumes them. Backend logic comes from M1's packages — you wrap them in HTTP.

---

## 4. The maintainer prompt — load this every CLI session

Save as `docs/sherpa/MAINTAINER_PROMPT_M3.md`.

```markdown
# Sherpa — Maintainer Prompt for M3 (Infra/Identity/API)

You are working on **Sherpa**, the natural-language Base agent.
You are M3 — the infra/identity/API lead in a 3-person team.

## Read on every session

1. This file
2. The current week spec at docs/sherpa/specs/M3*WEEK*{N}.md
3. Last 3 commits to understand context

## Your domain (sole ownership)

- packages/identity/\* — address resolvers
- packages/memory/\* — user prefs, history, audit log wrapper
- packages/scheduler/\* — DCA, alerts, monitors
- packages/config/\* — env validation
- packages/logger/\* — pino setup
- apps/api/\* — REST + MCP server
- apps/telegram/\* — Telegram bot (Stage 4)
- scripts/db/\* — all migrations

## Hard rules (non-negotiable)

- TypeScript strict mode. No `any` without justification.
- All env vars accessed through packages/config/env.ts (zod-validated).
- All DB writes go through your wrapper functions, never raw SQL from outside packages/memory.
- Every API endpoint validates request body with zod.
- Every API endpoint returns typed responses (define types, export them).
- All migrations are idempotent (CREATE IF NOT EXISTS, etc.).
- Migration files are immutable once merged — new migrations only, never edit old ones.
- Caching layered: in-memory → Vercel KV → external API. Never skip in-memory.
- Rate limiter on every public API endpoint.
- All long-running operations have a soft deadline 10s before Vercel's 60s timeout.

## Pre-locked decisions

- Database: Supabase Postgres (free tier through Stage 1, Pro at Stage 2+).
- Cache: Vercel KV (free tier through Stage 2).
- Hosting: Vercel Hobby through Stage 1, Pro at Stage 2.
- RPC: Coinbase Cloud (Base) + Alchemy (Ethereum mainnet for ENS).
- Farcaster: Neynar API for Farcaster username resolution.
- Telegram bot: deferred to Stage 4. Don't scaffold apps/telegram in Stages 1-3.

## What you DO NOT touch

- packages/safety/_, packages/tools/_, packages/core/_, packages/llm/_ → M1's domain
- apps/web/_, apps/miniapp/_, packages/ui/\* → M2's domain

## When you need other domains' changes

- M1 needs to add a tool capability? Ask in #sherpa-blockers
- M2 needs a new API endpoint? Build it, then notify M2 with shape
- Adding a column to audit_log? Notify M1 in standup BEFORE migrating

## Patterns to follow

1. Idempotent UPSERT pattern for all event indexers: ON CONFLICT (key) DO UPDATE
2. REORG_LOOKBACK = 20 blocks for chain watcher
3. 50s soft deadline for cron jobs (60s Vercel timeout, 10s buffer)
4. Identity cache TTLs: Farcaster 7 days, Basenames 1 hour, ENS 1 hour, no cache for direct addresses
5. Sensitive env vars marked at add time in Vercel
6. All Postgres queries use parameterized statements (no string interpolation, EVER)

## Free-tier optimizations (build these in)

- In-memory LRU cache before hitting KV (cuts KV usage 60%)
- Multicall RPC reads (cuts RPC usage 5x)
- Cache identity 7 days, not 24h (cuts Neynar 80%)
- Use cron-job.org webhook for hourly tasks (Vercel Hobby has daily cron only)

## Forbidden in this codebase

- Raw SQL outside packages/memory (always go through wrappers)
- Direct fetch to external APIs from apps/api (use packages/\* clients)
- Hardcoded RPC URLs / API keys (use packages/config)
- Synchronous DB operations in tight loops (always batch)
- console.log in production paths (use pino logger)
- Migration edits to existing files (new migrations only)

## Communication style

- Concise, factual. Show schemas, sample queries, response shapes.
- When something's in progress, give an ETA, not "soon".
- Surface infra failures fast — they affect everyone.

## When to escalate

- DB schema change that affects audit_log → ALL THREE approve before merge
- New external API dependency → group decision in #sherpa-decisions
- Anything that requires Vercel/Supabase paid tier → group decision
- Performance regression > 200ms → flag immediately

## Failure modes to avoid

- Touching M1 or M2 domains
- Editing existing migrations (always new ones)
- Forgetting to validate request bodies
- Skipping the rate limiter on a "small" endpoint
- Caching without TTL (always set expiration)
```

---

## 5. Day-1 kickoff prompt for OpenCode

Open OpenCode in your worktree. Paste this exact prompt:

```
You are working on Sherpa Stage 1, Week 1 — as M3 (Infra/Identity/API lead).

Read these files in order before doing anything else:
1. docs/sherpa/MAINTAINER_PROMPT_M3.md (your constitution)
2. docs/sherpa/specs/M3_WEEK_1.md (this week's spec for M3)
3. docs/sherpa/SHERPA_PRD_v3_TEAM.md (full product context)
4. docs/sherpa/SHERPA_TEAM_PLAN.md (how the 3 of us coordinate)

After reading, do NOT write code yet.

Step 1: Confirm you understand:
- Your domain (identity, memory, scheduler, config, logger, api, telegram, db)
- Your contracts with M1 (ResolvedAddress, audit_log wrapper) and M2 (REST API)
- The hard rules (zod validation, idempotent migrations, layered caching)

Step 2: Ask me 3-5 clarifying questions about Week 1 M3 deliverables.

Step 3: Wait for my answers before proposing a Day 1 plan.

Do NOT make assumptions about what M1 and M2 are doing. Focus only on
your domain.
```

---

## 6. Your Stage 1 deliverables (4 weeks)

### Week 1 — Identity + Postgres schema + CI/CD (Days 1–5)

**Branch:** `feat/m3-week-1-foundation`

| Day | Deliverable                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Provision Supabase project (M1 created the team, you manage migrations). Write `0001_audit_log.sql` migration. Set up Vercel project (M1 created org, you manage deploys). |
| 2   | `packages/config/env.ts` with full zod schema. `packages/logger/index.ts` with pino setup. Mark sensitive env vars in Vercel.                                              |
| 3   | `packages/identity/src/farcaster.ts` (Neynar API), `basenames.ts` (Base mainnet onchain read), `ens.ts` (Ethereum mainnet onchain read), `address.ts` (direct validation). |
| 4   | `packages/identity/src/cache.ts` — in-memory LRU + Vercel KV fallback. `packages/identity/src/index.ts` — dispatcher routing input to correct resolver.                    |
| 5   | `apps/web/app/resolve/[input]/page.tsx` — UI is M2's, but you provide the page route stub. CI/CD pipeline (GitHub Actions): typecheck + lint + test on every PR.           |

**Definition of done Week 1:** Resolver returns correct address for `vitalik.eth`, `@vitalik`, `jesse.base.eth`, and direct 0x addresses. Postgres `audit_log` table exists. CI runs on every PR.

### Week 2 — API endpoints + audit log + rate limiter (Days 6–10)

**Branch:** `feat/m3-week-2-api`

| Day | Deliverable                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | `apps/web/app/api/parse/route.ts` — wraps M1's parser. Validates request, writes audit_log row pre-LLM, calls M1, updates audit_log post-LLM.                     |
| 7   | `packages/memory/src/audit.ts` — createAuditLog, updateAuditLog wrappers. Migration `0002_disambig_session.sql` if needed.                                        |
| 8   | `packages/memory/src/ratelimit.ts` — sliding-window rate limiter using KV sorted sets. 20/min per wallet, 100/min per IP.                                         |
| 9   | `packages/memory/src/llm_usage.ts` — cost tracking schema and writer. Migration `0003_llm_usage.sql`. M1 calls this from openclaude wrapper.                      |
| 10  | `apps/web/app/api/balance/[address]/route.ts` (multicall via viem). `apps/web/app/api/history/[address]/route.ts` (paginated read from audit_log). 70%+ coverage. |

**Coverage gate:** packages/identity 80%+, packages/memory 80%+, apps/web/api 70%+.

### Week 3 — User history snapshot + Sentry + Tenderly setup (Days 11–15)

**Branch:** `feat/m3-week-3-history`

| Day | Deliverable                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | `packages/memory/src/history.ts` — `getUserHistorySnapshot(addr)` returns 24h tx count, total volume, successful tx count. Used by M1's Ring 4 cap check. |
| 12  | Set up Sentry (Developer free plan). Wire to all three apps (apps/web, apps/api). Test error capture.                                                     |
| 13  | Set up Tenderly account (free tier). Get API key. Add to env vars. M1 will integrate the simulation in Stage 2 — you just provision.                      |
| 14  | `apps/web/app/api/execute/route.ts` — wraps M1's executor with audit log integration. Streams progress updates via Server-Sent Events.                    |
| 15  | E2E test: full SEND flow from POST /api/parse → POST /api/execute → audit_log final state.                                                                |

**Coverage gate:** all M3 packages at target.

### Week 4 — Stage 1 launch infra (Days 16–20)

**Branch:** `feat/m3-week-4-launch`

| Day | Deliverable                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------- |
| 16  | Limitless market list cache (5 min TTL) in KV. M1 uses for findMarket.                                                     |
| 17  | Coinbase Onramp endpoint stub: `POST /api/onramp/url` generates onramp URL + session. Polling endpoint for balance change. |
| 18  | Set up Plausible (self-hosted on Railway free tier or hosted $9/mo — group decision). Wire pageview tracking.              |
| 19  | Status page (uptime monitor, simple): `apps/web/app/status/page.tsx` showing API health, DB latency, RPC status.           |
| 20  | Stage 1 launch checklist: all sensitive env vars verified, Sentry capturing, audit_log working, CI green. Stage 1 ships.   |

**Coverage gate:** all M3 packages at target. Stage 1 launches end of Day 20.

---

## 7. Your masterpiece: the data layer

Your contribution to Sherpa's reliability is in the **invisible work**. The schema you design today is what 25,000 MAU lean on at scale.

### Schema overview (Stage 1 + 2 ready)

```sql
-- Migration 0001_audit_log.sql
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  surface         TEXT NOT NULL CHECK (surface IN ('web', 'miniapp', 'telegram', 'api')),
  raw_input       TEXT NOT NULL,
  parsed_intent   JSONB,
  plan            JSONB,
  executed_steps  JSONB,
  tx_hashes       TEXT[],
  status          TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'partial')),
  error_detail    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_created ON audit_log (user_address, created_at DESC);
CREATE INDEX idx_audit_log_status ON audit_log (status) WHERE status = 'pending';

-- Migration 0002_user_memory.sql
CREATE TABLE user_memory (
  id           BIGSERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  memory_type  TEXT NOT NULL,
  key          TEXT NOT NULL,
  value        JSONB NOT NULL,
  confidence   FLOAT DEFAULT 1.0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_address, key)
);

-- Migration 0003_llm_usage.sql
CREATE TABLE llm_usage (
  id BIGSERIAL PRIMARY KEY,
  user_address TEXT,
  task TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT,
  completion_tokens INT,
  cost_usd NUMERIC(10, 6),
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_created ON llm_usage (created_at DESC);
CREATE INDEX idx_llm_usage_user ON llm_usage (user_address, created_at DESC);

-- Migration 0004_scheduled_intents.sql (Stage 4 prep)
CREATE TABLE scheduled_intents (
  id              BIGSERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  intent_type     TEXT NOT NULL,
  params          JSONB NOT NULL,
  schedule        TEXT NOT NULL,
  condition       JSONB,
  next_run        TIMESTAMPTZ,
  last_run        TIMESTAMPTZ,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes are your friends

Every query in production must use an index. Profile slow queries early. Add indexes proactively.

---

## 8. The free-tier-first strategy (your job to enforce)

You're the cost gatekeeper. Every API call you allow eats free tier. Your job:

1. **Cache aggressively.** In-memory first, KV second, external API last.
2. **Cache TTLs:** Farcaster usernames 7 days, Basenames 1 hour, ENS 1 hour.
3. **Multicall everything.** 1 RPC call, not 5.
4. **Daily Vercel cron + cron-job.org for hourly.** Don't pay for Vercel Pro until forced.
5. **Hard caps in code.** Each external API has a daily cap; fail loud past it.

```typescript
// packages/memory/src/spend-cap.ts
const DAILY_API_CAPS = {
  tenderly_sims: 500,
  neynar_calls: 4000,
  paymaster_sponsored: 200,
  moralis_cu: 30000,
};

export async function checkApiCap(api: keyof typeof DAILY_API_CAPS): Promise<boolean> {
  const usage = await getDailyApiUsage(api);
  if (usage > DAILY_API_CAPS[api]) {
    await alertSlack(`API cap hit for ${api}: ${usage}/${DAILY_API_CAPS[api]}`);
    return false;
  }
  return true;
}
```

If Sherpa hits a paid tier before 500 users, that's a failure of YOUR optimization. Ship cheap.

---

## 9. Your daily rhythm

```
09:30 IST — Standup (15 min)
  Your update format:
    Yesterday: [commits + any cost/perf metrics]
    Today: [3 max]
    Blockers: [or none]
    Cross-domain asks: ["M1: Limitless adapter is hitting Neynar 50x more than expected"]
                      ["M2: /api/balance response shape is being changed"]

10:00 IST — Coding starts
  Open tmux session "m3":
    Pane 0: OpenCode in worktrees/m3-week-{N}
    Pane 1: bash for git/test runs
    Pane 2: psql connected to Supabase (live query terminal)
    Pane 3: Codex (review your OpenCode PR)

13:00 — break

14:00 — coding continues

17:30 — End of day:
  - Commit & push
  - Open PR if feature complete
  - Review M1 or M2's PR
  - Check daily costs (LLM spend, API usage) — flag if anomalous
  - Write devlog entry: docs/sherpa/devlog/YYYY-MM-DD-m3.md

18:00+ — async (no required time)
```

---

## 10. PR review workflow

When you open a PR, post in `#sherpa-prs`:

```
🟢 M3 PR ready: feat/m3-week-1-foundation
- Touches: packages/identity, packages/memory, scripts/db
- Migration: yes (0001_audit_log.sql) — see migration plan
- Tests added: yes (85% coverage)
- Cross-domain impact: M1 will need to use createAuditLog wrapper from Day 6
- Review request: M2 (since it's M2's turn)
```

When reviewing M1's or M2's PR, run Codex with this prompt:

```
Review this PR for Sherpa. I'm M3 (infra/identity/API lead).
The PR is from M1 (backend) or M2 (frontend).
Look for:
- Direct DB queries bypassing my packages/memory wrappers
- Direct fetches to external APIs without caching
- Missing rate limit on new endpoints
- Hardcoded URLs/keys that should be in packages/config
- Synchronous loops that should be batched
- Missing zod validation on inputs
Don't review business logic — that's M1's call. Focus on infra hygiene.
```

---

## 11. Failure modes to avoid

These cost the most time if you slip:

1. **Touching M1 or M2's domain** — even "just to fix this query." Always ask.
2. **Editing existing migrations** — never. Always new migration files.
3. **Skipping the rate limiter** — every public endpoint, no exceptions.
4. **Forgetting zod validation** — every API endpoint validates input.
5. **Caching without TTL** — every cache write has expiration.
6. **Hardcoded URLs/keys** — always through `packages/config`.
7. **Free-tier blowout** — if you push to a paid tier without group approval, that's a problem.
8. **Self-merging your own PR** — wait for M1 or M2.

---

## 12. Tools & accounts you need on Day 1

```
☐ GitHub access (M1 invites you)
☐ Vercel team membership (M1 invites you, you manage deploys)
☐ Supabase team membership (M1 created project, you own migrations)
☐ Coinbase Cloud account (M1 sets up org, you manage RPC keys)
☐ Alchemy free tier (you create + own ETH mainnet RPC for ENS)
☐ Neynar account + API key (free tier)
☐ Tenderly account (free tier, Stage 2 prep)
☐ Sentry account (Developer free plan)
☐ cron-job.org account (free, for hourly cron)
☐ Plausible account or self-hosted (Stage 4 decision)
☐ Pushover keys (Stage 4)
☐ Telegram BotFather token (Stage 4)
☐ OpenCode (or Codex) installed
☐ Coinbase Smart Wallet on Base Sepolia (test wallet)
☐ Discord access to Sherpa channels
☐ psql or pgcli installed locally
☐ Local pnpm + node 22 + bun
```

---

## 13. Your equity and accountability

Per team agreement (Option B):

- M1: 50%
- M2: 25%
- M3 (you): 25%

You earn this by:

- Owning Sherpa's reliability + cost (free tier first, scale only when forced)
- Designing the data layer 25k MAU can run on
- Catching M1's safety bypasses before users do (you see every audit_log row)
- Building the API contract M2 trusts

If you slip on infra (DB outages, broken cron, runaway spend) — Sherpa is unreliable, and that kills user trust faster than any UX flaw. Own this.

---

## 14. Read this last

Your work is invisible until it breaks. Every API endpoint that responds in 80ms, every audit log that captures truth, every migration that runs without downtime — none of it gets a Twitter post. But all of it is what makes Sherpa real.

M1 makes Sherpa correct. M2 makes Sherpa felt. **You make Sherpa reliable.**

Trust M1's safety work. Trust M2's UX choices. Spend your full energy on:

- Schemas that scale (Stage 1 designs that hold at 25k MAU)
- Caches that hit (90%+ hit rate is your bar)
- Migrations that don't break production
- Free tier discipline (every dollar saved is one not begged for)

Ship reliable. Ship cheap. Ship together.

---

_M3 pack v1 — April 30, 2026._  
_Your work is what makes the work of others possible._
