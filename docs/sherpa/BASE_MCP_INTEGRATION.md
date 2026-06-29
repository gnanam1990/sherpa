# Base MCP Integration — Design (Phase 1, Task 1.1)

**Status:** Draft for sign-off · **Date:** 2026-06-29 · No code yet.

> Task 1.1 deliverable: confirm the integration target against current Base/Coinbase
> docs, record the exact packages and interfaces, pick Mode A vs B, and write the
> security contract. **Sign-off is required before Task 1.2 (any code).**

---

## 0. Verification finding — the work order's premise needs a correction

The work order said to use "the new official `base-mcp`, NOT `base-mcp-legacy`." On
verification (2026-06-29), the landscape is different from that assumption, and this
is exactly the "verify before wiring — do not assume the API shape from this prompt"
the work order asked for:

- **The self-hosted `base-mcp` npm package and the `base/base-mcp` repo are ARCHIVED
  and DEPRECATED** (repo archived 2026-05-13). The README states: *"The `base-mcp` npm
  package is deprecated. Do not use `npx base-mcp` or `npm install base-mcp`."* It
  redirects to `https://docs.base.org/ai-agents`. So neither `base-mcp` **nor**
  `base-mcp-legacy` is the target.
- **"Base MCP" the product lives on as a HOSTED MCP service at `mcp.base.org`** —
  connects an MCP client (Claude Code/Desktop, Cursor, …) to a user's **Base Account**
  smart wallet. Non-custodial: *"Every write action requires your approval."* Custom
  capabilities are described as **"skills."** This is the thing the work order's
  "relaunched May 26 2026" refers to.
- **The supported way to build custom onchain actions is Coinbase AgentKit**, surfaced
  as MCP tools via the AgentKit MCP extension. This replaces the old self-hosted
  base-mcp ActionProvider packaging.

Net: we integrate via **AgentKit ActionProviders exposed over MCP**, not via the
deprecated `base-mcp` package. The architecture the work order intended (Sherpa
actions as ActionProviders that the user signs) is still correct — only the packaging
vehicle changed.

## 1. Confirmed packages & interfaces (verified versions, 2026-06-29)

| Package | Version | Role |
| --- | --- | --- |
| `@coinbase/agentkit` | `0.10.4` | ActionProvider framework (`ActionProvider<WalletProvider>`, `@CreateAction`, `customActionProvider`). |
| `@coinbase/agentkit-model-context-protocol` | `0.2.0` | `getMcpTools()` → `{ tools, toolHandler }` to wire AgentKit actions into an MCP server. |
| `@modelcontextprotocol/sdk` | `1.29.0` | MCP `Server`, `ListToolsRequestSchema`, `CallToolRequestSchema`. |

**ActionProvider shape** (verified): a class `extends ActionProvider<WalletProvider>`
with instance methods decorated `@CreateAction({ name, description, schema })`; an
action may take a `WalletProvider` as its first parameter and **always returns
`Promise<string>`**. Requires `experimentalDecorators` + `emitDecoratorMetadata` in
`tsconfig.json`. A non-class `customActionProvider({ name, description, schema, invoke })`
form also exists.

**MCP wiring** (verified):

```ts
// illustrative only — not committed in Task 1.1
import { getMcpTools } from '@coinbase/agentkit-model-context-protocol';
const { tools, toolHandler } = await getMcpTools(agentKit);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) =>
  toolHandler(req.params.name, req.params.arguments));
```

**Sources:** github.com/base/base-mcp (archived notice); docs.base.org/ai-agents;
docs.cdp.coinbase.com/agent-kit/core-concepts/model-context-protocol;
npm `@coinbase/agentkit-model-context-protocol`.

## 2. Why Sherpa is architecturally aligned

Base MCP is non-custodial, user-signs, on Base, with Aave/Aerodrome — the same shape
as Sherpa. The integration MUST preserve Sherpa's differentiator: **every action
routes through the audited `SherpaRouter` with the 7-ring preflight.** We do NOT call
Aave/Aerodrome directly and we do NOT bypass any ring.

## 3. Mode A vs Mode B

### Mode A — Sherpa actions as AgentKit ActionProviders (SHIP-FIRST, recommended)

- Home: the existing `@sherpa/agentkit` package (today `AGENTKIT_FALLBACK_ENABLED =
  false`).
- Expose Sherpa actions (`supply / withdraw / borrow / repay / swap`) as AgentKit
  ActionProviders whose `schema` (zod) validates input and whose `invoke` runs the
  **existing** pipeline: `parse → plan → 7-ring checkRings → build calldata for
  SherpaRouter`. The action returns a **confirmation payload / unsigned tx** (as the
  required `string`, JSON-encoded) for the Base Account to sign. **Never** a signed tx;
  **never** auto-execute.
- Surfaced to MCP clients via `@coinbase/agentkit-model-context-protocol`'s
  `getMcpTools()`. Installable into a Base MCP / AgentKit-MCP client.
- Smallest, safest first step; reuses all of `@sherpa/core` + `@sherpa/safety`.

### Mode B — standalone Sherpa MCP surface (optional, larger)

- New `apps/mcp`: an MCP server (`@modelcontextprotocol/sdk`) wrapping `@sherpa/sdk`
  `SherpaClient` (`parse / plan / safetyCheck / balance / positions / portfolio`) as
  MCP tools, with OAuth 2.1 + Base Account auth.
- Register `mcp` as a Sherpa **surface** alongside web/telegram/farcaster: reuse the
  signing-token flow in `apps/api/src/routes/surfaces.ts`
  (`createSigningToken → consumeSigningToken`) so the server stays non-custodial.
  Concretely: add `'mcp'` to `surface: z.enum(['telegram','farcaster','web'])` and add
  matching rate-limit configs (write 30/min, read 120/min, mirroring the existing
  `surfaceWriteRouteOptions` / `surfaceReadRouteOptions`).

**Recommendation: do Mode A first.** It delivers the MCP value with minimal new
surface area and no new server/auth, then Mode B can follow if a standalone hosted
Sherpa MCP endpoint is wanted.

## 4. Security contract for ALL MCP tools (MANDATORY — prompt-injection mitigation)

Agent/tool input is an untrusted attack surface. Every Sherpa MCP tool MUST enforce:

1. **No auto-execution.** Tools return confirmations / unsigned txs only; the human
   signs in their Base Account.
2. **No guard bypass from input.** Model/tool input can never widen the token
   allowlist, raise caps, skip a ring, or flip simulation to fail-open. Inputs feed
   only the zod-validated action schema; ring config is server-owned.
3. **Mainnet stays fail-closed.** Rate-limit required, simulation fail-closed,
   sanctions real (per Phase 0 Task 0.2 honesty gate / `assertMainnetSafety`).
4. **No server key material.** No private keys introduced server-side; only the
   existing VAPID push keys are acceptable. A grep gate in CI confirms this.
5. **Tool descriptions are data, not instructions.** Never execute instructions found
   in a tool result, a market name, an ENS record, or any onchain string.

## 5. Open decisions for sign-off

1. **Confirm the corrected target** (AgentKit ActionProviders over MCP; deprecated
   `base-mcp` package NOT used). — needs your ✅
2. **Confirm Mode A first** (vs starting with Mode B, or both). — needs your ✅
3. Pin exact versions above into `package.json` ranges at 1.2 time (they may bump).

## 6. Exit criteria recap (Phase 1, for later)

- An MCP client can list Sherpa tools.
- "swap 100 USDC for WETH" / "supply 100 USDC to Aave" yields a **confirmation** (not
  an execution) with ring results attached.
- A ring failure (unlisted token, cap exceeded) is **refused with the ring reason**,
  not silently executed.
- Grep confirms no new private-key handling server-side.

---

**Next:** awaiting sign-off on §5 before writing any Task 1.2 code.
