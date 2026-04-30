# Sherpa — PRD v3: The Top-Level Base Agent

**Last updated:** April 29, 2026  
**Status:** Ready to build  
**Owner:** Gnanam (@0x_art)  
**Build window:** 16 weeks (4 staged releases)  
**Live target:** sherpa.xyz  
**Vision:** The single conversational interface for everything on Base.

---

## 0. Why v3 exists: The Base ecosystem has outgrown v2's scope

When v2 was written, Base was a promising L2. As of April 2026, Base is the **largest L2 by daily active users**, processing 7–10 million transactions daily, with ~$10 billion TVL and 46.6% of all L2 DeFi TVL. The ecosystem is no longer 3 intents wide — it spans:

- **DeFi**: Aerodrome ($600M+ TVL), Morpho ($2B+ TVL), Aave, Uniswap v4, Seamless Protocol
- **SocialFi**: Farcaster, Zora Coins (content → token), Clanker (AI-deployed tokens, now Farcaster-native), Base App (110M Coinbase users onboarded)
- **Prediction Markets**: Limitless Exchange ($550M+ volume), PolyForge
- **NFTs**: Zora Coins model, OpenSea on Base, Base Colors
- **AI Infrastructure**: Virtuals Protocol, DeFAI agents, Coinbase AgentKit (50+ action providers), Agentic Wallets with x402 machine-to-machine payments
- **Identity**: Basenames (.base.eth), Farcaster identity, ERC-4337 Smart Wallets, World ID
- **Gas Abstraction**: Coinbase Paymaster, Smart Wallets, TEE-based Agentic Wallets

Sherpa v3 is not a wrapper over 3 protocols. It is the **natural-language operating system for this entire stack** — built as a top-level agent with a modular intent engine, pluggable protocol adapters, a persistent memory layer, and a seven-ring safety system hardened for real financial operations.

---

## 1. One-line pitch

**Sherpa is the Base OS. Type anything. Sherpa does it.**

---

## 2. The problem (updated)

Base has shipped the most complete onchain consumer stack in crypto:

- Smart Wallets remove seed phrases
- Paymaster removes gas
- Basenames remove addresses
- Farcaster removes platform lock-in
- AgentKit gives AI agents wallets
- x402 lets agents pay each other
- Zora Coins let content become capital
- Aerodrome lets anyone become a liquidity provider
- Morpho lets anyone lend at optimized rates

**The problem is not primitives. The problem is surface.** A new user with a Coinbase account and $50 still faces 12 different apps, 8 different approval flows, and zero guidance on what to do first.

Sherpa solves the surface problem. One chat interface. Every Base primitive accessible by natural language. No tabs. No gas anxiety. No "which contract do I approve?"

---

## 3. Target users (expanded)

### Primary: The Farcaster-native crypto newcomer

- Has Farcaster, has heard of Base
- $50–$500 in crypto
- Mobile-first, chat-first
- Wants specific outcomes: "bet on this", "buy that creator coin", "earn yield on my USDC"
- Does NOT want to learn DeFi — wants results

### Secondary: The Base power user who wants speed

- Knows the protocols, hates clicking through UIs
- Wants to DCA, manage LP positions, monitor wallet activity via chat
- Values speed over hand-holding
- Will use CLI-style terse commands

### Tertiary: The developer / agent builder

- Wants Sherpa as a composable agent layer they can hook into
- Sherpa exposes a headless API and MCP server
- Can embed sherpa-core into their own products

### Anti-persona (NOT the target)

- Users wanting financial advice — Sherpa is a tool, not an advisor
- Institutional trading desks — wrong surface
- Existing dApp power users who prefer UI — they have shortcuts

---

## 4. Intent taxonomy (v3 — full Base surface)

V3 ships intents in 4 stages across 16 weeks. Each stage is production-grade before the next begins.

### Stage 1 intents (Weeks 1–4): Foundation

The v2 core, hardened.

| Intent  | Example                        | Protocol                     |
| ------- | ------------------------------ | ---------------------------- |
| SEND    | "send 10 USDC to vitalik.eth"  | ERC-20 transfer              |
| BUY     | "buy $50 of ETH"               | Uniswap v4 + Coinbase Onramp |
| BET     | "bet $5 BTC hits 120k by July" | PolyForge / Limitless        |
| BALANCE | "what's my balance?"           | viem multicall               |
| HISTORY | "show my last 10 txs"          | Basescan API + audit log     |

### Stage 2 intents (Weeks 5–8): DeFi core

| Intent | Example                               | Protocol                      |
| ------ | ------------------------------------- | ----------------------------- |
| SWAP   | "swap 100 USDC for AERO"              | Uniswap v4 / Aerodrome        |
| LEND   | "deposit 500 USDC to earn yield"      | Morpho / Aave / Seamless      |
| BORROW | "borrow 200 USDC against my ETH"      | Morpho / Aave                 |
| STAKE  | "stake my ETH"                        | Lido (stETH on Base)          |
| YIELD  | "find best USDC yield right now"      | Morpho aggregator + rates API |
| LP     | "add liquidity to ETH/USDC pool"      | Aerodrome / Uniswap v4        |
| BRIDGE | "bridge 0.1 ETH from mainnet to Base" | Across Protocol / Base Bridge |

### Stage 3 intents (Weeks 9–12): SocialFi + NFT

| Intent       | Example                                          | Protocol                          |
| ------------ | ------------------------------------------------ | --------------------------------- |
| MINT         | "mint the latest Zora drop"                      | Zora v4 Coins                     |
| BUY_COIN     | "buy @artist's creator coin on Zora"             | Zora Coins + Uniswap LP           |
| CAST         | "post to Farcaster: [message]"                   | Farcaster Hub API                 |
| TIP          | "tip 1 USDC to @friend on Farcaster"             | USDC transfer + Farcaster resolve |
| LAUNCH_TOKEN | "launch a token called $SHERPA for my community" | Clanker via Farcaster API         |
| FOLLOW       | "follow @vitalik on Farcaster"                   | Farcaster Hub API                 |
| PROFILE      | "set my Basename to gnanam.base.eth"             | Basenames registry                |

### Stage 4 intents (Weeks 13–16): Power + Automation

| Intent    | Example                                     | Protocol                           |
| --------- | ------------------------------------------- | ---------------------------------- |
| DCA       | "buy $20 of ETH every Monday"               | Sherpa scheduler + Uniswap         |
| ALERT     | "alert me when ETH drops below $3000"       | Sherpa watcher + Pushover/Telegram |
| PORTFOLIO | "show my full portfolio with PnL"           | Zapper API / Moralis + onchain     |
| MONITOR   | "watch wallet 0x... and alert me on any tx" | Sherpa chain watcher               |
| REVOKE    | "revoke all approvals for Uniswap"          | Token approval scanner + revoke    |
| EXPLAIN   | "explain what this contract does: 0x..."    | LLM + ABI decoder + Basescan       |
| SIMULATE  | "simulate this tx before I sign"            | Tenderly simulation API            |
| BATCH     | "send 5 USDC each to alice, bob, carol"     | ERC-4337 batch tx via Smart Wallet |

---

## 5. NOT in scope (ever, or clearly deferred)

| Feature                  | Status | Reason                                      |
| ------------------------ | ------ | ------------------------------------------- |
| Custodial funds          | Never  | Non-negotiable. Sherpa never holds assets.  |
| Financial advice         | Never  | Legal/regulatory. Sherpa is a tool.         |
| Leverage trading (perps) | v4+    | High blast radius, margin mechanics complex |
| Cross-chain beyond Base  | v4+    | Focus Base ecosystem first                  |
| Voice interface          | v4+    | Whisper integration deferred                |
| Governance voting        | v4+    | Niche, low impact                           |
| Multi-language           | v2+    | English only at v3 launch                   |
| Mobile native app        | v4+    | Web + Mini App first                        |

---

## 6. Architecture (v3)

### 6.1 High-level system diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          USER SURFACES                                   │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Web App     │  │ Farcaster   │  │  Telegram   │  │ API /         │  │
│  │  sherpa.xyz  │  │  Mini App   │  │  @SherpaBase│  │ MCP Server    │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘  │
│         └─────────────────┴────────────────┴──────────────────┘          │
│                                    │                                     │
│                                    ▼                                     │
│                         ┌──────────────────┐                            │
│                         │  sherpa-core pkg │                            │
│                         └────────┬─────────┘                            │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    AGENT BRAIN (5-STEP LOOP)                             │
│  1. PARSE      → openclaude (GPT-4o-mini, JSON structured output)        │
│  2. DISAMBIG   → openclaude (Groq llama-3.3-70b, fast conversational)   │
│  3. PLAN       → openclaude (GPT-4o, deep reasoning)                    │
│  4. EXECUTE    → tool calls to protocol adapters                         │
│  5. VERIFY     → onchain state check + confirmation to user              │
│                                                                          │
│  MEMORY        → Postgres (user prefs, history) + Vercel KV (session)   │
│  SCHEDULER     → Vercel Cron + pg_cron (recurring intents)               │
│  WATCHER       → WebSocket poller (price alerts, wallet monitors)        │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     PROTOCOL ADAPTER LAYER                               │
│                                                                          │
│  DeFi                  SocialFi               Infra                     │
│  ──────────────        ──────────────         ──────────────            │
│  Aerodrome DEX         Farcaster Hub          Smart Wallet (ERC-4337)   │
│  Uniswap v4            Zora Coins             Coinbase Paymaster        │
│  Morpho                Clanker                AgentKit (50+ actions)   │
│  Aave                  Basenames              x402 payments             │
│  Lido                  Zora NFT               Tenderly Simulate        │
│  Across Bridge         OpenSea Base           Basescan API             │
│  Limitless Mkt         Farcaster Frames       Coinbase Onramp          │
│  PolyForge             XMTP messaging         Moralis/Zapper portfolio │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                      │
│  Supabase Postgres   Vercel KV (sessions)   Vercel Cron (scheduler)      │
│  Redis (rate limits)  S3/R2 (audit exports)  Pusher (real-time alerts)   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Repo structure (Turborepo monorepo)

```
sherpa/
├── apps/
│   ├── web/              # Next.js 15 — sherpa.xyz
│   ├── miniapp/          # Farcaster Mini App (Frames v2 SDK)
│   ├── telegram/         # Telegram bot (grammY)
│   └── api/              # Headless REST + MCP server
├── packages/
│   ├── core/             # Agent loop: parse → disambig → plan → execute → verify
│   ├── tools/            # Protocol adapters (one file per protocol)
│   │   ├── uniswap.ts
│   │   ├── aerodrome.ts
│   │   ├── morpho.ts
│   │   ├── aave.ts
│   │   ├── lido.ts
│   │   ├── zora.ts
│   │   ├── farcaster.ts
│   │   ├── clanker.ts
│   │   ├── limitless.ts
│   │   ├── polyforge.ts
│   │   ├── across.ts
│   │   ├── basenames.ts
│   │   └── coinbase-onramp.ts
│   ├── safety/           # 7-ring safety system
│   ├── identity/         # Resolver: farcaster / basename / ens / address
│   ├── memory/           # User preferences, history, learned patterns
│   ├── scheduler/        # Recurring intent engine (DCA, alerts, monitors)
│   ├── llm/              # openclaude wrapper with retry/fallback/cost tracking
│   ├── ui/               # Shared React components (confirmation cards, etc.)
│   └── agentkit/         # Coinbase AgentKit adapter (50+ native actions)
├── contracts/            # None for v3 — use existing audited contracts only
└── scripts/
    └── db/migrations/
```

### 6.3 Tech stack

| Layer         | Choice                                 | Reason                                |
| ------------- | -------------------------------------- | ------------------------------------- |
| Runtime       | Node 22 + Bun                          | Bun for speed, Node for Vercel compat |
| Framework     | Next.js 15 (web), Frames v2 (Mini App) | Match PolyForge stack                 |
| Language      | TypeScript strict                      | Consistency + safety                  |
| Wallet        | Coinbase Smart Wallet + RainbowKit     | ERC-4337, gasless                     |
| Gas           | Coinbase Paymaster                     | Already configured                    |
| Onchain reads | viem + wagmi v2                        | Best-in-class                         |
| LLM routing   | openclaude                             | Multi-provider, your own infra        |
| AgentKit      | @coinbase/agentkit                     | 50+ pre-built onchain actions         |
| Database      | Supabase Postgres                      | WAL, row-level security               |
| Sessions      | Vercel KV                              | Fast session store                    |
| Scheduler     | Vercel Cron + pg_cron                  | Recurring intents                     |
| Real-time     | Pusher / SSE                           | Price alerts, wallet monitors         |
| Portfolio     | Moralis / Zapper API                   | Cross-protocol balance aggregation    |
| Simulation    | Tenderly API                           | Pre-flight tx simulation              |
| Hosting       | Vercel                                 | CI/CD, edge functions                 |
| Telegram      | grammY                                 | Best DX for Node                      |
| MCP           | @modelcontextprotocol/server           | Headless agent API                    |

---

## 7. Agent brain (v3 — extended)

### 7.1 Intent taxonomy and routing

V3 handles 30+ intents across 8 categories. Two-tier classification:

**Tier 1 (fast):** GPT-4o-mini with few-shot JSON output — classifies category + extracts params in <200ms.

**Tier 2 (deep):** GPT-4o for complex multi-step intents (LP management, DCA setup, portfolio analysis) where reasoning quality matters more than speed.

```typescript
type IntentCategory =
  | 'TRANSFER' // SEND, BATCH
  | 'EXCHANGE' // BUY, SWAP, BRIDGE
  | 'DEFI' // LEND, BORROW, STAKE, YIELD, LP
  | 'SOCIAL' // CAST, TIP, FOLLOW, LAUNCH_TOKEN, BUY_COIN, MINT
  | 'PREDICT' // BET
  | 'AUTOMATION' // DCA, ALERT, MONITOR
  | 'INFO' // BALANCE, HISTORY, PORTFOLIO, EXPLAIN, SIMULATE
  | 'ADMIN'; // REVOKE, PROFILE

type ParsedIntent = {
  category: IntentCategory;
  intent: string;
  confidence: number; // 0–1
  params: Record<string, any>; // extracted parameters
  ambiguities: string[]; // missing fields requiring clarification
  risk_level: 'low' | 'medium' | 'high';
};
```

### 7.2 Memory layer (new in v3)

Sherpa v3 introduces persistent user memory. This separates a one-shot chat from a genuine agent.

```sql
CREATE TABLE user_memory (
  id           BIGSERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  memory_type  TEXT NOT NULL,   -- 'preference' | 'learned' | 'explicit'
  key          TEXT NOT NULL,   -- e.g. 'preferred_dex', 'default_slippage'
  value        JSONB NOT NULL,
  confidence   FLOAT DEFAULT 1.0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_address, key)
);
```

Memory informs intent parsing only — never triggers automatic transactions. Examples:

- "send the usual amount" → looks up last SEND amount to this recipient
- Preferred DEX learned from usage history (Aerodrome vs Uniswap)
- Farcaster username cached after first resolution
- Slippage tolerance stored from user settings
- Risk tolerance (conservative / standard / aggressive) affects YIELD suggestions

User can view and clear all memory at `/memory`.

### 7.3 Scheduler (new in v3)

Recurring intent engine for DCA, alerts, and monitors.

```sql
CREATE TABLE scheduled_intents (
  id              BIGSERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  intent_type     TEXT NOT NULL,    -- 'DCA' | 'ALERT' | 'MONITOR'
  params          JSONB NOT NULL,
  schedule        TEXT NOT NULL,    -- cron expression OR 'on_condition'
  condition       JSONB,            -- { type: 'price_below', asset: 'ETH', value: 3000 }
  next_run        TIMESTAMPTZ,
  last_run        TIMESTAMPTZ,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

DCA: "buy $20 ETH every Monday 9am UTC" → cron `0 9 * * 1`, executes Uniswap swap, records in audit_log.

Alert: "alert me when ETH drops below $3000" → stores condition, watcher polls Pyth feed every 60s, notifies via Pushover or Telegram.

Monitor: "watch 0x... and alert on any tx > $1000" → subscribes to getLogs, filters by amount.

### 7.4 Pre-flight simulation (new in v3)

Before any DeFi operation above $100 in value, Sherpa runs a Tenderly simulation. If simulation shows a revert, Sherpa explains why and aborts BEFORE the user is asked to sign. This prevents failed-tx UX disasters and wasted gas.

### 7.5 The full execution loop

```
User input
    │
    ▼
[PARSE] → confidence < 0.6? → "I didn't understand. Try: [3 examples]"
    │
    ▼ confidence ≥ 0.6
[MEMORY LOOKUP] → enrich params with known user prefs
    │
    ▼
[DISAMBIGUATE] → ambiguities? → ask 1 follow-up (max 2 rounds)
    │
    ▼ all params resolved
[PLAN] → generate step-by-step execution plan
    │
    ▼
[SAFETY RINGS 1–5] → any ring triggered? → reject or modify
    │
    ▼
[RING 6: SIMULATE] → tx value > $100? → Tenderly simulation
    │
    ▼
[RING 7: ANOMALY] → anomaly detected? → warn / require explicit confirm
    │
    ▼ all rings passed
[CONFIRM] → show confirmation card → user taps Proceed
    │
    ▼
[EXECUTE] → sequential tool calls, rollback on partial failure
    │
    ▼
[VERIFY] → query onchain state, confirm intent achieved
    │
    ▼
[LOG + MEMORY UPDATE] → audit_log + update user memory if relevant
    │
    ▼
[RESPOND] → "✅ Done. [tx link] [what changed]"
```

---

## 8. Safety layer v3 (7 rings)

V2 had 5 rings. V3 adds 2 more given the expanded attack surface.

### Ring 1: Intent allowlist

Only intents in the v3 taxonomy are executed. Anything outside is rejected. Fuzzy matches escalate to disambiguation, not silent execution.

### Ring 2: Contract allowlist

Hard-coded allowlist per stage. New protocols added only after review. Allowlist is versioned and auditable.

```typescript
const ALLOWED_CONTRACTS = {
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  uniswap_v4_router: '0x...',
  aerodrome_router: '0x...',
  morpho_blue: '0x...',
  aave_pool: '0x...',
  lido_base: '0x...',
  across_spokepool: '0x...',
  zora_coins_factory: '0x...',
  basenames_registry: '0x...',
  limitless_exchange: '0x...',
  polyforge_factory: '0xCa62F55c199347aFDB98A6f0199cC493b1496222',
};
```

Any tx targeting a contract NOT in this list is rejected, even if the LLM generates a valid-looking plan.

### Ring 3: Address verification

LLM-generated addresses are NEVER used directly. All recipients resolved via authoritative APIs only: Basenames registry, Farcaster Hub, ENS, or direct 0x with checksum + activity sanity check.

### Ring 4: Amount caps

| Period                 | Cap    | Override                                |
| ---------------------- | ------ | --------------------------------------- |
| Per tx (default)       | $500   | User can raise after 10+ successful txs |
| Per day                | $2,000 | Adjustable in settings                  |
| New user (first 3 txs) | $50/tx | Auto-lifted after 3                     |
| DCA single run         | $200   | Configurable in scheduler               |
| BATCH total            | $1,000 | Fixed                                   |

### Ring 5: Audit trail

Every action logged with full trace: raw input, parsed intent, plan, executed steps, tx hashes, status, error detail. 90-day retention. User can export their own log.

### Ring 6: Simulation gate (new)

Txs above $100 must pass Tenderly simulation before the confirmation card is shown. Simulation failure → explain why → abort. Never wastes user gas on a predictably failing tx.

### Ring 7: Anomaly detection (new)

Heuristic layer before confirmation:

- Multiple large txs in rapid succession → soft pause + re-confirm
- Large tx to address with zero prior activity → "this address has never transacted. Sure?"
- Unlimited token approval requested → warn, offer bounded approval instead
- Bridge to non-allowlisted chain → reject

---

## 9. Protocol adapter specs (summary)

Each adapter is a single TypeScript file in `packages/tools/` exporting typed tool functions.

**Aerodrome / Uniswap v4 (SWAP, LP):** Quote both, pick better rate. Swap with slippage (0.5% stables / 1% volatile). LP add/remove with receipt.

**Morpho / Aave (LEND, BORROW):** Morpho primary (best rates). Aave fallback. Borrow checks health factor, warns if HF < 1.5 post-borrow.

**Zora Coins (MINT, BUY_COIN):** Find creator coin by Farcaster username or Zora profile. Buy via auto-created Uniswap LP. Mint post as coin for creator users.

**Farcaster (CAST, TIP, FOLLOW, LAUNCH_TOKEN):** Hub API for social graph. Clanker for token deploy (tag @clanker_world → ERC-20 + Uniswap LP auto-seeded).

**Limitless / PolyForge (BET):** Limitless primary (higher volume). PolyForge for custom market creation. Semantic market search before creating new.

**Across Protocol (BRIDGE):** Quote fee, execute bridge via SpokePool, monitor completion, verify receipt on Base.

**Lido (STAKE):** Wrap ETH → stETH on Base. Show APY. Warn on 7–10 day unbonding queue.

**Coinbase AgentKit (fallback):** 50+ pre-built actions for edge cases and power flows not covered by custom adapters.

---

## 10. UX patterns (v3)

### 10.1 Confirmation cards

```
┌──────────────────────────────────────────────────┐
│  🔵 SWAP                                          │
│                                                  │
│  Swap 200 USDC → AERO                            │
│  Route:    Aerodrome (better rate vs Uniswap)    │
│  Rate:     1 USDC = 3.82 AERO                    │
│  Slippage: 0.5% (standard)                       │
│  Min recv: 762 AERO                              │
│  Gas:      $0.00 (sponsored ✓)                   │
│  Risk:     ⚠️ AERO is volatile                   │
│                                                  │
│  [Proceed]   [Adjust slippage]   [Cancel]        │
└──────────────────────────────────────────────────┘
```

Risk indicators surface when token volatility is high, amount is >50% of balance, health factor post-borrow is <1.5, or Ring 7 anomaly fires.

### 10.2 Multi-step progress

```
Step 1/3: Approve USDC ✅
Step 2/3: Add liquidity... ⏳
Step 3/3: Verify LP position ○
```

### 10.3 Disambiguation

Max 2 clarification rounds. If still ambiguous after 2, show 3 example phrasings that would work and reset.

### 10.4 Command shortcuts (power users, unlocked after 10+ txs)

`/send @alice 50`, `/swap 200 USDC AERO`, `/lend 500 USDC`, `/dca ETH 20 weekly`, `/bal`

### 10.5 Progressive feature unlock

- Connect wallet → SEND, BALANCE, HISTORY available immediately
- After first tx → SWAP, BUY, BET unlock
- After 3 txs → all DeFi intents unlock
- After 10 txs → Automation intents (DCA, ALERT, MONITOR) unlock, caps raise

### 10.6 Onboarding

1. Connect Smart Wallet (or create seedless via Coinbase)
2. Optional: claim Basename, link Farcaster
3. Guided first tx: "Send $1 USDC to @0x_art" (sponsored by Paymaster)
4. Memory prompt after 3 txs: "I noticed you prefer Aerodrome — always use it for swaps?"

---

## 11. Surfaces (v3)

### 11.1 Web app (sherpa.xyz)

Full-featured: all 30+ intents, memory management, scheduler dashboard, portfolio view, /memory page, /history page. Dark theme, Base blue (#0052FF). Progressive web app (installable).

### 11.2 Farcaster Mini App

Mobile-first, 6 core intents: SEND, SWAP, BET, BUY_COIN, CAST, BALANCE. Frame state via URL params. Native wallet signing via Frames v2 SDK.

### 11.3 Telegram bot (@SherpaOnBase)

Commands: /send, /swap, /bet, /balance, /history, /dca, /alert. Read-only ops work natively. Wallet signing bounces to web via deep-link + session token. CRITICAL: Never expose wallet addresses or private info in Telegram chat.

### 11.4 Headless API + MCP server

REST endpoints: `/api/parse`, `/api/plan`, `/api/execute`, `/api/balance`, `/api/history`. MCP server for tool integration. API key auth (JWT). 100 req/min per key. Allows other agents to use Sherpa as a Base action layer.

---

## 12. Build plan (16 weeks, 4 staged releases)

### Stage 1 — Foundation (Weeks 1–4)

_Ship: SEND, BUY, BET, BALANCE, HISTORY on web app_

**Week 1:** Turborepo scaffold, Smart Wallet connect, identity resolver, Supabase schema, deploy to Vercel  
**Week 2:** openclaude wrapper, intent parser for S1 intents, /api/parse, audit log schema, rate limiter  
**Week 3:** SEND tool (USDC transfer), confirmation card UI, cap enforcement ($50 new user)  
**Week 4:** BET tool (Limitless + PolyForge), BUY tool (Uniswap v4 + Onramp), E2E tests

_Release gate: 100 real wallets, 500 txs, <3s parse→confirm latency, 0 Ring 2 bypasses_

---

### Stage 2 — DeFi core (Weeks 5–8)

_Ship: SWAP, LEND, BORROW, STAKE, YIELD, LP, BRIDGE + Tenderly simulation_

**Week 5:** Aerodrome adapter, Uniswap v4 adapter, SWAP flow + slippage UI  
**Week 6:** Morpho adapter, Aave fallback, LEND + BORROW flows, health factor display  
**Week 7:** Lido stETH, Across bridge adapter, STAKE + BRIDGE flows  
**Week 8:** Tenderly simulation integration, LP add/remove, yield comparator (Morpho vs Aave vs Seamless)

_Release gate: $10k+ tx volume through Sherpa, simulation catching ≥80% of likely reverts_

---

### Stage 3 — SocialFi + NFT (Weeks 9–12)

_Ship: CAST, TIP, FOLLOW, LAUNCH_TOKEN, MINT, BUY_COIN + Farcaster Mini App_

**Week 9:** Farcaster Hub integration, CAST + FOLLOW + TIP flows  
**Week 10:** Zora Coins adapter, BUY_COIN flow, creator profile resolution  
**Week 11:** Clanker integration, LAUNCH_TOKEN flow (Farcaster tag → ERC-20 + LP)  
**Week 12:** Farcaster Mini App (Frames v2), 6-intent subset, tested on Warpcast real device

_Release gate: Mini App live in Warpcast, 1,000 Farcaster-connected users_

---

### Stage 4 — Automation + Power (Weeks 13–16)

_Ship: DCA, ALERT, MONITOR, PORTFOLIO, REVOKE, EXPLAIN, BATCH + Telegram + MCP_

**Week 13:** Scheduler engine (DCA), Pyth price watcher, Pushover + Telegram notifications  
**Week 14:** Portfolio view (Moralis/Zapper), REVOKE tool, EXPLAIN (ABI decoder + Basescan)  
**Week 15:** Telegram bot (grammY), session bridge, wallet MONITOR, BATCH (ERC-4337 batch tx)  
**Week 16:** MCP server, headless API, security audit, Plausible analytics, launch

_Release gate: PUBLIC LAUNCH — all 30+ intents live, all 4 surfaces operational_

---

## 13. Patterns inherited from PolyForge (non-negotiable)

**13.1 Clarification round:** Every spec phase → Claude Code asks 3–5 questions BEFORE writing code. Saved 5 hours on Stage 10 alone.

**13.2 Postgres event indexer:** Idempotent UPSERT on (tx_hash, log_index), REORG_LOOKBACK = 20 blocks, 50s soft deadline, Vercel Cron.

**13.3 EIP-5792 sponsorability detection:** `useSponsorableWrite` wrapper on every tx. Smart Wallets get gasless; others pay normally. Badge hidden if no sponsorship.

**13.4 Frame URL state:** `?step=confirm&plan=abc123`, `?step=success&tx=0x...` — fully stateless Frame flow.

**13.5 Sensitive env vars:** OPENAI_API_KEY, SUPABASE_SERVICE_KEY, CRON_SECRET, TENDERLY_KEY, RPC URLs — all marked sensitive at add time in Vercel.

**13.6 Staged worktree execution:** Each stage in its own git worktree. Prompt files committed to `docs/sherpa/specs/`. Clarify → implement → tests → merge. Stage N+1 does not start until Stage N tests pass.

---

## 14. Risks and mitigations (v3)

| Risk                                      | Likelihood | Severity | Mitigation                                                         |
| ----------------------------------------- | ---------- | -------- | ------------------------------------------------------------------ |
| LLM hallucinates address                  | Medium     | Critical | Ring 3: API-resolved only, never LLM                               |
| LLM mis-parses complex DeFi intent        | High       | High     | Confidence threshold, disambig, simulation                         |
| Smart contract exploit in target protocol | Low        | Critical | Contract allowlist, simulation, no novel contracts                 |
| Paymaster credits exhausted               | Medium     | Medium   | Graceful fallback to user-paid gas with clear UI                   |
| Tenderly API down                         | Medium     | Low      | Skip simulation for <$100, warn for >$100                          |
| Morpho/Aave liquidity crisis              | Low        | High     | Real-time HF check, warn at HF < 1.5                               |
| Farcaster API rate limit                  | Medium     | Medium   | Cache username→address 24h, exponential backoff                    |
| Bridge stuck / long finality              | Medium     | Medium   | Show bridge ETA upfront, status in /history                        |
| Scheduler DCA tx fails                    | Medium     | Medium   | Retry x3 with backoff, notify user, pause after 3 failures         |
| Telegram security leak                    | Low        | Critical | Never expose wallet data in Telegram; all wallet ops bounce to web |
| User confused by DeFi terms               | High       | Medium   | Plain English: "earn yield" not "supply to lending pool"           |
| openclaude provider outage                | Medium     | Medium   | Auto-failover across providers in openclaude wrapper               |
| Clanker token launch abuse                | Medium     | Medium   | Ring 1 allowlist on LAUNCH_TOKEN; user must confirm token details  |

---

## 15. Success metrics

### Stage 1 (4 weeks post-launch)

- 500 unique wallets, 2,000 successful txs
- 75% intent parsing accuracy first-try
- <3s parse→confirm latency
- 0 Ring 2 contract allowlist bypasses

### Stage 2 (8 weeks)

- $50k total tx volume
- 50% of active users try a DeFi intent
- Simulation catching ≥80% of would-be reverts

### Stage 3 (12 weeks)

- 2,000 Farcaster-connected accounts
- Mini App live in Warpcast store
- 500+ creator coins bought/minted through Sherpa

### Full launch (16 weeks)

- 5,000 monthly active wallets
- $500k monthly tx volume
- 40% weekly retention
- 1 in 3 users uses Automation features (DCA or ALERT)
- Featured on Base, Farcaster, or Coinbase official channels

### Long-term (6 months)

- 25,000 monthly active wallets
- $5M monthly tx volume
- 0.1% swap fee generating sustainable revenue
- Listed on official Base ecosystem page

---

## 16. Open questions (pre-Week 1)

1. **Revenue model.** 0.1% fee on swaps (Uniswap v4 fee param)? $5/month Automation subscription? Coinbase Onramp affiliate? Decide before Week 5.

2. **Limitless vs PolyForge primary.** Ship both — Limitless as primary (higher volume), PolyForge for custom market creation.

3. **AgentKit as primary or secondary?** Decision: AgentKit = fallback layer for 50+ existing actions. Custom adapters = primary for all Stage 1–3 intents.

4. **Simulation threshold.** $100 gate right? Consider $50 for new users to catch more potential failures early.

5. **Memory opt-in vs opt-out.** Memory on by default, opt-out in settings. All memory indexed by wallet address only — no personal data off-chain.

6. **Domain.** sherpa.xyz status? Squat sherpa-app.vercel.app now, push for sherpa.xyz before Week 12.

7. **Legal.** "Sherpa does not provide financial advice. You control your wallet. Crypto is volatile." On every confirmation card + settings. Crypto lawyer before Stage 2 launch.

---

## 17. What ships in v3, restated

**30+ intents. 4 surfaces. 7 rings of safety. Persistent memory. Scheduler engine. Zero custody. 16 weeks.**

Built solo, leveraged via openclaude + AgentKit + PolyForge patterns, deployed on Vercel + Base.

The pitch:

> **"Sherpa is the Base OS. Type anything. Sherpa does it."**

---

_PRD v3 — April 29, 2026_  
_Owner: Gnanam (@0x_art)_  
_Built on PolyForge sprint patterns. Powered by openclaude. Built for Base._
