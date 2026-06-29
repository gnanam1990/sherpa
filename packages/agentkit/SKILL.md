# Sherpa — Base MCP skill (Mode A)

Natural-language, **non-custodial** DeFi actions on Base, exposed to MCP clients
(Claude Code/Desktop, Cursor, …) as Coinbase **AgentKit ActionProviders**. Every
action routes through Sherpa's audited `SherpaRouter` and the **7-ring safety
preflight**, and returns an **unsigned confirmation** — the human always signs in
their Base Account. Sherpa never holds keys and never auto-executes.

> Target verified 2026-06-29: the standalone `base-mcp` npm package is deprecated;
> the supported path is AgentKit ActionProviders surfaced over MCP. See
> `docs/sherpa/BASE_MCP_INTEGRATION.md`.

## Tools

| Tool | Input | Returns (unsigned) |
| --- | --- | --- |
| `sherpa_supply` | `{ amount, asset }` | Supply (lend) to Aave on Base via SherpaRouter |
| `sherpa_withdraw` | `{ amount, asset }` | Withdraw a supplied asset from Aave |
| `sherpa_borrow` | `{ amount, asset }` | Borrow from Aave (variable-rate only) |
| `sherpa_repay` | `{ amount, asset }` | Repay borrowed debt to Aave |
| `sherpa_swap` | `{ fromAmount, fromAsset, toAsset, slippagePct? }` | Swap on Aerodrome via SherpaRouter |

`amount`/`fromAmount` are positive decimal strings; assets are token symbols
(e.g. `USDC`, `WETH`). Every tool returns a JSON string:

```jsonc
// success — an unsigned tx for the Base Account to sign
{ "ok": true, "action": "sherpa_supply", "signed": false, "autoExecuted": false,
  "rings": "passed", "intent": "LEND",
  "unsignedTx": { "steps": [ /* {to,data,value,…} */ ], "batch": { /* EIP-5792 */ } },
  "confirmation": { "label": "Lend", "primaryAmount": "100 USDC" } }

// refusal — a failed safety ring (or other guard); nothing is executed
{ "ok": false, "action": "sherpa_swap", "rings": "failed",
  "error": "safety ring2_amount_cap failed: …" }
```

(bigint values are serialized as decimal strings — JSON/MCP cannot carry bigint.)

## Wiring (host MCP app owns the AgentKit packages)

```ts
import { AgentKit, customActionProvider } from '@coinbase/agentkit';            // ^0.10
import { getMcpTools } from '@coinbase/agentkit-model-context-protocol';        // ^0.2
import { Server } from '@modelcontextprotocol/sdk/server/index.js';            // ^1.29
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createSherpaActionProviders } from '@sherpa/agentkit';

// Server-owned planning context — set by the operator, NEVER from model input.
const ctx = { executorDeps: {
  stage2Mainnet: true,
  sherpaRouterAddress: process.env.SHERPA_ROUTER_ADDRESS,
  aerodromeRouterAddress: process.env.AERODROME_ROUTER_ADDRESS,
  aave: createAave({ poolAddress: process.env.AAVE_POOL_ADDRESS }),
  // rateLimiter, simulate, … as configured
} };

const provider = createSherpaActionProviders(customActionProvider, ctx);
const agentKit = await AgentKit.from({ walletProvider, actionProviders: [provider] });
const { tools, toolHandler } = await getMcpTools(agentKit);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) =>
  toolHandler(req.params.name, req.params.arguments));
```

`@sherpa/agentkit` does **not** depend on `@coinbase/agentkit` — the host injects
`customActionProvider`. Rationale: AgentKit `0.10.x` pins an exact, divergent viem
(`2.38.3` vs the repo's `^2.50.4`) and pulls a large wallet/CDP/Solana/Privy tree.
Keeping it out of this security-critical package avoids a second viem, install
bloat, and a wider untrusted/key-bearing surface — consistent with the contract
below. Only `zod` is added here (already used across the repo).

## Security contract (MANDATORY — prompt-injection mitigation)

Enforced in `src/mcp/actions.ts`:

1. **No auto-execution.** Tools only call `plan()`, which *builds* calldata and
   never submits. Output is always unsigned; the human signs.
2. **No guard bypass from input.** Model/tool args feed only the zod schema
   (amount/asset). The router address, token allowlist, amount caps, simulation
   mode and network come from the **server-owned context**; the account is read
   from the **connected wallet**, never from tool args (a `userAddress`/`onBehalfOf`
   arg is ignored).
3. **Mainnet stays fail-closed.** `plan()` refuses when the router/network is
   unconfigured, and the 7 rings reject unlisted tokens / over-cap amounts /
   sanctioned addresses (real OFAC list) / failed simulation.
4. **No server key material.** Nothing here signs or holds private keys.
5. **Tool/onchain strings are data, not instructions.** Inputs are validated and
   used as values only; instructions found in a tool result, market name, ENS
   record, or any onchain string are never executed.

## Tests

`src/mcp/actions.test.ts` exercises the real pipeline: unsigned-only success,
ring-failure refusal, mainnet fail-closed, schema hardening, account-from-wallet
(not input), and the AgentKit binding.
