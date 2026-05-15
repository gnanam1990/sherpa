# Sherpa API Reference

Base URL: `http://localhost:3001` (dev) / `https://sherpa-api.up.railway.app` (prod)

## Core Endpoints

### Health

```
GET /api/health
```

**Response:**
```json
{ "ok": true, "ts": 1715800000000 }
```

---

### Parse Intent

```
POST /api/parse
```

**Request Body:**
```json
{
  "input": "send 5 USDC to 0x1234...",
  "userKey": "0x1234..."  // optional
}
```

**Response:**
```json
{
  "parsed": {
    "intent": "SEND",
    "raw": "send 5 USDC to 0x1234...",
    "slots": { "amount": "5", "asset": "USDC", "to": "0x1234..." },
    "confidence": 0.95
  },
  "card": { ... }
}
```

---

### Execute Intent

```
POST /api/execute
```

**Request Body:**
```json
{
  "input": "send 5 USDC to 0x1234...",
  "userAddress": "0x1234..."
}
```

**Response:**
```json
{
  "ok": true,
  "auditLogId": 1,
  "planHash": "0xabc...",
  "card": { ... }
}
```

---

### Confirm Execution

```
POST /api/execute/:id/confirm
```

**Request Body:**
```json
{
  "txHash": "0xabc..."  // optional
}
```

**Response:**
```json
{ "ok": true }
```

---

### Get Balance

```
GET /api/balance/:addr
```

**Response:**
```json
{
  "address": "0x1234...",
  "source": "ens",
  "chain": "base",
  "balances": { "ETH": "1.5", "USDC": "100.00" }
}
```

---

### Get History

```
GET /api/history/:addr?limit=10
```

**Response:**
```json
{
  "address": "0x1234...",
  "chain": "base",
  "items": [...]
}
```

---

## Alerts

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/alerts` | `{ userAddress, conditionType, asset?, comparison, threshold, notificationChannels?, triggeredIntent? }` | `{ id, status, ... }` |
| `GET` | `/api/alerts/:userAddress` | — | `{ alerts: [] }` |
| `PATCH` | `/api/alerts/:id` | partial fields | `{ id, ... }` |
| `DELETE` | `/api/alerts/:id` | — | `{ id, status: "cancelled" }` |

---

## Auto-Repay

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/auto-repay` | `{ userAddress, triggerHF, targetHF, maxRepayPerExecution, repaySource? }` | `{ id, status, ... }` |
| `GET` | `/api/auto-repay/:userAddress` | — | `{ rules: [] }` |
| `PATCH` | `/api/auto-repay/:id` | partial fields | `{ id, ... }` |
| `DELETE` | `/api/auto-repay/:id` | — | `{ id, status: "disabled" }` |

---

## DCA (Dollar-Cost Averaging)

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/dca` | `{ userAddress, fromAsset, toAsset, amountPerTick, frequency, dayOfWeek?, dayOfMonth?, hourOfDay?, totalBudget?, maxExecutions? }` | `{ id, status, ... }` |
| `GET` | `/api/dca/:userAddress` | — | `{ schedules: [] }` |
| `PATCH` | `/api/dca/:id` | partial fields | `{ id, ... }` |
| `DELETE` | `/api/dca/:id` | — | `{ id, status: "cancelled" }` |

---

## Session Keys

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/session-keys` | `{ ownerAddress, chainId, spendLimit, validDuration, permissions[] }` | `{ id, sessionKeyAddress, status, ... }` |
| `GET` | `/api/session-keys/:ownerAddress` | — | `{ sessionKeys: [] }` |
| `POST` | `/api/session-keys/:id/revoke` | — | `{ id, status: "revoked" }` |
| `POST` | `/api/session-keys/:id/extend` | `{ validUntil }` | `{ id, validUntil }` |

---

## Strategies

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/strategies` | `{ name, description?, creatorAddress, chainId, intents[], parameters?, visibility?, tags? }` | `{ id, name, version, ... }` |
| `GET` | `/api/strategies` | — | `{ strategies: [] }` |
| `GET` | `/api/strategies/:id` | — | `{ id, name }` |
| `POST` | `/api/strategies/:id/follow` | — | `{ strategyId, status: "following" }` |
| `POST` | `/api/strategies/:id/run` | — | `{ strategyId, executionId, status: "pending" }` |

---

## Portfolio

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/api/portfolio/:address` | `?chain=` | `{ address, chains[], totalValueUsd, totalPnlUsd, ... }` |
| `GET` | `/api/portfolio/:address/pnl` | — | `{ realizedPnlUsd, unrealizedPnlUsd, totalPnlUsd, ... }` |
| `GET` | `/api/portfolio/:address/history` | `?days=30` | `{ address, period, snapshots[] }` |

---

## Notifications

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/notifications/subscribe` | `{ userAddress, channel, condition? }` | `{ id, enabled, ... }` |
| `GET` | `/api/notifications/:userAddress` | — | `{ subscriptions: [], recentNotifications: [] }` |
| `POST` | `/api/notifications/send` | `{ ... }` | `{ success, messageId }` |
| `POST` | `/api/notifications/:id/unsubscribe` | — | `{ id, enabled: false }` |

---

## Governance

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `GET` | `/api/governance/proposals` | — | `{ proposals: [] }` |
| `GET` | `/api/governance/proposals/:id` | — | `{ id, title, status }` |
| `POST` | `/api/governance/proposals` | `{ proposerAddress, title, description?, actions[] }` | `{ id, status: "pending" }` |
| `POST` | `/api/governance/vote` | `{ proposalId, voterAddress, support, reason? }` | `{ success, ... }` |
| `POST` | `/api/governance/delegate` | `{ delegatorAddress, delegateeAddress, chainId }` | `{ success, ... }` |

---

## Analytics

| Method | Path | Query | Response |
|--------|------|-------|----------|
| `GET` | `/api/analytics/:address/volume` | `?period=` | `{ address, totalVolume, totalVolumeUsd, dailyAverage, peakDay }` |
| `GET` | `/api/analytics/:address/fees` | — | `{ address, totalFeesPaid, protocolFees, gasFees, averageFeePerTx }` |
| `GET` | `/api/analytics/:address/stats` | — | `{ address, totalTransactions, successRate, uniqueIntents, ... }` |
| `GET` | `/api/analytics/global` | — | `{ totalUsers, totalVolume, totalTransactions, topIntents[] }` |

---

## Security

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/security/multisig` | `{ threshold, signers[], chainId }` | `{ id, address, ... }` |
| `GET` | `/api/security/multisig/:address` | — | `{ address, threshold, signers, transactions }` |
| `POST` | `/api/security/whitelist` | `{ userAddress, targetAddress }` | `{ success, ... }` |
| `GET` | `/api/security/whitelist/:userAddress` | — | `{ addresses: [] }` |
| `GET` | `/api/security/status/:userAddress` | — | `{ multisigEnabled, hardwareWalletConnected, ... }` |

---

## Developer

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/developer/keys` | `{ name, permissions?, rateLimit? }` | `{ id, key, ... }` |
| `GET` | `/api/developer/keys` | — | `{ keys: [] }` |
| `DELETE` | `/api/developer/keys/:id` | — | `{ id, revoked: true }` |
| `POST` | `/api/developer/webhooks` | `{ url, events[], secret? }` | `{ id, secret, ... }` |
| `GET` | `/api/developer/webhooks` | — | `{ webhooks: [] }` |
| `DELETE` | `/api/developer/webhooks/:id` | — | `{ id, deleted: true }` |
| `GET` | `/api/developer/docs` | — | OpenAPI spec |
| `GET` | `/api/developer/usage` | — | `{ totalRequests, requestsToday, rateLimitRemaining, plan }` |

---

## Composable

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/composable/flash-loan` | `{ asset, amount, chainId, purpose? }` | `{ id, fee, status }` |
| `POST` | `/api/composable/leverage` | `{ asset, leverageRatio, collateralAsset, chainId }` | `{ id, riskLevel, status }` |
| `GET` | `/api/composable/strategies` | — | `{ strategies[] }` |

---

## Paymaster (Gas Sponsorship)

```
POST /api/paymaster
```

JSON-RPC proxy to Coinbase paymaster. Supports `pm_getPaymasterStubData` and `pm_getPaymasterData`.

**Auth:** Rate-limited per sender (3/24h). Requires valid UserOp signature.

**Response Headers:**
- `X-Sherpa-Paymaster-Remaining` — remaining calls
- `X-Sherpa-Paymaster-Resets-At` — rate limit reset time

---

## Cron

```
POST /api/cron/hourly
```

**Auth:** `Authorization: Bearer ${CRON_SECRET}`

**Response:**
```json
{
  "ok": true,
  "ranAt": 1715800000000,
  "tasks": [{ "name": "...", "auditLogId": 1, "status": "success" }]
}
```

---

## Farcaster

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/farcaster` | Receives Farcaster webhook events |
| `GET` | `/api/farcaster/frame` | Returns frame metadata |

---

## Telegram

| Method | Path | Request Body | Response |
|--------|------|--------------|----------|
| `POST` | `/api/telegram/sign-intent` | `{ tgUserId, intent, params? }` | `{ signingUrl, expiresIn }` |
| `POST` | `/api/telegram/tx-confirmed` | — | `{ ok: true }` |

---

## Admin (requires `ADMIN_API_KEY`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/admin/llm-usage/today` | Bearer | `{ total_usd, by_task, by_provider }` |
| `GET` | `/admin/llm-usage/user/:address` | Bearer | `{ address, count, rows }` |
| `GET` | `/admin/paymaster-usage/today` | Bearer | `{ period, stats }` |
| `GET` | `/admin/paymaster-usage/user/:address` | Bearer | `{ address, usage }` |
| `GET` | `/admin/audit-log/today` | Bearer | `{ period, breakdown[] }` |
