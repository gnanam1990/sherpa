# Sherpa Developer API — Quickstart

## Overview

Sherpa exposes a REST API for third-party developers to integrate intent parsing, balance queries, portfolio views, and safety checks into their own applications.

**Base URL:** `https://sherpa.xyz/api` (production) or `http://localhost:3000/api` (local)

## Authentication

All API endpoints require a Bearer token in the `Authorization` header.

```
Authorization: Bearer sk_your_api_key_here
```

Create API keys via the `/api/developer/keys` endpoint or the Sherpa dashboard.

## Installation

```bash
npm install @sherpa/sdk
```

```typescript
import { createSherpaClient } from '@sherpa/sdk';

const sherpa = createSherpaClient({
  baseUrl: 'https://sherpa.xyz',
  apiKey: 'sk_your_api_key',
});
```

## Quick Examples

### Parse a natural language intent

```typescript
const result = await sherpa.parse({
  input: 'send 10 USDC to vitalik.eth',
  walletAddress: '0x...',
});
// { intent: 'SEND', params: { amount: '10', token: 'USDC', recipient: 'vitalik.eth' }, confidence: 0.95, riskLevel: 'low' }
```

### Get wallet balance

```typescript
const balance = await sherpa.getBalance('0x...');
// { address: '0x...', ethWei: '...', ethDisplay: '1.5 ETH', usdcBaseUnits: '...', usdcDisplay: '$5000.00' }
```

### Get Aave positions

```typescript
const positions = await sherpa.getPositions('0x...');
// { totalCollateralBase: '...', totalDebtBase: '...', healthFactor: '...', hasPosition: true }
```

### Get portfolio overview

```typescript
const portfolio = await sherpa.getPortfolio('0x...');
// { totalValueUsd: '...', chains: [...], lastUpdated: '...' }
```

### Check transaction safety

```typescript
const safety = await sherpa.checkSafety({
  to: '0x...',
  data: '0x...',
  value: '0',
});
// { safe: true, riskLevel: 'low', warnings: [], ringResults: [...] }
```

## Rate Limits

| Tier  | Requests/day |
|-------|-------------|
| Free  | 100         |
| Pro   | 10,000      |

Rate limit headers are included in every response:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when the window resets

## Error Responses

All errors return a JSON object with `error` and optional `message` fields:

```json
{
  "error": "invalid_address",
  "message": "The provided address is not a valid Ethereum address"
}
```

Common status codes:
- `400`: Bad request (invalid input)
- `401`: Unauthorized (missing or invalid API key)
- `429`: Rate limit exceeded
- `500`: Internal server error
