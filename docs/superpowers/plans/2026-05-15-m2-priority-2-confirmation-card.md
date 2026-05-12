# M2 Priority 2 Confirmation Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the ConfirmationCard end-to-end flow for M2 Priority 2.

**Architecture:** Split the shared UI card into a focused `ConfirmationCard.tsx`, keep `Prompt.tsx` as the flow orchestrator, and isolate confirmation polling in `useExecuteConfirm.ts`. M2 will use current M3 `/api/parse` and `/api/execute` contracts and document missing M3 read-status/paymaster pieces in the devlog.

**Tech Stack:** React 19, Next.js 15 app router, Tailwind CSS, Vitest, Testing Library, wagmi/RainbowKit, `@sherpa/core` serialized card shapes.

---

### Task 1: Split Confirmation Card UI

**Files:**

- Create: `packages/ui/src/ConfirmationCard.tsx`
- Modify: `packages/ui/src/components.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/ConfirmationCard.test.tsx`
- Test: `packages/ui/src/components.test.tsx`

- [ ] **Step 1: Write failing UI variant tests**

Create `packages/ui/src/ConfirmationCard.test.tsx` with render tests for SEND, BUY, BET, BALANCE, HISTORY, sponsored badge, risk badge, success card, failure card, action buttons, and the 375px mobile snapshot.

Run: `pnpm --filter @sherpa/ui test -- ConfirmationCard.test.tsx`

Expected: FAIL because `./ConfirmationCard.js` does not exist.

- [ ] **Step 2: Move card types and component**

Create `packages/ui/src/ConfirmationCard.tsx` exporting:

```tsx
'use client';

export type SerializedRiskIndicator =
  | string
  | { level?: 'info' | 'warning' | 'danger'; label: string; detail?: string };

export type SerializedStep = {
  kind: string;
  to: string;
  data: string;
  value: string;
  label: string;
};

export type SerializedSendCallsEnvelope = {
  version: '1.0';
  chainId: string;
  calls: Array<{ to: string; data: string; value: string }>;
  capabilities?: { paymasterService?: { url: string } };
};

export type SerializedConfirmationCardProps = {
  intent: string;
  primary_action_label: string;
  primary_amount_display: string;
  secondary_amount_display?: string;
  recipient_display?: string;
  recipient_metadata?: Record<string, unknown>;
  risk_indicators?: SerializedRiskIndicator[];
  steps: SerializedStep[];
  batch?: SerializedSendCallsEnvelope;
  redirect_url?: string;
  gas_display: string;
  warnings: string[];
  estimated_completion_ms: number;
};
```

Implement Tailwind-only `ConfirmationCard`, `RiskBadge`, `SponsoredBadge`, `ExecutionPendingCard`, `ExecutionSuccessCard`, `ExecutionFailureCard`, and `formatExecutionError` in the same file.

- [ ] **Step 3: Reduce `components.tsx` to Shell**

Remove inline styles and card exports from `packages/ui/src/components.tsx`. Keep `Shell` with Tailwind classes only.

- [ ] **Step 4: Update exports**

Update `packages/ui/src/index.ts`:

```ts
export * from './tokens.js';
export * from './ConnectButton.js';
export * from './ConfirmationCard.js';
export * from './components.js';
```

- [ ] **Step 5: Run UI tests**

Run: `pnpm --filter @sherpa/ui test -- ConfirmationCard.test.tsx components.test.tsx`

Expected: PASS.

### Task 2: Add Polling Hook

**Files:**

- Create: `apps/web/app/_components/useExecuteConfirm.ts`
- Test: `apps/web/app/_components/useExecuteConfirm.test.tsx`

- [ ] **Step 1: Write failing polling tests**

Create tests using fake timers for:

- delay sequence: 1s -> 2s -> 3s -> 5s -> 5s
- 0-30s message: `Confirming...`
- 30-60s message: `Still waiting... (longer than usual)`
- 60s timeout with `Refresh to check status`
- success with tx hash
- failure with `error_detail`

Run: `pnpm --filter @sherpa/web test -- app/_components/useExecuteConfirm.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 2: Implement hook**

Create `useExecuteConfirm.ts` exporting `useExecuteConfirm`, `CONFIRM_POLL_DELAYS_MS`, `formatConfirmMessage`, and status types. Use `fetch('/api/execute/${auditLogId}/confirm')` for the status read and document in the devlog that M3 must add this read/status contract.

- [ ] **Step 3: Run hook tests**

Run: `pnpm --filter @sherpa/web test -- app/_components/useExecuteConfirm.test.tsx`

Expected: PASS.

### Task 3: Wire Prompt End-To-End

**Files:**

- Modify: `apps/web/app/_components/Prompt.tsx`
- Modify: `apps/web/app/_components/Prompt.test.tsx`

- [ ] **Step 1: Write failing Prompt E2E tests**

Update tests to use the real `ConfirmationCard` and smart fetch mocks. Verify request shape for:

```json
{ "input": "send 5 usdc to ...", "userKey": "0x..." }
```

and

```json
{ "input": "send 5 usdc to ...", "userAddress": "0x..." }
```

Test parse -> render -> Proceed -> execute -> `sendSponsoredCallsAsync` -> confirm poll -> success card. Add failure tests for wallet rejection and confirm status failure.

Run: `pnpm --filter @sherpa/web test -- app/_components/Prompt.test.tsx`

Expected: FAIL until `Prompt.tsx` uses the new flow.

- [ ] **Step 2: Implement Prompt state machine**

In `Prompt.tsx`, track `parsed`, `phase`, `failure`, `success`, and `originalActionDescription`. Replace the confirmation card with pending/success/failure cards after Proceed. Implement:

- `handleProceed()` posts `/api/execute`, submits `wallet_sendCalls` when `batch` exists, then starts `useExecuteConfirm` polling.
- `handleSendAnother()` clears input, parsed card, execution state, and focuses the input.
- `handleEditAndRetry()` keeps input, clears failure, and focuses the input.
- `handleTryAgain()` re-runs execute with the same input and wallet params.
- `handleCancel()` clears the current card and execution state.

- [ ] **Step 3: Run Prompt tests**

Run: `pnpm --filter @sherpa/web test -- app/_components/Prompt.test.tsx`

Expected: PASS.

### Task 4: Contract Types And Coverage Gates

**Files:**

- Modify: `packages/core/src/types.ts`
- Modify: `packages/ui/vitest.config.ts`
- Modify: `apps/web/vitest.config.ts`

- [ ] **Step 1: Add failing type/coverage expectations**

Run coverage before thresholds:

```bash
pnpm --filter @sherpa/ui test -- --coverage
pnpm --filter @sherpa/web test -- --coverage
```

Expected: coverage reports exist; thresholds are not enforced yet.

- [ ] **Step 2: Add optional risk indicators to core type**

Update `ConfirmationCardProps` with optional:

```ts
risk_indicators?: Array<string | { level?: 'info' | 'warning' | 'danger'; label: string; detail?: string }>;
```

This preserves current M3 responses while letting M2 render future risk data.

- [ ] **Step 3: Enforce coverage thresholds**

Set Vitest coverage thresholds:

- `packages/ui/vitest.config.ts`: `statements: 70`
- `apps/web/vitest.config.ts`: `statements: 60`

- [ ] **Step 4: Run coverage**

Run:

```bash
pnpm --filter @sherpa/ui test -- --coverage
pnpm --filter @sherpa/web test -- --coverage
```

Expected: PASS and thresholds met.

### Task 5: Devlog And Final Verification

**Files:**

- Create: `docs/sherpa/devlog/2026-05-15-m2-week-1-priority-2.md`

- [ ] **Step 1: Write devlog**

Document shipped UI, polling behavior, `/api/paymaster` limitation, and M3 follow-ups: status polling read endpoint, `error_detail`, `txHash`, and `risk_indicators` population.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @sherpa/ui test -- --coverage
pnpm --filter @sherpa/web test -- --coverage
pnpm --filter=@sherpa/web dev
```

Expected: all commands pass; dev server returns HTTP 200 at `localhost:3100`.

- [ ] **Step 3: Commit and open PR**

Commit with message:

```bash
git commit -m "feat(m2): wire confirmation card flow"
```

Open PR:

```bash
gh pr create --base main --title "feat(m2): wire confirmation card flow" --body "..."
```

Stop after the PR opens.
