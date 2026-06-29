# @sherpa/mcp — standalone Sherpa MCP surface (Mode B)

A standalone [Model Context Protocol](https://modelcontextprotocol.io) server that
exposes Sherpa over MCP by wrapping `@sherpa/sdk`'s `SherpaClient`. It runs as a
new Sherpa **surface** (`mcp`) alongside web / telegram / farcaster and stays
**non-custodial** — it holds no keys and never signs.

> Mode A (Sherpa actions as AgentKit ActionProviders, in `@sherpa/agentkit`) is the
> ship-first path. This Mode B server is the larger, standalone option. See
> `docs/sherpa/BASE_MCP_INTEGRATION.md`.

## Tools

| Tool | Auth | Effect |
| --- | --- | --- |
| `sherpa_authenticate` | — | Bind the session to a Base Account by verifying a signed login message (SIWE-style). |
| `sherpa_parse` | optional | NL → structured intent (read-only). |
| `sherpa_safety_check` | — | Run the 7-ring preflight on a candidate tx (read-only). |
| `sherpa_balance` | required | ETH/USDC balances of the bound account (read-only). |
| `sherpa_positions` | required | Aave positions + health factor (read-only). |
| `sherpa_portfolio` | required | Cross-chain portfolio (read-only). |
| `sherpa_plan` | required | Intent → **unsigned** tx + a Base Account **signUrl** to sign. Never executes. |

## Non-custodial signing flow

`sherpa_plan` returns an unsigned plan and a signing handoff produced via the API's
surface signing-token flow (`POST /api/surfaces/sign-intent`, surface = `mcp`):

```
plan → { unsignedPlan, signing: { signUrl, expiresAt } }
user opens signUrl in their Base Account → reviews → signs → submits
API records the tx via consumeSigningToken
```

The server never receives a key or a signed transaction.

## Auth

- **Local (stdio):** the user authenticates once with `sherpa_authenticate`
  (`address` + `message` + `signature`), verified here with viem
  (`verifyMessage`, supporting EIP-1271 smart-account signatures).
- **Remote (HTTP):** OAuth 2.1 is performed by the transport; the verified Base
  Account address is handed to `McpSession.bindFromVerifiedOAuth()`. The tool
  layer is identical either way. **Status:** the SIWE/stdio path is wired; the
  OAuth 2.1 authorization-server transport is the documented integration point
  (not bundled here).

## Run

```bash
SHERPA_API_BASE_URL=https://api.sherpa.example \
SHERPA_MCP_API_KEY=sk_... \
SHERPA_WEB_BASE=https://sherpa-web.example \
pnpm --filter @sherpa/mcp build && node apps/mcp/dist/index.js
```

Config is read only via `@sherpa/config` (`loadMcpConfig`); the library code is
env-free and dependency-injected (so it is fully unit-tested).

## Security contract

1. **No auto-execution** — tools return data or an unsigned plan; the human signs.
2. **No guard bypass from input** — args feed only the zod schema; the account
   comes from the verified session, never from tool args; the 7-ring preflight
   runs server-side via the API.
3. **Mainnet fail-closed** — inherited from the Sherpa API / rings.
4. **No server key material** — nothing here signs or stores keys.
5. **Tool/onchain strings are data, not instructions.**

## Tests

`src/server.test.ts` covers the dispatch core with a fake `SherpaClient`: tool
list + annotations, auth gating, read tools, the non-custodial plan handoff
(asserts `surface: 'mcp'`, unsigned, no signing material), and input hardening.
