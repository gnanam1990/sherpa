# PRD — Sherpa Agent Spend Manager on Arc

**Date:** 2026-05-25
**Status:** Draft (Sprint May 25 – 31)
**Owner:** gnanam (@gnanam1990)
**Stage:** 11 — Agent Spend Manager (Arc)
**Sprint window:** 2026-05-25 → 2026-05-31 (7 days)
**Track:** Composability — extends Sherpa from a natural-language DeFi router to a
governance substrate for autonomous agents.

> **One-liner.** Sherpa Agent Spend Manager is a smart-contract-backed budget primitive
> on Arc that gives any AI agent a USDC wallet with daily caps, per-counterparty
> limits, and on-chain audit logs. Overruns are rejected at the contract layer, not the
> app layer. Think of it as a corporate card for autonomous agents — issued, metered,
> and revocable by the operator on-chain.

---

## 1. TL;DR

AI agents are starting to move real money on-chain, but there is no shared
infrastructure for **governing** that spend. Operators today either (a) hand an agent
a hot key with no limits and pray, or (b) build their own bespoke spend rails. Neither
scales, neither is auditable, and neither composes across agent frameworks.

Sherpa Agent Spend Manager fixes this by making the **budget itself a contract** on
Arc, Circle's USDC-native L1. Each agent gets an `AgentBudget` contract instance with:

- A USDC-denominated **daily cap** (rolling 24h window).
- Optional **per-counterparty caps** (per recipient address).
- Optional **per-action caps** (e.g. `tip`, `subscribe`, `swap`).
- Operator-controlled **allowlists**, **pause**, **revoke**, and **top-up**.
- **On-chain audit log** via indexed events for every spend attempt — accepted or
  rejected, with the reason.

The SDK gives any agent framework (LangGraph, AutoGPT-style runners, Devin-style
session agents, x402 micropayment clients, custom Python/TS agents) a single drop-in
client. Spending USDC becomes one call: `budget.spend({to, amount, action})`. The SDK
handles signing, simulation, retry, and gives back a structured receipt or a typed
rejection reason. No more "the agent silently sent the wrong amount and we found out
in the morning."

By **2026-05-31** we ship:

1. `AgentBudget` cap-accounting contract deployed and verified on **Arc testnet**.
2. `@sherpa/agent-budget` TypeScript SDK on npm (alpha tag).
3. A live demo agent operating under a `$50/day` cap with a **public dashboard**
   that streams every spend (accepted + rejected) in real time.
4. Working composability with **x402 Nanopayments** (HTTP 402 micropayment flow) and
   **Agent Hub** (Sherpa's agent registry).

---

## 2. Background & Motivation

### 2.1 Where the market is

- **Agents are moving money.** x402 made HTTP 402 a real payment surface;
  micropayment-per-API-call is now a shipping pattern. Circle's stack
  (USDC + CCTP + Programmable Wallets) is the de-facto stablecoin rail. Arc is
  Circle's new USDC-native L1, optimised for compliant, low-fee stablecoin flows.
- **No governance layer exists.** Today an operator who wants to give an agent a
  budget must either hand it a hot private key (no limits) or write custom proxy
  logic. There is no shared, audited, reusable cap-accounting primitive that any
  agent framework can plug into.
- **The risk surface is growing.** Every autonomous-agent demo that mishandles funds
  (overpays, gets prompt-injected, loops) reinforces the perception that agents
  cannot be trusted with money. That perception is the bottleneck on adoption.

### 2.2 Why Sherpa

Sherpa already has the right shape:

- A **safety-first** product philosophy with explicit preflight rings
  (see [`README.md`](../../../README.md)).
- Audited Solidity contracts on Base mainnet (`SherpaRouter`, `SherpaTreasury`).
- A monorepo with `packages/contracts`, `packages/sdk`, `packages/safety`,
  `apps/api`, and `apps/web` — the exact surfaces this initiative needs.
- A documented stance against autonomous black boxes
  (see [`docs/sherpa/decisions/2026-05-15-ai-agent-stage-9.md`](../decisions/2026-05-15-ai-agent-stage-9.md))
  — Stage 9 already memorialised that Sherpa's AI agent layer makes **zero on-chain
  calls without explicit gating**.

Stage 11 is the natural extension: take that "explicit gating" stance and make it a
**reusable on-chain primitive** that other agents — not just Sherpa's own — can
adopt.

### 2.3 Why Arc, why now

- **Arc is USDC-native.** Fees in USDC, deterministic finality, Circle-aligned
  compliance posture. This makes "agent moves USDC" a one-asset story.
- **Testnet is live and open.** We can ship a verified contract this sprint
  without waiting on mainnet access.
- **Composability with x402 + Agent Hub.** Both are Circle-adjacent surfaces; the
  earlier we anchor Sherpa as the spend-governance layer on Arc, the more
  defensible the position.

---

## 3. Problem Statement

> Operators of AI agents cannot safely grant those agents the ability to spend
> stablecoins, because there is no shared on-chain primitive that enforces budget
> limits, counterparty allowlists, and audit trails. As a result, agents either
> have unbounded spend authority (unsafe) or no spend authority at all (not useful).

### 3.1 Concrete failure modes today

| #   | Failure mode                                                           | Today's outcome                               |
| --- | ---------------------------------------------------------------------- | --------------------------------------------- |
| F1  | Agent is prompt-injected and instructed to send funds to an attacker   | Funds leave the wallet; only discovered later |
| F2  | Agent loops on a paid API and burns the daily budget in minutes        | Wallet drained; no rate brake                 |
| F3  | Agent sends 10× the intended amount due to unit / decimal confusion    | Overpayment; recovery depends on counterparty |
| F4  | Operator wants to revoke an agent; key rotation is manual and lossy    | Downtime, lost session state                  |
| F5  | Operator wants an auditable log of every agent spend for accounting    | No standard format; logs live in app DBs      |
| F6  | A second agent framework wants the same limits; logic must be re-built | Fragmentation; no shared primitive            |

### 3.2 Constraints

- **Must be enforceable on-chain.** App-layer caps are bypassable by a compromised
  agent; the cap must be in the contract.
- **Must be cheap.** Spend-per-action costs must be sub-cent on Arc; otherwise
  micropayment agents are unviable.
- **Must be framework-agnostic.** The SDK must not assume LangGraph, AutoGPT, or
  any specific runtime.
- **Must be honest.** Following Sherpa's existing principles, no fake/mock data in
  the demo; the dashboard streams real on-chain events only.

---

## 4. Goals & Non-Goals

### 4.1 Goals (May 25 – 31)

1. Ship `AgentBudget` v0.1 on Arc testnet — deployed, verified, and documented.
2. Ship `@sherpa/agent-budget` SDK v0.1.0-alpha on npm.
3. Ship a live demo agent + public dashboard at a Sherpa-owned URL.
4. Prove composability with x402 Nanopayments (one working end-to-end demo).
5. Prove composability with Agent Hub (registered agent + spend-cap metadata).
6. Reach `0 high / 0 critical` in Slither and `forge test` coverage ≥ 95% lines on
   the new contract.

### 4.2 Non-goals (this sprint)

- Mainnet deployment on Arc. Testnet only.
- Multi-asset support (only USDC this sprint).
- Cross-chain spend (CCTP integration is Stage 12+).
- Operator UI for cap configuration beyond CLI + JSON. A polished UI lands in
  Stage 12.
- Replacing `SherpaRouter` on Base. This is **additive**, not a migration.
- Formal verification. Slither + Foundry invariants only this sprint.

---

## 5. Personas & User Stories

### 5.1 Personas

- **Operator (Olivia).** Runs an agent in production, holds the master key, sets the
  budget. Cares about: revocation, audit trail, cost visibility, compliance.
- **Agent developer (Devon).** Builds the agent runtime. Cares about: a tiny SDK
  surface, typed errors, deterministic simulation, easy testing.
- **End user / counterparty (Casey).** Receives payment from the agent (e.g. an
  x402-priced API). Cares about: settlement finality and the same UX as a normal
  USDC transfer.
- **Auditor (Avery).** Reviews the operator's agent spend post-hoc. Cares about:
  one source of truth, on-chain events, reproducible totals.

### 5.2 User stories

- **US-1 (Olivia).** "I want to fund an agent with a $50/day cap and a $10/tx
  per-counterparty cap, so that even if it's compromised, the blast radius is
  bounded."
- **US-2 (Olivia).** "I want to pause my agent's spend in one transaction when I
  see something weird, without rotating any keys."
- **US-3 (Devon).** "I want a single `budget.spend({to, amount, action})` call that
  either settles or returns a typed rejection (`CAP_EXCEEDED`, `COUNTERPARTY_BLOCKED`,
  `PAUSED`), so my agent can react sanely."
- **US-4 (Devon).** "I want to simulate a spend before submitting, so I never
  surprise the user with an on-chain revert."
- **US-5 (Casey).** "I want to receive USDC the same way I always have — I should
  not need to know there's a cap contract in front of the sender."
- **US-6 (Avery).** "I want to query a single contract address and reconstruct every
  spend the agent has attempted this month, accepted or rejected, with reasons."

---

## 6. Product Overview

### 6.1 What the operator sees

1. Operator runs `npx @sherpa/agent-budget deploy --cap 50 --asset USDC --network arc-testnet`.
2. CLI returns an `AgentBudget` contract address and a structured config file.
3. Operator funds the budget by sending USDC to the contract (or via the CLI).
4. Operator hands the agent **only** the `agentKey` for that budget. The master key
   stays with the operator.
5. Operator visits the public dashboard and sees, in real time, every spend the
   agent makes and every spend it tries to make.

### 6.2 What the agent does

1. Agent imports `@sherpa/agent-budget`.
2. Agent constructs a `Budget` client with the contract address + `agentKey`.
3. Whenever the agent wants to spend, it calls
   `budget.spend({ to, amount, action, counterpartyTag })`.
4. The SDK simulates → submits → returns either a `SpendReceipt` (with tx hash and
   on-chain event id) or a typed `SpendRejection`.

### 6.3 What the dashboard shows

- Current daily cap, current daily spend, remaining headroom.
- Live stream of `SpendAttempted` and `SpendAccepted` events from Arc testnet.
- Per-counterparty subtotals.
- Per-action subtotals (`tip`, `subscribe`, `swap`, etc).
- Rejection ledger (filterable by reason).
- "Pause / Unpause" affordance (read-only in the demo; operator-key-gated in the
  live version).

---

## 7. Functional Requirements

### 7.1 F1 — `AgentBudget` smart contract on Arc

**FR-1.1** The contract MUST hold a USDC balance and account for outflows against a
configured cap.

**FR-1.2** The contract MUST enforce a **rolling 24h daily cap** in USDC base units.

**FR-1.3** The contract MUST support optional **per-counterparty caps** (mapping
`address counterparty => uint256 dailyCap`).

**FR-1.4** The contract MUST support optional **per-action caps** (mapping
`bytes32 actionTag => uint256 dailyCap`).

**FR-1.5** The contract MUST support an **allowlist mode**. When enabled, only
counterparties present in the allowlist may receive funds.

**FR-1.6** The contract MUST emit a `SpendAttempted` event for **every** call,
including rejections, with the rejection reason.

**FR-1.7** The contract MUST emit a `SpendAccepted` event on success with the
counterparty, amount, action tag, and post-spend remaining-cap.

**FR-1.8** The contract MUST support `pause()` / `unpause()` callable only by the
operator role.

**FR-1.9** The contract MUST support `revoke()` which permanently disables the
`agentKey` and forces all subsequent calls to revert with `AGENT_REVOKED`.

**FR-1.10** The contract MUST support `sweep(to)` callable only by the operator,
returning the full USDC balance to the operator's address (for end-of-life).

**FR-1.11** The contract MUST be **upgradable only via redeploy** — no proxy.
Per Sherpa's principle of audited immutability.

**FR-1.12** The contract MUST work with native USDC on Arc testnet. No wrapper
tokens.

### 7.2 F2 — `@sherpa/agent-budget` SDK

**FR-2.1** The SDK MUST be published to npm under `@sherpa/agent-budget@0.1.0-alpha`.

**FR-2.2** The SDK MUST expose a `Budget` class with at minimum:
`spend()`, `simulate()`, `state()`, `events()`, `onSpend()`.

**FR-2.3** `spend()` MUST return `Promise<SpendReceipt | SpendRejection>` and MUST
NOT throw on protocol-level rejection. Throws are reserved for transport / RPC
failure.

**FR-2.4** `SpendRejection` MUST carry a discriminated union of typed reasons:
`CAP_EXCEEDED | COUNTERPARTY_CAP_EXCEEDED | ACTION_CAP_EXCEEDED | COUNTERPARTY_BLOCKED | PAUSED | REVOKED | INSUFFICIENT_BALANCE | UNKNOWN`.

**FR-2.5** `simulate()` MUST run an off-chain dry run using viem's `simulateContract`
and return the same typed shape without submitting a transaction.

**FR-2.6** The SDK MUST ship a CLI: `npx @sherpa/agent-budget deploy | top-up | pause
| unpause | revoke | state`.

**FR-2.7** The SDK MUST work from both Node 20+ and edge runtimes (e.g. Vercel Edge,
Cloudflare Workers). No native deps.

**FR-2.8** The SDK MUST be framework-agnostic. No assumptions about LangGraph,
AutoGPT, OpenAI SDK, or any specific runtime.

**FR-2.9** The SDK MUST have a `@sherpa/agent-budget/x402` subpath export that wraps
a `fetch`-compatible function with x402 (HTTP 402) handling, so agents can do
`await client(url)` and have micropayments flow through the budget automatically.

**FR-2.10** The SDK MUST have an `events()` async iterator that streams contract
events with reconnection on RPC drop.

### 7.3 F3 — Demo agent + public dashboard

**FR-3.1** A demo agent MUST run continuously during the sprint window and operate
under a `$50/day` cap.

**FR-3.2** The demo agent MUST perform at least one real x402-priced API call per
hour, paying real USDC out of the budget.

**FR-3.3** The dashboard MUST be served at a Sherpa-owned URL (e.g.
`agents.sherpa.so` or a Vercel preview of `apps/web`) and MUST be publicly
accessible without login.

**FR-3.4** The dashboard MUST stream `SpendAttempted` and `SpendAccepted` events
from the Arc testnet RPC in real time.

**FR-3.5** The dashboard MUST display the contract address with a link to the Arc
testnet block explorer for verification.

**FR-3.6** The dashboard MUST show empty states honestly (no fake data) per the
existing Sherpa principle.

**FR-3.7** The dashboard MUST expose a public JSON endpoint
(`GET /api/agent-budget/state`) that mirrors the contract state for third-party
indexing.

### 7.4 F4 — Composability

**FR-4.1 (x402).** The SDK MUST handle the HTTP 402 challenge–response loop and
settle the payment through the `AgentBudget` contract. A working end-to-end demo
against at least one public x402 endpoint MUST be included.

**FR-4.2 (Agent Hub).** The demo agent MUST be registered in Agent Hub with the
budget contract address as metadata, so Agent Hub clients can discover its spend
profile.

**FR-4.3** Composability MUST be documented in `docs/sherpa/specs/` with one example
per surface.

---

## 8. Non-Functional Requirements

| ID     | Requirement                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| NFR-1  | **Security.** Slither: 0 high / 0 critical findings on `AgentBudget` before merge.                              |
| NFR-2  | **Coverage.** `forge coverage` ≥ 95% lines, ≥ 90% branches on `AgentBudget`.                                    |
| NFR-3  | **Invariants.** At least 3 Foundry invariants: `totalSpent ≤ cap`, `pause ⇒ no spend`, `revoke ⇒ no spend`.     |
| NFR-4  | **Cost.** A single accepted `spend()` MUST cost ≤ 200k gas on Arc testnet (target ≤ 150k).                      |
| NFR-5  | **Latency.** SDK `spend()` median end-to-end p50 ≤ 4s on Arc testnet (mempool → 1 confirmation).                |
| NFR-6  | **Observability.** Every `spend()` MUST log a structured line (Sentry breadcrumb + structured stdout JSON).     |
| NFR-7  | **Compatibility.** SDK passes the same `pnpm -r typecheck && pnpm -r build && pnpm -r test` gate the repo uses. |
| NFR-8  | **Honesty.** No fake balances, no mocked transactions in the live demo. Read-only fallback if RPC is down.      |
| NFR-9  | **Docs.** Every public SDK method has a TSDoc block + a usage example in `packages/agent-budget/README.md`.     |
| NFR-10 | **Licensing.** New code lands under Apache-2.0, matching the rest of the repo.                                  |

---

## 9. System Architecture

```text
                      ┌────────────────────────────────┐
                      │           Operator             │
                      │  (holds operatorKey, master)   │
                      └──────────────┬─────────────────┘
                                     │ pause / revoke / sweep / configure
                                     ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                AgentBudget contract on Arc testnet              │
   │  - holds USDC                                                   │
   │  - enforces daily cap (rolling 24h)                             │
   │  - per-counterparty caps                                        │
   │  - per-action caps                                              │
   │  - allowlist mode                                               │
   │  - pause / revoke                                               │
   │  - emits SpendAttempted, SpendAccepted, ConfigChanged           │
   └────────────────────┬────────────────────────────┬───────────────┘
                        │ spend(to, amount, action)  │ events
                        ▼                            ▼
   ┌──────────────────────────────────────┐    ┌───────────────────────┐
   │     @sherpa/agent-budget SDK         │    │  apps/web dashboard   │
   │  - viem-based client                 │    │  - live event stream  │
   │  - simulate() + spend()              │    │  - public JSON API    │
   │  - typed rejections                  │    │  - cap headroom view  │
   │  - x402 fetch wrapper                │    └─────────┬─────────────┘
   │  - events() async iterator           │              │
   │  - CLI                               │              │
   └──────────────┬───────────────────────┘              │
                  │ agentKey only                        │
                  ▼                                      ▼
        ┌─────────────────────────┐           ┌──────────────────────┐
        │     Demo agent          │──registers┤      Agent Hub       │
        │  (Node 20, x402 client) │           │ (Sherpa agent index) │
        └─────────────┬───────────┘           └──────────────────────┘
                      │ HTTP 402 paid calls
                      ▼
              x402-priced public API
```

### 9.1 Repository layout (additions)

```
packages/
  agent-budget/             NEW — TypeScript SDK + CLI
    src/
      client.ts             Budget client (viem-based)
      simulate.ts           Dry-run helper
      events.ts             Async iterator over contract events
      cli.ts                CLI entry (deploy, pause, top-up, ...)
      x402.ts               fetch wrapper for HTTP 402 flow
      types.ts              SpendReceipt, SpendRejection unions
      abi.ts                Generated ABI from contracts package
    test/                   Vitest suites
    README.md
packages/contracts/
  src/agent/
    AgentBudget.sol         NEW — cap-accounting contract
    interfaces/
      IAgentBudget.sol      NEW
  test/agent/
    AgentBudget.t.sol       NEW — unit + invariant tests
  script/agent/
    DeployAgentBudget.s.sol NEW — Foundry deploy script for Arc testnet
apps/web/app/
  agents/                   NEW — public dashboard surface
    page.tsx
    _components/
      LiveSpendFeed.tsx
      CapHeadroom.tsx
      RejectionLedger.tsx
apps/api/src/routes/
  agentBudget.ts            NEW — GET /api/agent-budget/state
deployments/
  arc-testnet.json          NEW — verified addresses + ABIs
docs/sherpa/specs/
  2026-05-25-agent-spend-manager-prd.md   THIS DOCUMENT
docs/sherpa/decisions/
  2026-05-25-agent-budget-on-arc.md        ADR (to be created)
```

---

## 10. Smart Contract Specification

### 10.1 Roles

- `operator` — set in the constructor, transferable only by the current operator.
  Can `pause`, `unpause`, `revoke`, `sweep`, `setCaps`, `setAllowlist`, `topUp`.
- `agent` — set in the constructor, may be rotated by the operator. The only role
  permitted to call `spend()`.

### 10.2 Storage

```solidity
// USDC token on Arc testnet (set at deploy)
IERC20 public immutable usdc;

// Roles
address public operator;
address public agent;

// Caps (in USDC base units, 6 decimals)
uint256 public dailyCap;

// Per-counterparty cap: counterparty => dailyCap
mapping(address => uint256) public counterpartyCap;

// Per-action cap: keccak256(action string) => dailyCap
mapping(bytes32 => uint256) public actionCap;

// Allowlist (if enabled, only these counterparties may receive)
bool    public allowlistEnabled;
mapping(address => bool) public allowed;

// Rolling 24h windows — last reset timestamp + spent in current window
struct Window { uint64 windowStart; uint192 spent; }
Window public globalWindow;
mapping(address => Window) public counterpartyWindow;
mapping(bytes32 => Window) public actionWindow;

// State
bool public paused;
bool public revoked;
```

### 10.3 Events

```solidity
event SpendAttempted(
    address indexed agent,
    address indexed to,
    uint256 amount,
    bytes32 indexed action,
    string  reason,        // "ACCEPTED" or rejection reason
    uint256 remainingGlobalCap
);

event SpendAccepted(
    address indexed agent,
    address indexed to,
    uint256 amount,
    bytes32 indexed action,
    uint256 remainingGlobalCap
);

event ConfigChanged(string key, bytes32 indexed scope, uint256 value);
event Paused(address indexed by);
event Unpaused(address indexed by);
event Revoked(address indexed by);
event Swept(address indexed to, uint256 amount);
event OperatorTransferred(address indexed from, address indexed to);
event AgentRotated(address indexed from, address indexed to);
```

### 10.4 Errors

```solidity
error NotOperator();
error NotAgent();
error PausedError();
error RevokedError();
error CapExceeded();
error CounterpartyCapExceeded();
error ActionCapExceeded();
error CounterpartyBlocked();
error InsufficientBalance();
error ZeroAddress();
error ZeroAmount();
```

### 10.5 Core function — `spend`

```solidity
/// @notice The only spend surface. Agent calls this with explicit
///         counterparty, amount, and action tag. Reverts with a typed
///         error on rejection; emits SpendAttempted in all cases for
///         indexability of rejections too.
function spend(address to, uint256 amount, bytes32 action) external;
```

Pseudocode for the body:

```
require !paused
require !revoked
require msg.sender == agent
require to != 0
require amount > 0

if allowlistEnabled && !allowed[to]:
    emit SpendAttempted(..., reason="COUNTERPARTY_BLOCKED", ...)
    revert CounterpartyBlocked()

roll(globalWindow)
if globalWindow.spent + amount > dailyCap:
    emit SpendAttempted(..., reason="CAP_EXCEEDED", ...)
    revert CapExceeded()

if counterpartyCap[to] > 0:
    roll(counterpartyWindow[to])
    if counterpartyWindow[to].spent + amount > counterpartyCap[to]:
        emit SpendAttempted(..., reason="COUNTERPARTY_CAP_EXCEEDED", ...)
        revert CounterpartyCapExceeded()

if actionCap[action] > 0:
    roll(actionWindow[action])
    if actionWindow[action].spent + amount > actionCap[action]:
        emit SpendAttempted(..., reason="ACTION_CAP_EXCEEDED", ...)
        revert ActionCapExceeded()

if usdc.balanceOf(this) < amount:
    emit SpendAttempted(..., reason="INSUFFICIENT_BALANCE", ...)
    revert InsufficientBalance()

globalWindow.spent          += amount
counterpartyWindow[to].spent += amount  (if cap configured)
actionWindow[action].spent   += amount  (if cap configured)

usdc.safeTransfer(to, amount)

emit SpendAttempted(..., reason="ACCEPTED", ...)
emit SpendAccepted(...)
```

Note: rejected attempts are exposed through `SpendAttempted` as an off-chain event
**before** the revert. We MUST verify on the chosen Arc testnet that events emitted
in a reverted transaction are observable; if not, we shift rejection logging to a
companion `attempt(...)` view function called via `eth_call` from the SDK and a
single `spend()` that emits only on accept. ADR will record the decision.

### 10.6 Invariants (Foundry `invariant_*` tests)

- `inv_TotalSpentLeCap` — `globalWindow.spent ≤ dailyCap` whenever the window is
  unrolled.
- `inv_PauseBlocksSpend` — fuzz: while `paused == true`, every `spend()` reverts.
- `inv_RevokeIsTerminal` — once `revoked == true`, no path clears it; every
  `spend()` reverts.
- `inv_BalanceMatchesAccountingOrLower` — `usdc.balanceOf(this) ≥
dailyCap - globalWindow.spent` on the same windowed timeline (sanity check that
  accounting never claims more than is actually held).

### 10.7 Constructor parameters

```solidity
constructor(
    address _usdc,
    address _operator,
    address _agent,
    uint256 _dailyCap,
    bool    _allowlistEnabled
);
```

### 10.8 Out of scope for v0.1

- Multi-asset budgets.
- ERC-4337 / smart-account integration (agent calls EOA-style via the SDK signer).
- Weekly / monthly caps. (v0.2 candidate.)
- Time-of-day caps (e.g. "no spend after 6pm UTC"). (v0.2 candidate.)
- Spend approvals with on-chain operator co-sign. (Stage 12.)

---

## 11. SDK API Design

### 11.1 Install

```bash
pnpm add @sherpa/agent-budget
# or
npm i @sherpa/agent-budget@alpha
```

### 11.2 Construct a client

```ts
import { Budget } from '@sherpa/agent-budget';
import { privateKeyToAccount } from 'viem/accounts';

const budget = new Budget({
  network: 'arc-testnet',
  contract: '0x...AgentBudget...',
  signer: privateKeyToAccount(process.env.AGENT_KEY as `0x${string}`),
});
```

### 11.3 Spend

```ts
const result = await budget.spend({
  to: '0xCounterparty...',
  amount: 1_000_000n, // 1 USDC (6 decimals)
  action: 'tip', // freeform string, hashed on chain
});

if (result.ok) {
  // SpendReceipt
  console.log(result.txHash, result.remainingDailyCap);
} else {
  // SpendRejection (typed)
  switch (result.reason) {
    case 'CAP_EXCEEDED':
      /* back off until window rolls */ break;
    case 'COUNTERPARTY_BLOCKED':
      /* ask operator to allowlist */ break;
    case 'PAUSED':
      /* stop and notify operator */ break;
    case 'REVOKED':
      /* terminate agent */ break;
    /* ... */
  }
}
```

### 11.4 Simulate before spending

```ts
const sim = await budget.simulate({
  to: '0xCounterparty...',
  amount: 1_000_000n,
  action: 'tip',
});
// Same shape as spend(), but no transaction submitted.
```

### 11.5 Stream events

```ts
for await (const ev of budget.events({ fromBlock: 'latest' })) {
  // ev: SpendAttemptedEvent | SpendAcceptedEvent | ConfigChangedEvent
}
```

### 11.6 x402 fetch wrapper

```ts
import { createX402Fetch } from '@sherpa/agent-budget/x402';

const fetch402 = createX402Fetch({ budget });
const res = await fetch402('https://example.com/paid-endpoint');
// 402 challenge → SDK quotes amount → checks against budget → pays → retries
```

### 11.7 CLI

```bash
# Deploy a new budget
npx @sherpa/agent-budget deploy \
  --network arc-testnet \
  --cap 50 \
  --asset usdc \
  --operator $OPERATOR \
  --agent   $AGENT

# Top up
npx @sherpa/agent-budget top-up --contract 0x... --amount 100

# Pause / unpause / revoke
npx @sherpa/agent-budget pause   --contract 0x...
npx @sherpa/agent-budget unpause --contract 0x...
npx @sherpa/agent-budget revoke  --contract 0x...

# Read state
npx @sherpa/agent-budget state   --contract 0x...
```

---

## 12. Demo Agent & Dashboard

### 12.1 Demo agent

- Runs as `apps/agent-demo` (new app inside the monorepo).
- Node 20, TypeScript, single long-running process.
- Funded with **$50 USDC/day** on Arc testnet.
- Performs hourly paid calls against a public x402-priced endpoint of our choice
  (an internal Sherpa endpoint will be exposed under x402 for the demo so we never
  depend on third-party uptime).
- Tags each spend with action `x402.fetch`.
- Logs structured spend + rejection events to stdout for dashboard ingestion.

### 12.2 Public dashboard

- Lives at `apps/web/app/agents/page.tsx`.
- Server-rendered live event feed using viem `watchContractEvent`.
- Sections:
  - **Header**: contract address, network, daily cap, current spent, remaining.
  - **Live feed**: rolling list of latest 50 events with reasons.
  - **Counterparty breakdown**: tabular view of per-counterparty totals.
  - **Action breakdown**: tabular view of per-action totals.
  - **Rejection ledger**: filterable list of rejections + reasons.
- Honest empty states: if RPC drops, the page says so; we do not fabricate data.
- Public JSON API at `GET /api/agent-budget/state` for third-party indexing.

### 12.3 Composability demos

- **x402 demo**: a small script in `apps/agent-demo/x402-walkthrough.ts` showing
  the full HTTP 402 → quote → pay → retry loop, with the spend flowing through
  `AgentBudget` and showing up on the dashboard within one block.
- **Agent Hub demo**: the demo agent is registered in Agent Hub at sprint start;
  the registration metadata includes the `AgentBudget` contract address. A
  `apps/agent-demo/agent-hub-register.ts` script captures the registration.

---

## 13. Security Model & Threat Analysis

### 13.1 Trust assumptions

- The **operator key** is held off-chain and is the only key that can `pause`,
  `revoke`, `sweep`, or change caps. Compromise of the operator key is total loss
  for that budget; this is the same trust profile as any owner-controlled wallet.
- The **agent key** is the _only_ key the agent runtime needs. Compromise of the
  agent key is bounded by the cap and the allowlist.
- USDC on Arc testnet is trusted as the underlying asset; we do not introspect its
  internals.

### 13.2 Threats and mitigations

| #   | Threat                                                                   | Mitigation                                                                                    |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| T1  | Compromised agent attempts to drain the budget                           | Daily cap + per-counterparty cap + allowlist mode + operator pause                            |
| T2  | Reentrancy through USDC transfer hook                                    | USDC is a non-reentrant ERC-20; we additionally guard `spend()` with `nonReentrant` modifier  |
| T3  | Operator front-runs revoke after agent sends `spend()`                   | Acceptable — operator's role is supreme; this is governance, not adversarial                  |
| T4  | Window-rolling exploit at second-boundary to double-spend                | Window roll only resets `spent = 0` when `block.timestamp >= windowStart + 24h`; monotonic    |
| T5  | Integer overflow on cumulative spent                                     | `uint192` for spent; cap < 2^192; checked math via Solidity 0.8.x                             |
| T6  | DoS via flooding `spend()` with rejections to inflate gas costs to agent | Rejections revert early and cheaply; gas is the agent's own cost, no shared-resource impact   |
| T7  | Fake dashboard data confuses an auditor                                  | Dashboard reads only from on-chain events; no app-layer overrides; Sherpa's no-fake-data rule |

### 13.3 Static analysis

- `slither packages/contracts/src/agent/AgentBudget.sol` MUST produce 0 high / 0
  critical findings before merge.
- `forge test -vv` MUST pass.
- `forge coverage` MUST report ≥ 95% lines on `AgentBudget`.

---

## 14. Sprint Plan — May 25 – 31

> Working calendar: **Mon 2026-05-25 through Sun 2026-05-31**.
> Solo engineer. Hours are nominal; sequence matters more than wall clock.

### Day 1 — Mon 2026-05-25 — Scaffold + spec

- [ ] Land this PRD in `docs/sherpa/specs/` and open a PR for visibility.
- [ ] Land matching ADR `docs/sherpa/decisions/2026-05-25-agent-budget-on-arc.md`.
- [ ] Add `packages/contracts/src/agent/AgentBudget.sol` skeleton (storage, roles,
      events, errors). No logic yet.
- [ ] Add Foundry test scaffold `packages/contracts/test/agent/AgentBudget.t.sol`.
- [ ] Add Arc testnet RPC + chain config to `packages/config`.

### Day 2 — Tue 2026-05-26 — Contract core

- [ ] Implement `spend()` with global cap only. Window-roll logic + tests.
- [ ] Implement `pause` / `unpause` / `revoke` / `sweep` + tests.
- [ ] Implement `topUp` (or accept direct ERC-20 transfers) + tests.

### Day 3 — Wed 2026-05-27 — Per-counterparty + per-action caps + allowlist

- [ ] Implement per-counterparty cap accounting + tests.
- [ ] Implement per-action cap accounting + tests.
- [ ] Implement allowlist mode + tests.
- [ ] Add Foundry invariants `inv_TotalSpentLeCap`, `inv_PauseBlocksSpend`,
      `inv_RevokeIsTerminal`.
- [ ] Run `slither` and resolve any findings.

### Day 4 — Thu 2026-05-28 — Deploy + verify on Arc testnet

- [ ] Foundry deploy script for Arc testnet.
- [ ] Deploy + verify on Arc testnet block explorer.
- [ ] Record addresses in `deployments/arc-testnet.json`.
- [ ] Hand-fund the live demo budget with test USDC and run a manual `spend()`
      end-to-end via `cast`.

### Day 5 — Fri 2026-05-29 — SDK + CLI

- [ ] Scaffold `packages/agent-budget` (TS, Vitest, exports map).
- [ ] Implement `Budget.spend / simulate / state / events`.
- [ ] Implement typed `SpendReceipt` / `SpendRejection` unions.
- [ ] Implement CLI (`deploy / top-up / pause / unpause / revoke / state`).
- [ ] Vitest suites: unit + integration against a forked Arc testnet (or live
      testnet with low-value spends).
- [ ] Publish `@sherpa/agent-budget@0.1.0-alpha` to npm.

### Day 6 — Sat 2026-05-30 — Demo agent + dashboard + x402

- [ ] Scaffold `apps/agent-demo`. Wire the SDK. Hourly x402 paid call.
- [ ] Implement `@sherpa/agent-budget/x402` subpath export. Validate end-to-end.
- [ ] Register the demo agent in Agent Hub with the budget contract as metadata.
- [ ] Build `apps/web/app/agents/page.tsx` dashboard with live event stream.
- [ ] Add `GET /api/agent-budget/state` to `apps/api`.

### Day 7 — Sun 2026-05-31 — Harden + ship

- [ ] Final pass: typecheck, build, test across the workspace (`pnpm -r ...`).
- [ ] Slither clean run; coverage ≥ 95%.
- [ ] Write `docs/sherpa/launch/2026-05-31-agent-spend-manager-alpha.md`.
- [ ] Public announcement post (link to dashboard + repo).
- [ ] Open a `feat: agent spend manager on Arc (Stage 11)` PR and merge after CI.

---

## 15. Success Metrics

### 15.1 Sprint exit criteria (must-pass)

- [ ] `AgentBudget` deployed and **verified** on Arc testnet.
- [ ] `@sherpa/agent-budget@0.1.0-alpha` published on npm and `pnpm i` works
      cleanly into a fresh project.
- [ ] Public dashboard reachable and streaming **real** Arc-testnet events.
- [ ] At least 24 consecutive hours of demo-agent operation under the $50/day cap
      with no operator intervention.
- [ ] One working x402 end-to-end demo (request → 402 → pay → 200).
- [ ] Demo agent registered in Agent Hub with budget contract metadata.
- [ ] Slither: 0 high / 0 critical. Coverage ≥ 95%.
- [ ] No safety-ring regression in existing Sherpa code; PR gates green.

### 15.2 Quality metrics

- Contract size ≤ 24 KB (EIP-170 ceiling, comfortable headroom).
- p50 SDK `spend()` end-to-end latency ≤ 4s on Arc testnet.
- Median gas per accepted `spend()` ≤ 150k.
- SDK bundle size (min+gz, ESM) ≤ 30 KB excluding viem.

### 15.3 Adoption signals (post-sprint, not gating)

- ≥ 1 external developer cloning the SDK in week 1 after launch.
- ≥ 1 external x402 endpoint observably paid via an `AgentBudget` instance.
- Dashboard public URL referenced in ≥ 1 external write-up.

---

## 16. Risks & Mitigations

| Risk                                                        | Likelihood | Impact | Mitigation                                                                                                   |
| ----------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Arc testnet instability or unverified contract support      | Med        | High   | Pre-flight on Day 1: validate testnet RPC, faucet, explorer verify. If blocked, fall back to Base Sepolia.   |
| USDC on Arc testnet has nonstandard ERC-20 quirks           | Low        | High   | Wrap transfers in `SafeERC20`; pre-test direct transfers in Foundry against a forked Arc state.              |
| x402 endpoints unstable                                     | Med        | Med    | Self-host a tiny x402-priced echo endpoint in `apps/api` for the demo path; document the route.              |
| Agent Hub registration API not finalised                    | Med        | Med    | Capture registration as a script; if API is closed, ship a static JSON manifest in `deployments/`.           |
| Slither flags a high finding late                           | Med        | High   | Run Slither on Day 2; treat any high finding as a P0 immediately, even if it cuts scope.                     |
| Event emission on reverted txs not observable on Arc        | Med        | Med    | Section 10.5 fallback: split into `attempt()` (view) + `spend()` (emit only on accept). ADR captures choice. |
| Solo developer fatigue across 7 straight days               | High       | Med    | Each day has a single hard deliverable; ship-on-Friday SDK alpha means cap-set is provable by mid-sprint.    |
| Public dashboard scrutiny finds an honesty bug (fake state) | Low        | High   | Dashboard reads only from on-chain events; CI step asserts there are no hardcoded balances in `agents/`.     |

---

## 17. Open Questions

1. **OQ-1.** Does Arc testnet's block explorer support contract verification today
   via Foundry's `--verify` flag? If not, we ship a manual verify recipe in
   `docs/sherpa/setup/`.
2. **OQ-2.** Is there a canonical USDC contract address on Arc testnet that Circle
   has published, or do we deploy a stub for the sprint? (Default: use Circle's
   canonical address if available; else stub, and call it out clearly in the
   dashboard.)
3. **OQ-3.** Does Agent Hub require a signed registration or accept open
   metadata? Day-6 task depends on this.
4. **OQ-4.** Do we want a `permit2`-style off-chain approval flow for top-ups, or
   stay with plain `transfer` for v0.1? Default: plain `transfer` for v0.1.
5. **OQ-5.** Should the SDK ship a Python binding this sprint? Default: no — TS
   only for v0.1, Python in Stage 12.
6. **OQ-6.** Should `spend()` accept an arbitrary `bytes memo` field for richer
   audit context? Default: no — keep v0.1 minimal; revisit in v0.2.

---

## 18. Out of Scope (this sprint)

- Mainnet deployment of `AgentBudget` on Arc.
- Multi-asset budgets (only USDC).
- CCTP cross-chain spend.
- ERC-4337 / smart-account integration.
- Operator UI for cap configuration beyond CLI + JSON.
- Python / Go / Rust SDK bindings.
- Formal verification.
- Replacing or migrating `SherpaRouter` on Base. Stage 11 is purely additive.

---

## 19. Glossary

- **Agent.** An autonomous software process that can take actions, including
  spending money.
- **Operator.** The human (or organization) responsible for an agent, holding the
  master key.
- **Arc.** Circle's USDC-native L1 blockchain.
- **Arc testnet.** The public test environment for Arc; used for this sprint.
- **USDC.** Circle's stablecoin. The single asset supported by `AgentBudget` v0.1.
- **Cap.** A maximum cumulative spend over a rolling 24h window.
- **Counterparty cap.** A cap scoped to a specific recipient address.
- **Action cap.** A cap scoped to a hashed action tag (e.g. `keccak256("tip")`).
- **Allowlist mode.** Optional flag; when on, only allowlisted counterparties may
  receive.
- **x402 Nanopayments.** HTTP 402-based micropayment protocol enabling
  pay-per-request flows.
- **Agent Hub.** Sherpa's registry of agents, with metadata including their spend
  profile and budget contract.
- **Safety rings.** Sherpa's preflight pipeline; the Stage 11 contract is the
  on-chain counterpart to those off-chain rings.

---

## 20. References

- Sherpa README: [`README.md`](../../../README.md)
- Sherpa AI Agent ADR (Stage 9):
  [`docs/sherpa/decisions/2026-05-15-ai-agent-stage-9.md`](../decisions/2026-05-15-ai-agent-stage-9.md)
- Sherpa Spend Cap (Postgres) ADR:
  [`docs/sherpa/decisions/2026-05-13-postgres-spend-cap.md`](../decisions/2026-05-13-postgres-spend-cap.md)
- Sherpa Security Policy: [`SECURITY.md`](../../../SECURITY.md)
- Contributing guide: [`CONTRIBUTING.md`](../../../CONTRIBUTING.md)

---

## 21. Appendix — Status Tracker

| Deliverable                                           | Owner  | Status  |
| ----------------------------------------------------- | ------ | ------- |
| `AgentBudget.sol` on Arc testnet (verified)           | gnanam | Pending |
| `@sherpa/agent-budget@0.1.0-alpha` on npm             | gnanam | Pending |
| `apps/agent-demo` running 24h+ under $50/day cap      | gnanam | Pending |
| Public dashboard at `agents.sherpa.so` (or equiv)     | gnanam | Pending |
| x402 end-to-end demo                                  | gnanam | Pending |
| Agent Hub registration                                | gnanam | Pending |
| Slither + Foundry coverage gates                      | gnanam | Pending |
| ADR `2026-05-25-agent-budget-on-arc.md`               | gnanam | Pending |
| Launch note `2026-05-31-agent-spend-manager-alpha.md` | gnanam | Pending |
