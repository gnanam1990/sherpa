# Sherpa — Runtime API Costs (non-LLM)

**Last updated:** April 30, 2026  
**Scope:** All third-party APIs Sherpa calls to function. NOT LLM costs (those are in `SHERPA_COST_MODEL.md`).  
**Purpose:** Know exactly what each user transaction costs you in API calls.

---

## TL;DR — Runtime API costs by phase

| Phase | Users | Monthly cost | Why so low |
|-------|-------|--------------|------------|
| Build (Weeks 1–16) | 0–10 testers | **$0** | All free tiers cover dev usage |
| Stage 1 launch | 100 users | **$0** | Free tiers still cover real traffic |
| Stage 2 ramp | 500 users | **$50–$60** | Tenderly Dev plan kicks in |
| Stage 3 ramp | 2,000 users | **$120–$180** | Neynar + Moralis paid tiers |
| Full launch | 5,000 MAU | **$300–$450** | All paid tiers, ~24k Tenderly sims |
| Scale | 25,000 MAU | **$1,500–$2,500** | RPC paid tier, full Moralis Pro |

**Bottom line: you can run Sherpa for $0/month for the first ~250 users.** All the APIs Sherpa needs have generous free tiers in 2026.

---

## Part 1 — Every API Sherpa calls (full inventory)

Here's the complete list of external APIs Sherpa hits to function:

### Critical APIs (Sherpa cannot run without these)

| API | What it's for | Where called |
|-----|---------------|--------------|
| **Base RPC** (Coinbase Cloud or Alchemy) | Read balances, send txs, watch events | Every intent |
| **Ethereum mainnet RPC** (Alchemy) | ENS resolution, Basenames cross-chain reads | SEND with .eth recipient |
| **Neynar (Farcaster API)** | Resolve @username → wallet address | SEND/TIP/CAST/FOLLOW intents |
| **Coinbase Smart Wallet bundler** | Submit ERC-4337 user ops | Every write tx |
| **Coinbase Paymaster** | Sponsor gas | Every Smart Wallet tx |

### High-priority APIs (most intents need these)

| API | What it's for | Where called |
|-----|---------------|--------------|
| **Tenderly Simulation API** | Pre-flight tx simulation (Ring 6) | Every tx > $100 |
| **Limitless Exchange API** | Find prediction markets, get quotes | BET intent |
| **Coinbase Onramp API** | Fiat → USDC flow | BUY/PAY when balance insufficient |
| **Pyth Network price feed** | ETH/BTC/asset prices for ALERT and BET | Scheduler watcher |

### Medium-priority APIs (Stage 2+)

| API | What it's for | Where called |
|-----|---------------|--------------|
| **Aerodrome API / contracts** | Quotes, LP positions | SWAP/LP intents |
| **Uniswap v4 Quoter** | Quote prices via on-chain calls | SWAP/BUY |
| **Morpho API / contracts** | Lending market data, rates | LEND/BORROW/YIELD |
| **Aave API / subgraph** | Aave fallback for lending | LEND/BORROW |
| **Across Protocol API** | Bridge quotes and routes | BRIDGE intent |
| **Lido stETH** | Staking quotes | STAKE intent |

### Stage 3+ APIs

| API | What it's for | Where called |
|-----|---------------|--------------|
| **Zora Coins API** | Creator coin discovery, mint flow | MINT/BUY_COIN |
| **Clanker API** | Token deploy via Farcaster | LAUNCH_TOKEN |
| **Farcaster Hub API** | Casts, follows, social graph | CAST/FOLLOW |
| **Moralis or Zapper API** | Cross-protocol portfolio aggregation | PORTFOLIO intent |
| **Basescan API** | Tx history, ABI decoding | HISTORY/EXPLAIN |

### Stage 4 APIs

| API | What it's for | Where called |
|-----|---------------|--------------|
| **Pushover API** | Push notifications for alerts | ALERT/MONITOR |
| **Telegram Bot API** | Telegram surface | Telegram bot only |
| **Whisper API (OpenAI)** | Voice input transcription | Voice prototype |
| **Token allowance scanner** (custom or Revoke.cash API) | List active approvals | REVOKE intent |

---

## Part 2 — Cost per intent (API calls only)

How many API calls each intent triggers:

| Intent | Critical RPC reads | Simulation | Identity API | Other APIs | Cost per intent |
|--------|-------------------|------------|--------------|------------|----------------|
| BALANCE | 3 (multicall) | 0 | 0 | 0 | **~$0.0001** |
| HISTORY | 1 | 0 | 0 | 1 (Basescan) | **~$0.0002** |
| SEND | 4 (allowance, balance, gas) | 1 (if >$100) | 1 (recipient) | 0 | **~$0.0008** |
| BUY | 4 | 1 | 0 | 1 (Uniswap quote) | **~$0.0010** |
| BET | 5 | 1 | 0 | 2 (Limitless market + quote) | **~$0.0015** |
| SWAP | 4 | 1 | 0 | 2 (Aerodrome + Uniswap quotes) | **~$0.0015** |
| LEND | 5 | 1 | 0 | 2 (Morpho + Aave rates) | **~$0.0018** |
| BORROW | 6 (HF check) | 1 | 0 | 2 | **~$0.0022** |
| LP | 6 | 1 | 0 | 2 | **~$0.0020** |
| BRIDGE | 4 | 1 | 0 | 1 (Across quote) | **~$0.0012** |
| MINT/BUY_COIN | 5 | 1 | 1 (creator FID) | 1 (Zora API) | **~$0.0015** |
| CAST | 0 | 0 | 1 | 1 (Farcaster Hub) | **~$0.0003** |
| TIP | 4 | 1 | 1 | 0 | **~$0.0010** |
| LAUNCH_TOKEN | 2 | 1 | 1 | 1 (Clanker API) | **~$0.0012** |
| PORTFOLIO | 1 | 0 | 0 | 1 (Moralis full call) | **~$0.0040** |
| EXPLAIN | 1 | 0 | 0 | 2 (Basescan ABI) | **~$0.0008** |
| ALERT (per check) | 1 | 0 | 0 | 1 (Pyth price) | **~$0.0001** |
| Average | — | — | — | — | **~$0.0012** |

**At 8 intents/active session, runtime API cost per session: ~$0.01.**

That's a tenth of a cent per session. Even at 25,000 MAU and 4 sessions/user/month, that's only **$1,000/mo in API calls** — and most of that is free-tier covered.

---

## Part 3 — Detailed pricing per API

### Base RPC (Coinbase Cloud — your primary choice)

| Plan | Cost | Limits |
|------|------|--------|
| **Free** | $0 | Generous Base-specific tier, sufficient for ~10k MAU |
| Pay-as-you-go | varies | Only kicks in at high scale |

**Sherpa usage:** ~25 reads per intent. At 5k MAU × 8 intents/session × 4 sessions/month = 4M reads/month. **Free tier covers it.**

### Alchemy (fallback + Ethereum mainnet for ENS)

| Plan | Cost | Compute units (CU) / mo |
|------|------|--------------------------|
| **Free** | $0 | 300M CU |
| Growth | $49/mo | 1.5B CU |
| Scale | $289/mo | 5B CU |

**Sherpa usage:** ENS resolution = 1 mainnet read per `.eth` recipient SEND. At 5k MAU, ~10k mainnet reads/month. **Free tier covers it through Phase 5.**

### Neynar (Farcaster API)

| Plan | Cost | Limits |
|------|------|--------|
| **Free** | $0 | 5,000 reqs/day (~150k/mo) |
| Starter | $9/mo | 20,000 reqs/day (~600k/mo) |
| Growth | $99/mo | 200,000 reqs/day (~6M/mo) |
| Scale | $499/mo | 1M reqs/day |

**Sherpa usage:** Cached 24h per username. ~0.3 Neynar calls per intent average (only for SOCIAL intents + SEND with @username).

| MAU | Calls/month | Plan needed |
|-----|-------------|-------------|
| 100 | ~1,000 | Free |
| 500 | ~5,000 | Free |
| 2,000 | ~20,000 | Free |
| 5,000 | ~50,000 | Free or Starter ($9) |
| 25,000 | ~250,000 | Starter ($9) or Growth ($99) |

**Verdict: Neynar is essentially free for Sherpa at any reasonable scale.**

### Tenderly (transaction simulation)

| Plan | Cost | Limits |
|------|------|--------|
| **Free** | $0 | 1,000 simulations/mo |
| Dev | $50/mo | 10,000 simulations |
| Pro | $200/mo | 100,000 simulations |
| Enterprise | custom | unlimited |

**Sherpa usage:** Simulation only for txs > $100. About 30% of intents trigger simulation.

| MAU | Sims/month | Plan needed |
|-----|------------|-------------|
| 100 | ~300 | Free |
| 500 | ~1,500 | Free or Dev ($50) |
| 2,000 | ~6,000 | Dev ($50) |
| 5,000 | ~15,000 | Pro ($200) |
| 25,000 | ~75,000 | Pro ($200) |

**This is your biggest "real" API cost in mid-stages. Tenderly is non-negotiable for safety though.**

### Coinbase Onramp

- **Free to integrate.** No API key cost.
- Affiliate revenue: ~1% of onramped volume kicks back to Sherpa
- This is a **revenue source**, not a cost.

### Coinbase Paymaster

- **$600 in free credits at signup.**
- Beyond that: pay per sponsored tx (varies, usually <$0.10 per tx on Base)
- At scale, you'll likely sponsor only first-tx-of-user, not every tx

**Sherpa usage:** Sponsor every tx in Stage 1 (build user delight), gradually wind down to first-tx-only at scale.

| MAU | Sponsored txs/mo | Cost |
|-----|------------------|------|
| 100 | 500 | ~$0 (free credits) |
| 500 | 2,000 | ~$0 (still in free credits) |
| 2,000 | 8,000 | ~$200 |
| 5,000 | 20,000 | ~$500 |
| 25,000 | first-tx-only ~25k | ~$700 |

### Pyth Network (price feeds)

- **Free** for read access via on-chain or Hermes API
- No paid tier needed
- Used by ALERT scheduler

### Moralis (portfolio API for Stage 4)

| Plan | Cost | Compute units |
|------|------|----------------|
| **Free** | $0 | 40k CU/day (~1.2M/mo) |
| Starter | $49/mo | 250k CU/day (~7.5M/mo) |
| Pro | $199/mo | 1M CU/day (~30M/mo) |

**Sherpa usage:** Only for PORTFOLIO intent (heavy: ~50 CU per call). At 5k MAU with 5% using portfolio = 250 calls × 30 days = 7,500 calls × 50 CU = 375k CU/month. **Free tier covers it.**

| MAU | Plan needed |
|-----|-------------|
| 5,000 | Free |
| 25,000 | Starter ($49) |

### Limitless Exchange API

- **Free** public API (subject to rate limits)
- No paid tier announced
- Used for BET intent

**Risk:** Rate limits could bite at scale. Mitigation: cache market lists 5 minutes, cache quotes 30 seconds.

### Aerodrome / Uniswap v4 / Morpho / Aave / Across / Lido

These are **on-chain reads**, not separate APIs. Cost is just RPC reads, already counted in Coinbase Cloud / Alchemy budgets.

### Basescan API (tx history, ABI decoding)

| Plan | Cost | Limits |
|------|------|--------|
| **Free** | $0 | 5 calls/sec, 100k calls/day |
| Pro | $250/year | Higher rate limits |

**Sherpa usage:** HISTORY + EXPLAIN intents. Cache aggressively. Free tier handles up to 25k MAU.

### Zora Coins API (Stage 3)

- **Free** public API
- Used for creator coin discovery, mint flow

### Clanker API (Stage 3)

- **Free** for token launches via Farcaster
- Clanker takes a fee on tokens, not on API calls
- Used for LAUNCH_TOKEN intent

### Farcaster Hub API

- **Free** if you self-host or use public Hub
- Neynar wraps this; if Neynar quota fits, no separate Hub cost

### Pushover (Stage 4)

- **$5 one-time per platform** (iOS / Android / desktop)
- Total: ~$15 one-time
- Unlimited push notifications

### Telegram Bot API (Stage 4)

- **Free**, no rate limits at Sherpa's scale

### Whisper API (Stage 4 voice prototype)

- $0.006 per minute of audio
- Negligible — voice is a prototype, not a primary surface

### Revoke.cash API (Stage 4 REVOKE intent)

- **Free** public API
- Or: build it yourself by querying token approval logs (no external cost)

---

## Part 4 — Total monthly runtime API cost by phase

### Build phase (Weeks 1–16, dev usage)

| API | Cost |
|-----|------|
| Everything on free tier | **$0** |

### Stage 1 launch (100 MAU, ~3,200 intents/month)

| API | Calls/mo | Cost |
|-----|----------|------|
| Coinbase Cloud RPC | 80,000 | $0 (free) |
| Alchemy ETH mainnet | 1,000 | $0 (free) |
| Neynar | 1,000 | $0 (free) |
| Tenderly | 300 | $0 (free) |
| Basescan | 3,000 | $0 (free) |
| Limitless | 500 | $0 |
| Pyth | unlimited | $0 |
| Paymaster | 500 sponsored txs | $0 (free credits) |
| **Total** | | **$0/mo** |

### Stage 2 (500 MAU, ~16,000 intents/month)

| API | Cost |
|-----|------|
| RPC (still free) | $0 |
| Neynar (still free) | $0 |
| **Tenderly Dev** | **$50** |
| Basescan free | $0 |
| Paymaster (still in credits) | $0 |
| Misc | $5 |
| **Total** | **$55/mo** |

### Stage 3 (2,000 MAU, ~64,000 intents/month)

| API | Cost |
|-----|------|
| RPC | $0 |
| Neynar (free still works) | $0 |
| Tenderly Dev | $50 |
| Moralis (free still works) | $0 |
| Paymaster (~$200) | $200 |
| Pushover | $15 one-time |
| **Total** | **~$250/mo** |

### Full launch (5,000 MAU, ~160,000 intents/month)

| API | Cost |
|-----|------|
| RPC (Coinbase Cloud might need paid) | $50 |
| Neynar Starter | $9 |
| **Tenderly Pro** | **$200** |
| Moralis Free or Starter | $0–$49 |
| Paymaster | $500 |
| Misc (Pushover, Whisper) | $20 |
| **Total** | **$780–$830/mo** |

### Scale (25,000 MAU, ~800k intents/month)

| API | Cost |
|-----|------|
| RPC paid (Coinbase Cloud + Alchemy) | $300 |
| Neynar Growth | $99 |
| Tenderly Pro | $200 |
| Moralis Starter | $49 |
| Paymaster (first-tx-only sponsorship) | $700 |
| Misc | $50 |
| **Total** | **~$1,400/mo** |

---

## Part 5 — Side-by-side: total cost (LLM + Runtime + Infra)

This combines the LLM cost model with this runtime API cost model:

| Phase | LLM | Runtime API | Infra | Grand Total |
|-------|-----|-------------|-------|-------------|
| Build (per month) | $15 | $0 | $9 | **$24** |
| Stage 1 (100 MAU) | $10 | $0 | $9 | **$19** |
| Stage 2 (500 MAU) | $80 | $55 | $94 | **$229** |
| Stage 3 (2,000 MAU) | $320 | $250 | $94 | **$664** |
| Full (5,000 MAU) | $800 | $830 | $109 | **$1,739** |
| Scale (25,000 MAU) | $4,000 | $1,400 | $1,260 | **$6,660** |

---

## Part 6 — The biggest cost surprises (and how to avoid them)

### Surprise 1: Tenderly simulation costs at scale
Sherpa's safety Ring 6 simulates every tx > $100. At 5,000 MAU, that's 15,000+ sims/mo → forces Pro plan ($200).

**Mitigation:**
- Lower simulation threshold to $200 (cuts ~30% of sims)
- Skip simulation for repeat-pattern txs (same recipient + same amount range)
- Cache simulation results for 60s for identical tx shapes

### Surprise 2: Paymaster credits run out faster than expected
$600 free credits sound like a lot. At Sherpa scale they cover ~6,000 sponsored txs. That's ~12 weeks at Stage 1, ~2 weeks at Stage 2.

**Mitigation:**
- Sponsor only first 3 txs per user (not all txs)
- After Stage 1, switch to "pay for own gas" UX with badge for frequent users
- Budget $500/mo for Paymaster from Stage 3 onward

### Surprise 3: RPC rate limits during launch spike
Free tiers have rate limits per second, not just per month. A viral launch can hit limits in hours.

**Mitigation:**
- Set up Alchemy Growth ($49) BEFORE launch announcement, not after
- Cache aggressively (1s for prices, 60s for balances during inactive sessions)
- Use multiple RPC providers in failover

### Surprise 4: Moralis CU pricing is opaque
"Compute units" hide the real cost. Some Moralis calls cost 1 CU, others 100.

**Mitigation:**
- Test PORTFOLIO intent with Moralis on a real wallet before Stage 4 launch
- Measure actual CU consumption
- Have Zapper as fallback if Moralis pricing surprises

### Surprise 5: Limitless or Clanker API rate limits without warning
Public APIs can shift terms or rate-limit unannounced.

**Mitigation:**
- Cache aggressively
- Build adapter pattern so swapping providers is easy
- Have direct on-chain fallback for every API-dependent intent

---

## Part 7 — Hard caps and circuit breakers (build these in Day 1)

Add these to `packages/safety/src/spend-cap.ts`:

```typescript
const DAILY_API_CAPS = {
  tenderly_sims: 500,        // $200 plan = 100k/mo = 3,300/day, fail at 500
  neynar_calls: 4000,         // 5k/day free tier, fail before hitting wall
  paymaster_sponsored: 200,   // pause sponsorship if daily count exceeds
  moralis_cu: 30000,          // 40k/day on free, fail at 30k
};

export async function checkApiCaps(api: keyof typeof DAILY_API_CAPS): Promise<boolean> {
  const usage = await getDailyApiUsage(api);
  if (usage > DAILY_API_CAPS[api]) {
    await alertSlack(`API cap hit for ${api}: ${usage}/${DAILY_API_CAPS[api]}`);
    return false;
  }
  return true;
}
```

Each adapter checks its cap before calling. If exceeded → fail loud, don't burn budget.

---

## Part 8 — Realistic build budget (runtime API only, 6 months)

| Phase | Months | Monthly cost | Total |
|-------|--------|--------------|-------|
| Build | 4 | $0 | $0 |
| Stage 1 | 1 | $0 | $0 |
| Stage 2 | 1 | $55 | $55 |
| **Total runtime API spend** | **6 mo** | | **$55** |

That's it. **$55 total in third-party API costs to build Sherpa and operate it for 6 months serving up to 500 users.**

Combine with LLM costs and infra:
- LLM: ~$130 over 6 months
- Runtime API: ~$55
- Infra: ~$465

**Total 6-month operating budget: ~$650, split 3 ways = $220 each.**

---

## Part 9 — When API costs become real (the inflection points)

| User count | What changes |
|------------|--------------|
| 250 MAU | First Tenderly Dev plan needed ($50/mo) |
| 1,000 MAU | Vercel Pro becomes required for hourly cron |
| 2,500 MAU | Paymaster credits exhausted, real gas costs begin |
| 5,000 MAU | Tenderly Pro plan needed ($200/mo) |
| 10,000 MAU | RPC paid tier kicks in ($50–100/mo) |
| 25,000 MAU | All paid tiers, but revenue covers everything |

**At every inflection point, your revenue + grants should be covering the new tier.**

---

## Part 10 — What you DON'T pay for (counterintuitive wins)

These are things that look expensive but cost $0 in Sherpa's setup:

1. **Smart contract deployment** — You deploy zero contracts. All used contracts are existing (USDC, Limitless markets, Aerodrome pools, etc.).
2. **Wallet infrastructure** — Coinbase Smart Wallet handles signing, recovery, gas. Free.
3. **Bundler service** — Coinbase bundler is free for Smart Wallet users.
4. **Onchain reads from Aerodrome / Uniswap / Morpho / Aave / Lido / Across / Limitless / PolyForge / Zora / Basenames** — All just RPC reads, no separate API fees.
5. **Audit logging** — Postgres only, no third-party logging service.
6. **Frontend hosting** — Vercel Hobby covers Stage 1.
7. **Pushed updates / hot reload / preview deploys** — Vercel covers.
8. **Database backups** — Supabase Pro includes daily backups; free tier has weekly.

---

## Bottom line

**You can run Sherpa for $0/month for the first 250 users.** Past that, costs scale predictably:

- $50/mo at 500 users
- $250/mo at 2,000 users
- $800/mo at 5,000 users

By 5,000 MAU you should be earning $1,500+/mo in swap fees + Onramp affiliate. **Costs are never the limiting factor for Sherpa.** Time and attention are.

---

*Runtime API cost model v1 — April 30, 2026.*  
*Re-verify pricing quarterly. Coinbase, Tenderly, and Neynar pricing has been stable for 12+ months but can change.*
