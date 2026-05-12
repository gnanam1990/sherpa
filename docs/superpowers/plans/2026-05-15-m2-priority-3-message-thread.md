# M2 Priority 3 Message Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a chat-style message thread with persisted history reads and in-session action tracking.

**Architecture:** Add focused UI primitives in `@sherpa/ui`, add `useChatHistory` in apps/web to own history fetching and in-memory session messages, and integrate the thread into the existing `Prompt` workspace. Existing M3 history routes are read-only from this PR; missing message persistence is documented for M3.

**Tech Stack:** React 19, Next.js 15 app router, Tailwind CSS, Vitest, Testing Library, wagmi/RainbowKit, existing Sherpa Fastify API contracts.

---

### Task 1: Message UI Components

**Files:**

- Create: `packages/ui/src/MessageBubble.tsx`
- Create: `packages/ui/src/MessageThread.tsx`
- Create: `packages/ui/src/MessageBubble.test.tsx`
- Create: `packages/ui/src/MessageThread.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write failing MessageBubble tests**

Cover user alignment/Base blue, Sherpa alignment/dark surface, relative timestamps, thinking dots, compact action summary, Basescan link, inline expansion with full `ConfirmationCard`, and 375px snapshot.

Run: `pnpm --filter @sherpa/ui test -- MessageBubble.test.tsx`

Expected: FAIL because `MessageBubble.tsx` does not exist.

- [ ] **Step 2: Implement MessageBubble**

Create types `ChatMessage`, `MessageContent`, and `ActionSummary`. Use Tailwind only, `min-h-11` touch targets, no inline styles, and local expanded state keyed by mounted message ID.

- [ ] **Step 3: Write failing MessageThread tests**

Cover chronological rendering, empty state, loading skeletons, auto-scroll at bottom, no auto-scroll after manual scroll up by more than 100px, jump pill behavior, load older control, and 375px snapshot.

Run: `pnpm --filter @sherpa/ui test -- MessageThread.test.tsx`

Expected: FAIL until `MessageThread.tsx` exists.

- [ ] **Step 4: Implement MessageThread**

Render a `flex-1 min-h-0 overflow-y-auto` list, sort messages by timestamp, preserve manual reading position, and show `↓ New messages` when a new message arrives while user is scrolled up.

- [ ] **Step 5: Export and run UI tests**

Update `packages/ui/src/index.ts` to export the new modules.

Run: `pnpm --filter @sherpa/ui test -- MessageBubble.test.tsx MessageThread.test.tsx`

Expected: PASS.

### Task 2: History Hook

**Files:**

- Create: `apps/web/hooks/useChatHistory.ts`
- Create: `apps/web/hooks/useChatHistory.test.tsx`
- Create: `docs/sherpa/devlog/2026-05-15-m2-week-1-priority-3.md`

- [ ] **Step 1: Write failing hook tests**

Cover `GET /api/history/:addr?limit=50`, mapping `HistoryItem[]` to Sherpa action messages, server/client timestamp sources, per-address cache, `addMessage`, `updateMessage`, `loadOlder` using `?limit=200`, no POST attempt, and error state.

Run: `pnpm --filter @sherpa/web test -- hooks/useChatHistory.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 2: Implement useChatHistory**

Use React state/ref cache only. Map `direction: out` to `Sent`, `in` to `Received`, and `self` to `Moved`. Use server timestamps from history items and client timestamps for session messages.

- [ ] **Step 3: Write devlog**

Document current GET shape, frontend inference, missing POST message persistence, and paymaster proxy limitation.

- [ ] **Step 4: Run hook tests**

Run: `pnpm --filter @sherpa/web test -- hooks/useChatHistory.test.tsx`

Expected: PASS.

### Task 3: Prompt Thread Integration

**Files:**

- Modify: `apps/web/app/_components/Prompt.tsx`
- Modify: `apps/web/app/_components/Prompt.test.tsx`
- Modify: `apps/web/app/_components/HomeContent.tsx`
- Modify: `apps/web/app/_components/HomeContent.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Cover immediate user bubble, thinking bubble while parse is pending, replacement with ConfirmationCard, action summary success/failure updates, GET history on wallet connect via hook, and no Prompt button spinner.

Run: `pnpm --filter @sherpa/web test -- app/_components/Prompt.test.tsx app/_components/HomeContent.test.tsx`

Expected: FAIL until integration is implemented.

- [ ] **Step 2: Integrate thread in Prompt**

Use `useChatHistory(userAddress)` inside Prompt. Render `MessageThread` above the prompt input and convert parse/execute/poll state transitions into message updates. Keep wallet connection state outside the hook.

- [ ] **Step 3: Update HomeContent layout**

Use `min-h-[100dvh]`, compact header, and a `flex-1 min-h-0` Prompt workspace. Remove the old direct history fetch because `useChatHistory` owns history.

- [ ] **Step 4: Run integration tests**

Run: `pnpm --filter @sherpa/web test -- app/_components/Prompt.test.tsx app/_components/HomeContent.test.tsx`

Expected: PASS.

### Task 4: Verification And PR

**Files:**

- Modify: `docs/sherpa/devlog/2026-05-15-m2-week-1-priority-3.md` if verification reveals contract notes.

- [ ] **Step 1: Run package coverage**

Run:

```bash
pnpm --filter @sherpa/ui test -- --coverage
pnpm --filter @sherpa/web test -- --coverage
```

Expected: UI stays above 70% statements; web stays above 60% statements.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter=@sherpa/web dev
```

Expected: all pass; dev server returns HTTP 200.

- [ ] **Step 3: Commit and open PR**

Commit with `feat(m2): add chat history thread`. Open PR with:

```bash
gh pr create --base main --title "feat(m2): add chat history thread" --body "..."
```

Stop after the PR opens.
