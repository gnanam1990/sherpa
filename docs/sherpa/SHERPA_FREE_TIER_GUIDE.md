# Sherpa — Free Tier Only Setup Guide

**Goal:** Run Sherpa entirely on free tiers. $0/month operating cost.  
**Reality check:** Possible up to ~500 users. Past that, free tiers break.  
**Updated:** April 30, 2026

---

## The honest answer

**Yes, you can run Sherpa for $0/month — up to ~500 active users.**

Past that, free tiers break and costs become real. But for the entire build phase + Stage 1 launch + early Stage 2 (about 6–8 months of operation), free tier is genuinely sufficient.

---

## The free-tier stack (every service)

| Service | Free tier | What it gives you | Limit Sherpa hits at |
|---------|-----------|-------------------|---------------------|
| Vercel Hobby | $0 | Hosting + edge functions + daily cron | ~1,000 MAU |
| Supabase Free | $0 | 500MB Postgres + 50k MAU auth | ~10k audit log rows |
| Vercel KV Free | $0 | 256MB Redis + 30k req/day | ~3,000 daily intents |
| Coinbase Cloud RPC | $0 | Base reads + writes | ~10k MAU |
| Alchemy Free | $0 | 300M compute units (ETH mainnet for ENS) | ~50k MAU |
| Neynar Free | $0 | 5,000 Farcaster reqs/day | ~3,000 MAU |
| Tenderly Free | $0 | 1,000 simulations/month | ~300 MAU |
| Coinbase Paymaster | $600 credits | Sponsored gas | ~6,000 sponsored txs |
| Pyth Network | $0 | Price feeds | unlimited |
| Basescan API | $0 | Tx history + ABI decoding | ~25k MAU |
| Sentry Developer | $0 | Error tracking | 5k errors/mo |
| Plausible (self-hosted) | $0 | Analytics | unlimited |
| Moralis Free | $0 | Portfolio API | ~5k MAU |
| Limitless API | $0 | Prediction markets | rate-limited |
| Coinbase Onramp | $0 + earns affiliate | Fiat → USDC | unlimited (you earn ~1%) |
| Farcaster Hub | $0 | Cast + follow + tip | unlimited |
| Telegram Bot API | $0 | Telegram bot | unlimited |
| GitHub | $0 | Public repo | unlimited |
| Domain (sherpa-app.vercel.app) | $0 | URL | until you upgrade |

**Total monthly cost: $0.**

---

## What you give up by staying on free tier

These are the real trade-offs. Decide if you can live with them:

### Vercel Hobby (vs Pro)
| Feature | Hobby | Pro |
|---------|-------|-----|
| Cron frequency | Daily only | Hourly + every minute |
| Bandwidth | 100GB/mo | 1TB/mo |
| Function invocations | 100k/day | 1M/day |
| Function execution | 10s timeout | 60s timeout |
| Team members | Solo | Up to 10 |

**What you give up:** Hourly DCA scheduler. With daily cron only, "buy $20 ETH every Monday at 9am" can only run once per day, not at 9am precisely. You can still run DCA — it just runs at midnight UTC instead of user-chosen times.

**Workaround:** External cron service (cron-job.org has free tier with minute-level precision) calling your `/api/cron/dca` endpoint. Free.

### Supabase Free (vs Pro)
| Feature | Free | Pro |
|---------|------|-----|
| Database size | 500MB | 8GB |
| Bandwidth | 5GB/mo | 250GB/mo |
| Backups | Weekly | Daily + point-in-time |
| Project pause | After 1 week inactive | Never |

**What you give up:** Daily backups, larger DB. **Project pauses if no activity for 1 week** — important to know during slow weeks.

**Workaround:** Hit your DB at least once every 6 days (a daily cron does this anyway). Manually back up critical data weekly via `pg_dump`.

### Vercel KV Free (vs Pro)
| Feature | Free | Pro |
|---------|------|-----|
| Storage | 256MB | 512MB+ |
| Requests | 30k/day | unlimited |

**What you give up:** Once you hit 30k KV requests/day, requests fail. At ~3,000 active intents/day (Sherpa's threshold), you'll hit it — each intent does ~10 KV reads/writes.

**Workaround:** Cache aggressively in-memory within the Node process. Only write to KV for cross-instance state (sessions, identity cache). Cuts KV usage 60–70%.

### Tenderly Free (vs Dev)
| Feature | Free | Dev |
|---------|------|-----|
| Simulations | 1,000/mo | 10,000/mo |

**What you give up:** Simulation gate (Ring 6) at scale. At 300 MAU, you'll hit 1,000 sims/mo.

**Workaround Option A:** Lower simulation threshold from $100 to $200 — cuts ~30% of sims.

**Workaround Option B:** Build your own simulation using viem's `simulateContract` — does the same thing for free, but less detailed output. Real risk: misses some edge cases Tenderly catches.

**Workaround Option C (recommended):** Skip simulation for repeat-pattern txs. If user already did this exact intent type with this exact recipient successfully, skip sim.

### Neynar Free (vs Starter)
| Feature | Free | Starter |
|---------|------|---------|
| Requests | 5k/day | 20k/day |

**What you give up:** Heavy Farcaster usage. Each `@username` resolution = 1 Neynar call. Cached 24h.

**Workaround:** Aggressive caching. Most users have stable Farcaster usernames — cache 7 days, not 24h. Cuts usage 80%.

### Moralis Free (vs Starter)
**What you give up:** Heavy PORTFOLIO usage. Stage 4 only.

**Workaround:** Use Zapper API as fallback (also free tier), or query each protocol directly via RPC reads (slower but free).

### No paid Sentry (Developer plan covers most needs)
**What you give up:** Team collaboration features. With 3-person team, useful but not critical.

**Workaround:** All 3 members get Developer plans (free), watch errors independently, share findings in Discord.

---

## The free-tier-friendly architecture (build it this way)

To run on $0, design Sherpa from Day 1 with these patterns:

### 1. Aggressive in-process caching
Don't hit KV / Supabase / Neynar for things you can cache in Node memory.

```typescript
// packages/identity/src/cache.ts
const memoryCache = new LRUCache<string, ResolvedAddress>({
  max: 5000,
  ttl: 7 * 24 * 60 * 60 * 1000,  // 7 days
});

// Hit memory first, KV second, API third
async function resolve(input: string): Promise<ResolvedAddress> {
  if (memoryCache.has(input)) return memoryCache.get(input)!;
  
  const fromKV = await kv.get(`resolve:${input}`);
  if (fromKV) {
    memoryCache.set(input, fromKV);
    return fromKV;
  }
  
  const fromAPI = await callNeynar(input);  // last resort
  await kv.set(`resolve:${input}`, fromAPI, { ex: 7 * 24 * 3600 });
  memoryCache.set(input, fromAPI);
  return fromAPI;
}
```

This pattern cuts API calls by 80%+. Sherpa stays on free tiers far longer.

### 2. Batch RPC calls (multicall everywhere)
Instead of 5 separate RPC reads, use viem's `multicall()`:

```typescript
// 1 RPC call instead of 5
const [usdcBalance, ethBalance, nonce, allowance, code] = await client.multicall({
  contracts: [
    { address: usdc, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: weth, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    // ...etc
  ],
});
```

Cuts RPC usage 5x. Free tier lasts 5x longer.

### 3. Skip simulation for low-value txs
PRD says simulate >$100. Stricter rule for free tier: simulate only > $200, AND only if user has < 3 successful prior txs. Cuts Tenderly usage 60%.

### 4. Cache LLM responses (when input is stable)
If user types `send 5 USDC to vitalik.eth` and the same user types it again 30 minutes later, the parsed intent is identical. Cache 1 hour by `(user_address, raw_input)` hash.

```typescript
const cacheKey = `parse:${userAddress}:${hashInput(rawInput)}`;
const cached = await kv.get(cacheKey);
if (cached) return cached;

const parsed = await llm(parseRequest);
await kv.set(cacheKey, parsed, { ex: 3600 });
return parsed;
```

Cuts LLM cost AND KV writes for repeat queries.

### 5. Daily cron for non-urgent tasks
Free Vercel cron is daily. That's actually fine for:
- DCA executions (run once per day at midnight UTC, batch all "weekly Monday" buys together)
- Audit log cleanup (delete >90 day old rows)
- LLM cost report
- Memory aggregation

Hourly tasks (price alerts, watchlists) use external free cron service: **cron-job.org** offers minute-level precision, completely free, calls your webhook.

### 6. Self-host Plausible analytics
Drop-in 1-click deploy on Railway / Fly.io free tier. Saves $9/mo.

Or: use Vercel Analytics (free tier covers up to 10k events/mo).

### 7. Accept slower portfolio loads
PORTFOLIO intent at Stage 4 wants Moralis Pro for sub-second responses. Free tier is fine but slower (3–5s vs 800ms).

UX fix: show "Loading your portfolio..." with a progress indicator. Most users don't care about 3 seconds.

### 8. Don't sponsor every transaction
Coinbase Paymaster $600 free credits = ~6,000 sponsored txs. At 100 MAU × 5 txs/month = 500 txs/month sponsored. **Free credits last 12 months.**

If you sponsor every tx for every user, credits gone in 2 weeks. Instead:
- Sponsor first 3 txs per user only (onboarding gift)
- After that, user pays own gas
- Show "Gas: ~$0.03 — paid by you" badge

This stretches free credits to 18+ months.

---

## Free tier limits — when each one breaks

Stack-ranked by which limit you'll hit first:

| Limit | Hits at | What breaks |
|-------|---------|-------------|
| Tenderly 1,000 sims/mo | ~300 MAU | Safety Ring 6 fails for txs > $100 |
| Vercel KV 30k req/day | ~3,000 active intents/day | Sessions break, cache misses spike |
| Neynar 5k req/day | ~3,000 Farcaster-using MAU | @username resolution fails |
| Supabase 500MB DB | ~100k audit log rows | Inserts fail |
| Vercel Hobby cron daily | Day 1 of Stage 4 | DCA can only run once/day |
| Moralis 40k CU/day | ~5,000 MAU using PORTFOLIO | Portfolio loads slow / fail |
| Paymaster credits | 6,000 sponsored txs | Have to switch to user-paid gas |
| Vercel function invocations 100k/day | ~10,000 daily intents | Site goes down |

**The first wall: Tenderly at 300 MAU.** Everything else has more headroom.

---

## The "fully free" Sherpa: what users get vs paid version

| Feature | Free version | Paid version |
|---------|-------------|--------------|
| Connect wallet | ✓ | ✓ |
| All 30+ intents work | ✓ | ✓ |
| Smart Wallet + sponsored gas | First 3 txs free | First 3 txs free |
| Confirmation cards + safety rings | ✓ | ✓ |
| Tenderly simulation | Only > $200 | Every tx > $100 |
| Disambiguation | ✓ | ✓ |
| Audit log | ✓ | ✓ |
| Portfolio view | 3–5s load time | Sub-second |
| Price alerts | Daily check only | Per-minute |
| DCA | Once daily at UTC midnight | User-chosen schedule |
| Multi-step batching (EIP-5792) | ✓ | ✓ |
| Voice input (Stage 4) | Skip | Available |

**Users won't notice 90% of the differences.** Free version is fully functional.

---

## How to use external free crons (Vercel Hobby workaround)

### cron-job.org (recommended)
- 100% free
- Minute-level precision
- Webhook-based (calls your URL)
- Email alerts on failure

Setup:
```
1. Sign up at cron-job.org
2. Create job: "Sherpa hourly tasks"
3. URL: https://sherpa-app.vercel.app/api/cron/hourly
4. Schedule: every minute / hour / etc.
5. Add header: Authorization: Bearer <CRON_SECRET>
```

In Sherpa:
```typescript
// app/api/cron/hourly/route.ts
import { headers } from 'next/headers';

export async function GET() {
  const auth = headers().get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  
  // Run hourly tasks: price alerts, monitor wallets, etc.
  await runHourlyTasks();
  
  return Response.json({ ok: true });
}
```

### EasyCron (alternative)
- Free tier: 1 cron job, every 5 minutes minimum
- Good for backup if cron-job.org goes down

### GitHub Actions (alternative)
- Free for public repos
- Schedule with `cron` syntax in workflow file
- Calls your webhook on schedule

---

## Free tier strategy for the 16-week build

### Build phase (Weeks 1–16): all free, no caveats
$0 cost. Free tiers comfortably handle 3 devs testing.

### Stage 1 launch (100 users): all free
$0. Free tiers cover 100 users with massive headroom.

### Stage 2 ramp (500 users): squeeze free tier
$0 — IF you implement the 8 patterns above (caching, multicall, simulation skip, etc.).

If you skip those patterns, you'll hit Tenderly limit at ~300 users → forced to upgrade ($50/mo).

### Stage 3 (2,000 users): some paid tiers necessary
**~$60/mo is the realistic minimum.** Tenderly Dev ($50) + Vercel Pro ($20 for 1 seat) becomes hard to avoid.

You can theoretically still squeeze free tier with:
- Aggressive simulation skipping (cuts Tenderly to <1,000/mo)
- Daily cron only (cuts Vercel Pro need)
- All Neynar usage cached aggressively

But you're stretching duct tape. Better to spend $60/mo and ship features.

### Full launch (5,000+ MAU): paid tiers required
$300+/mo. By this point your revenue should cover it (swap fees + Onramp affiliate).

---

## The 1-line answer

**Yes, you can run Sherpa for $0/month. Free tiers genuinely cover Stages 1–2 (up to ~500 users) if you follow the 8 architecture patterns above.**

The only paid thing in 6 months might be:
- Domain (sherpa.xyz when ready) — $15/year
- Pushover (Stage 4 push alerts) — $15 one-time

Otherwise: $0.

---

## What to do RIGHT NOW

If you want to lock in free-tier operation:

1. **Sign up for all free tiers today** (before pricing changes):
   - Vercel Hobby
   - Supabase Free
   - Coinbase Cloud
   - Alchemy Free  
   - Neynar Free
   - Tenderly Free
   - Sentry Developer
   - cron-job.org

2. **Claim Coinbase Paymaster $600 credits today** — eligibility-based, no spending required

3. **Add free tier defaults to MAINTAINER_PROMPT.md:**
   - "Cache aggressively in-process before hitting external APIs"
   - "Multicall every RPC read where possible"
   - "Sponsor first 3 txs per user only"
   - "Simulate only txs > $200 if user is on free tier"

4. **Skip the spend cap circuit breaker** (you don't need to limit free tier usage — it'll just fail loud when limits hit)

---

## Risk: free tier feels good until it doesn't

Three failure modes to plan for:

**1. Pricing changes.** OpenAI / Vercel / Supabase have raised free tier limits before, and lowered them. Have a "we can pay $50/mo if forced" mental budget.

**2. Service outages.** Free tiers get less SLA priority. If Coinbase Cloud RPC goes down, paid Alchemy users get prioritized restoration.

**Mitigation:** Multiple RPC providers in failover. Free Alchemy + Free Coinbase Cloud + public Base RPC = 3 fallbacks.

**3. Viral launch breaks free tiers in hours.** Your Twitter post hits 10k impressions, suddenly you have 800 users. Free tiers buckle.

**Mitigation:** Have credit card ready to upgrade Vercel + Supabase + Tenderly simultaneously the moment you see a spike. Total cost to "burst" upgrade everything: ~$100/mo. Pay for one month, see if growth holds, downgrade if not.

---

## Final answer

**Yes. $0/month is genuinely possible up to ~500 users.**

For the 16-week build + Stage 1 + early Stage 2, free tier is sufficient. You don't need a credit card on file for any of these services to start.

Build, ship, get to 500 users for free. Then decide whether the $60/mo Stage 2 tier is worth it.

You'll know the answer by then.

---

*Free-tier-only setup guide v1 — April 30, 2026.*  
*Re-verify free tier limits monthly. They've been stable in 2026 but can change.*
