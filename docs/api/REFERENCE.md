# Sherpa Developer API — Reference

## Endpoints

### Intent Parsing

#### POST /api/parse

Parse natural language input into a structured intent.

**Request:**
```json
{
  "input": "send 10 USDC to vitalik.eth",
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "intent": "SEND",
  "params": {
    "amount": "10",
    "token": "USDC",
    "recipient": "vitalik.eth"
  },
  "confidence": 0.95,
  "riskLevel": "low"
}
```

**Supported intents:** SEND, SWAP, LEND, BORROW, REPAY, WITHDRAW, STAKE, YIELD, LP, BRIDGE, BET, BUY, DCA, ALERT, BALANCE, HISTORY, POSITIONS, PORTFOLIO, MINT, BUY_COIN, CAST, TIP, FOLLOW, LAUNCH_TOKEN, PROFILE, REVOKE, EXPLAIN, SIMULATE, BATCH

---

### Balance

#### GET /api/balance/:address

Get native ETH and USDC balance for an address.

**Response:**
```json
{
  "address": "0x...",
  "ethWei": "1500000000000000000",
  "ethDisplay": "1.5 ETH",
  "usdcBaseUnits": "5000000000",
  "usdcDisplay": "$5000.00"
}
```

---

### Positions

#### GET /api/positions/:address

Get Aave V3 lending/borrowing positions.

**Response:**
```json
{
  "address": "0x...",
  "totalCollateralBase": "500000000000",
  "totalDebtBase": "200000000000",
  "availableBorrowsBase": "300000000000",
  "currentLiquidationThreshold": "8500",
  "ltv": "8000",
  "healthFactor": "2125000000000000000",
  "hasPosition": true
}
```

---

### Portfolio

#### GET /api/portfolio/:address

Get aggregated portfolio across chains.

**Response:**
```json
{
  "address": "0x...",
  "chains": [
    {
      "chainId": 8453,
      "chainName": "Base",
      "tokens": [
        { "symbol": "ETH", "balance": "...", "valueUsd": "...", "priceUsd": 3000 }
      ],
      "totalValueUsd": "..."
    }
  ],
  "totalValueUsd": "...",
  "lastUpdated": "..."
}
```

---

### Safety Check

#### POST /api/safety

Check a transaction against Sherpa's 7-ring safety system.

**Request:**
```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0"
}
```

**Response:**
```json
{
  "safe": true,
  "riskLevel": "low",
  "warnings": [],
  "ringResults": [
    { "ring": 1, "passed": true },
    { "ring": 2, "passed": true },
    { "ring": 3, "passed": true },
    { "ring": 4, "passed": true },
    { "ring": 5, "passed": true },
    { "ring": 6, "passed": true },
    { "ring": 7, "passed": true }
  ]
}
```

---

### DCA (Dollar Cost Averaging)

#### POST /api/dca

Create a DCA schedule.

**Request:**
```json
{
  "userAddress": "0x...",
  "fromAsset": { "symbol": "USDC" },
  "toAsset": { "symbol": "ETH" },
  "amountPerTick": "100",
  "frequency": "daily"
}
```

#### GET /api/dca/:address

List DCA schedules for a user.

#### PATCH /api/dca/:id

Update/pause/resume/cancel a DCA schedule.

#### DELETE /api/dca/:id

Delete a DCA schedule.

#### GET /api/dca/:id/history

Get execution history for a DCA schedule.

---

### Alerts

#### POST /api/alerts

Create a price/health-factor/balance alert.

**Request:**
```json
{
  "userAddress": "0x...",
  "conditionType": "price",
  "asset": "ETH",
  "comparison": "below",
  "threshold": 2000,
  "channels": ["in-app", "telegram"]
}
```

#### GET /api/alerts/:userAddress

List alerts for a user.

#### PATCH /api/alerts/:id

Update alert status/threshold/channels.

#### DELETE /api/alerts/:id

Delete an alert.

---

### Auto-Repay

#### POST /api/auto-repay

Create an auto-repay rule.

**Request:**
```json
{
  "userAddress": "0x...",
  "triggerHf": 1.3,
  "targetHf": 1.5,
  "maxRepayPerExecution": "1000000000"
}
```

#### GET /api/auto-repay/:userAddress

List auto-repay rules for a user.

#### PATCH /api/auto-repay/:id

Update rule parameters.

#### DELETE /api/auto-repay/:id

Delete a rule.

---

### Governance

#### GET /api/governance/proposals

List governance proposals from Snapshot and on-chain sources.

**Query params:** `source` (optional): `snapshot`, `aave`, `compound`, `optimism`

#### POST /api/governance/vote

Build a vote transaction.

**Request:**
```json
{
  "proposalId": "...",
  "support": "yes",
  "reason": "I support this proposal",
  "source": "snapshot"
}
```

#### POST /api/governance/delegate

Build a delegation transaction.

---

### Developer API

#### POST /api/developer/keys

Create an API key.

#### GET /api/developer/keys

List API keys.

#### DELETE /api/developer/keys/:id

Revoke an API key.

#### POST /api/developer/webhooks

Create a webhook.

#### GET /api/developer/webhooks

List webhooks.

#### DELETE /api/developer/webhooks/:id

Delete a webhook.
