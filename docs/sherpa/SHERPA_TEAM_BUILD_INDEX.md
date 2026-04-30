# Sherpa — Team Build Pack Index

**Date:** April 30, 2026  
**Team:** 3 friends (you + 2)  
**Strategy:** Domain split, mixed CLIs, 16 weeks parallel  
**Equity:** 50/25/25 (M1/M2/M3)

---

## What's in this pack

You now have **3 separate complete packs** — one per member. Each pack is self-contained: a member only needs their pack + 1–2 shared docs. No cross-reading required.

### Per-member packs (the new files)

| File                  | Reader               | Contains                                                                            |
| --------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| `M1_BACKEND_PACK.md`  | M1 (Lead — Gnanam)   | Domain, contracts, maintainer prompt, Day-1 kickoff, all 4 weeks of M1 deliverables |
| `M2_FRONTEND_PACK.md` | M2 (Frontend friend) | Same structure, M2 specific                                                         |
| `M3_INFRA_PACK.md`    | M3 (Infra friend)    | Same structure, M3 specific                                                         |

### Shared docs (everyone reads these)

| File                          | Reader          | Why                                                                  |
| ----------------------------- | --------------- | -------------------------------------------------------------------- |
| `SHERPA_PRD_v3.md`            | All 3           | Product spec — what we're building                                   |
| `SHERPA_TEAM_PLAN.md`         | All 3           | How the 3 of us coordinate (rhythm, PR reviews, conflict resolution) |
| `SHERPA_FREE_TIER_GUIDE.md`   | All 3 (esp. M3) | $0/mo strategy through 500 users                                     |
| `SHERPA_COST_MODEL.md`        | All 3           | Full cost breakdown by phase                                         |
| `SHERPA_RUNTIME_API_COSTS.md` | All 3 (esp. M3) | API usage details                                                    |

### Reference docs (older, can ignore once team packs are live)

These were generated assuming solo build — superseded by the per-member packs:

- `MAINTAINER_PROMPT.md` (solo version, replaced by per-member maintainer prompts inside each pack)
- `SHERPA_WEEK_1-4_SPEC.md` (solo specs, replaced by per-member week deliverables inside each pack)
- `STAGE_1_KICKOFF_README.md` (solo kickoff, replaced by per-member Day-1 kickoff prompts)
- `STAGE_1_TASK_SPLIT.md` (solo CC vs Codex split, irrelevant for team)
- `CLARIFY_QUESTIONS_WEEK_1.md` (solo clarification questions, each member generates their own)

---

## How to deploy this pack to your team

### Step 1 — You (M1) do the setup work (Day 0, ~2 hours)

```bash
# Create the repo (private to start)
gh repo create sherpa --private --confirm

# Clone and set up structure
cd ~/dev
git clone https://github.com/<your-org>/sherpa
cd sherpa
mkdir -p docs/sherpa/specs docs/sherpa/devlog docs/sherpa/decisions docs/sherpa/retrospectives

# Copy the team packs
cp ~/Downloads/M1_BACKEND_PACK.md docs/sherpa/team/
cp ~/Downloads/M2_FRONTEND_PACK.md docs/sherpa/team/
cp ~/Downloads/M3_INFRA_PACK.md docs/sherpa/team/

# Copy the shared docs
cp ~/Downloads/SHERPA_PRD_v3.md docs/sherpa/
cp ~/Downloads/SHERPA_TEAM_PLAN.md docs/sherpa/
cp ~/Downloads/SHERPA_FREE_TIER_GUIDE.md docs/sherpa/
cp ~/Downloads/SHERPA_COST_MODEL.md docs/sherpa/
cp ~/Downloads/SHERPA_RUNTIME_API_COSTS.md docs/sherpa/

# Extract per-member maintainer prompts (these are inside each pack)
# Each member will copy theirs to MAINTAINER_PROMPT_M{N}.md

# Set up branch protection
gh api repos/<your-org>/sherpa/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_status_checks[contexts][]='check'

# Add team members
gh api repos/<your-org>/sherpa/collaborators/<m2-username> --method PUT --field permission=push
gh api repos/<your-org>/sherpa/collaborators/<m3-username> --method PUT --field permission=push

# Create initial commit
git add docs/
git commit -m "docs: initial team pack and PRD for Sherpa Stage 1"
git push -u origin main
```

### Step 2 — Send each friend their pack (Day 0)

Send M2:

```
Hey [M2 name],

Welcome to Sherpa. Here's everything you need:

1. Your pack: docs/sherpa/team/M2_FRONTEND_PACK.md
   This contains:
   - What you own (apps/web, apps/miniapp, packages/ui)
   - Your contracts with M1 and M3
   - Your maintainer prompt (paste into Cursor every session)
   - Day-1 kickoff prompt
   - 4 weeks of deliverables

2. Shared docs (read once):
   - docs/sherpa/SHERPA_PRD_v3.md (the full product)
   - docs/sherpa/SHERPA_TEAM_PLAN.md (how we coordinate)
   - docs/sherpa/SHERPA_FREE_TIER_GUIDE.md (cost discipline)

3. Tomorrow 09:30 IST — first standup. Come having read your pack.

I've added you to:
- GitHub repo (push access)
- Vercel team
- Supabase team
- Discord

Equity: 25%. We'll sign the formal doc this week.

Ready?
```

Send M3 the same with M3-specific pack reference.

### Step 3 — All three set up environments (Day 0 evening)

Each member:

```bash
# Clone
git clone https://github.com/<your-org>/sherpa
cd sherpa

# Set up worktree for Week 1
git worktree add worktrees/m{N}-week-1 -b feat/m{N}-week-1-foundation

# Read your pack
less docs/sherpa/team/M{N}_<DOMAIN>_PACK.md

# Install your CLI of choice
# M1: claude (Claude Code) and codex
# M2: cursor (or claude) and claude
# M3: opencode (or codex) and codex
```

### Step 4 — Day 1 kickoff (the real work begins)

Each member opens their CLI in their worktree and pastes the **Day-1 kickoff prompt** from their pack.

Each CLI will:

1. Read the maintainer prompt
2. Read the week spec
3. Confirm understanding
4. Ask 3-5 clarifying questions
5. Wait for answers before coding

Each member answers their CLI's questions, posts a Day-1 plan in `#sherpa-standup`, and starts.

---

## Day-1 timeline (parallel work begins)

```
09:30 IST — First standup (Discord voice/video)
  - Each member shares Day-1 plan from their CLI
  - M1 answers cross-domain questions
  - 15-min hard timebox

09:45 IST — Coding begins, all three in parallel
  - M1 in tmux pane with Claude Code
  - M2 in Cursor
  - M3 in OpenCode
  - All on free tier, all on Sepolia, all on $0/mo

13:00 — Lunch

14:00 — Coding continues

17:30 — End of day
  - Each member commits + pushes their branch
  - Each opens PR if Day 1 complete
  - PR review: cross-domain (M1 reviews M2 or M3, M2 reviews M1 or M3, M3 reviews M1 or M2)
  - Devlog entries posted in #sherpa-devlog

Tomorrow 09:30 IST — Day 2 standup. Repeat.
```

---

## Per-member commit pattern

Every member commits to their own branch:

- M1: `feat/m1-week-{N}-{description}`
- M2: `feat/m2-week-{N}-{description}`
- M3: `feat/m3-week-{N}-{description}`

Commit messages prefix:

- M1: `feat(m1-week-1): scaffold turborepo` or `fix(m1-week-1): allowlist edge case`
- M2: `feat(m2-week-1): connect button + landing page`
- M3: `feat(m3-week-1): identity resolver + audit_log migration`

This keeps `git log` readable and surface clear ownership.

---

## When the packs need updating

The packs are written for Stage 1 (Weeks 1–4). At end of Week 4, generate Stage 2 packs:

- `M1_STAGE_2_PACK.md` — Aerodrome, Uniswap, Morpho, Aave, Lido, Across adapters
- `M2_STAGE_2_PACK.md` — DeFi confirmation cards, slippage UI, LP dashboard
- `M3_STAGE_2_PACK.md` — Tenderly integration, portfolio API, scheduler engine

Same pattern repeats for Stages 3 and 4.

---

## What's complete vs what's pending

### Complete and shippable today

- Per-member Day-1 kickoff prompts
- Per-member maintainer prompts (constitutional)
- Per-member Stage 1 (Weeks 1–4) deliverables
- Cross-member type contracts
- Equity structure (Option B, 50/25/25)
- Daily rhythm + PR review workflow
- Free-tier optimization strategy

### Pending (generate when needed)

- Stage 2, 3, 4 per-member packs (generate at end of each previous stage)
- Per-member retrospective templates (generate end of Stage 1)
- Equity legal doc (need a lawyer or template — not my domain)
- Open source decision (group decision Day 1 standup)
- Domain registration (sherpa.xyz when budget allows)

---

## Quick reference table

If you're [member] and you need [thing], read [file]:

| Who | What they need              | Where to find it            |
| --- | --------------------------- | --------------------------- |
| M1  | What I'm building this week | `M1_BACKEND_PACK.md` §6     |
| M1  | My maintainer prompt        | `M1_BACKEND_PACK.md` §4     |
| M1  | Day-1 kickoff prompt        | `M1_BACKEND_PACK.md` §5     |
| M2  | What I'm building this week | `M2_FRONTEND_PACK.md` §6    |
| M2  | My maintainer prompt        | `M2_FRONTEND_PACK.md` §4    |
| M2  | Day-1 kickoff prompt        | `M2_FRONTEND_PACK.md` §5    |
| M3  | What I'm building this week | `M3_INFRA_PACK.md` §6       |
| M3  | My maintainer prompt        | `M3_INFRA_PACK.md` §4       |
| M3  | Day-1 kickoff prompt        | `M3_INFRA_PACK.md` §5       |
| All | Product spec                | `SHERPA_PRD_v3.md`          |
| All | Team coordination           | `SHERPA_TEAM_PLAN.md`       |
| All | Free tier strategy          | `SHERPA_FREE_TIER_GUIDE.md` |
| All | Cost projections            | `SHERPA_COST_MODEL.md`      |

---

## The single most important rule

> **Each member reads ONLY their pack + the 4 shared docs. They do NOT read the other members' packs.**

This is intentional. It enforces domain separation: if M2 doesn't know what M1 is doing day-by-day, M2 can't accidentally do M1's work. The cross-domain coordination happens via:

1. The type contracts (defined in each pack)
2. The daily standup (15 min, public)
3. The PR reviews (one per day)

That's enough coordination. More creates noise.

---

## You're ready

You have everything you need:

- 3 self-contained per-member packs
- Clean domain split (zero file overlap)
- Maintainer prompts that work with mixed CLIs
- 4-week Stage 1 plan with daily deliverables per member
- Free-tier strategy ($0/mo through Stage 1)
- Equity structure that reflects authority + responsibility

Send the packs. Schedule the standup. Ship Sherpa.

---

_Team build pack index v1 — April 30, 2026._
