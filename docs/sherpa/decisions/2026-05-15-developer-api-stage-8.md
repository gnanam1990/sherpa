# Decision: Developer API (Stage 8 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 8 P2

## Context
Sherpa needs a DEVELOPER intent for API key management, documentation access, usage status, and webhook configuration. This enables developers to integrate Sherpa's parsing and execution capabilities into their own applications.

## Decisions

### Supported Actions
- **create_key**: Generate a new API key (via `create api key`)
- **docs**: Open/view API documentation (via `show api docs`)
- **status**: Check API usage and limits (via `check my api status`)
- **webhook**: Create webhooks for events (via `create webhook for transactions`)

### Parser Patterns
- `create api key` → `devAction: 'create_key'`
- `show api docs` → `devAction: 'docs'`
- `check my api status` → `devAction: 'status'`
- `create webhook for <event>` → `devAction: 'webhook'`, `devEvent: <event>`

### SDK Module (`@sherpa/tools/sdk`)
- **API Keys**: `generateApiKey()`, `validateApiKey()`, `hashApiKey()`, `createApiKey()`
- **Webhooks**: `generateWebhookSecret()`, `createWebhook()`, `verifyWebhookSignature()`
- **Client**: `SherpaClient` class with `parse()`, `plan()`, `getBalance()`, `createWebhook()` methods
- **Factory**: `createSherpaClient(config)` convenience function

### Key Format
- API keys: `sk_` prefix + 48 alphanumeric characters (51 total)
- Webhook secrets: `whsec_` prefix + 32 alphanumeric characters

### Types
- `ApiKey` — id, key, name, permissions[], rateLimit, usageCount, createdAt, expiresAt?
- `WebhookConfig` — url, events[], secret?
- `Webhook` — id, url, events[], secret, status, failureCount
- `SherpaClientConfig` — apiKey, baseUrl, chainId?
- `ParseRequest` — input, userAddress?
- `ParseResponse` — intent, params, confidence
- `PlanRequest` — intent, params, userAddress, chainId?
- `PlanResponse` — ok, plan?, error?

### Security Considerations
- API keys are generated client-side; server-side hashing before storage
- Webhook signature verification uses HMAC-SHA256 (stubbed for V1)
- Rate limiting defaults to 1000 requests per key
- Keys support optional expiration timestamps

## Future Work
- Real HMAC-SHA256 webhook signature verification
- API key scoping by chain and contract
- Key rotation and revocation endpoints
- Usage analytics and billing integration
