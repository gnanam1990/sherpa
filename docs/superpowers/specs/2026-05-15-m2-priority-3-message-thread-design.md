# M2 Priority 3 Message Thread Design

## Context

Priority 3 turns Sherpa from a prompt-plus-card surface into a chat-style transaction workspace with persisted history reads. Baseline on `feat/m2-week-1-priority-3` is clean: frozen install, typecheck, lint, test, and Next dev render pass. The current M3 contract exposes `GET /api/history/:addr?limit=N` returning `{ address, chain, items: HistoryItem[] }`; no `POST /api/history/:addr/messages` exists on main.

## Chosen Approach

Use a dashboard-chat layout: the message thread is the operational log, and the prompt is a fixed bottom command bar. The thread becomes the single visible source of truth for user prompts, Sherpa thinking, confirmation cards, action status, and mapped server history.

New UI modules:

- `packages/ui/src/MessageBubble.tsx` renders user and Sherpa bubbles, relative timestamps, thinking dots, full confirmation cards, and compact action summaries that expand inline.
- `packages/ui/src/MessageThread.tsx` renders chronological bubbles, empty/loading states, bottom-aware auto-scroll, manual-scroll preservation, a `New messages` jump pill, and a `Load older messages` control.

New web hook:

- `apps/web/hooks/useChatHistory.ts` fetches `GET /api/history/:address?limit=50`, maps `HistoryItem[]` to compact Sherpa action messages, caches per address in React state, appends in-session messages in memory, and exposes `addMessage`, `updateMessage`, and `loadOlder`.

## Message Model

Messages use client-side IDs and explicit timestamp source:

```ts
type Message = {
  id: string;
  role: 'user' | 'sherpa';
  timestamp: number;
  timestampSource: 'server' | 'client';
  content:
    | { kind: 'text'; text: string }
    | { kind: 'thinking' }
    | { kind: 'confirmation'; card: SerializedConfirmationCardProps; sourceInput: string }
    | { kind: 'action'; summary: ActionSummary; card?: SerializedConfirmationCardProps };
};
```

Server timestamps are used when history items provide them. In-session messages use `Date.now()` and `timestampSource: 'client'`. If M3 later accepts message POSTs and returns server timestamps, the hook can update source to `server` without changing UI components.

## Flow

When a connected user submits text:

- Add a right-aligned user bubble immediately.
- Add a left-aligned Sherpa thinking bubble with animated three-dot indicator.
- Call `POST /api/parse`.
- Replace the thinking bubble with a full `ConfirmationCard` when parse returns a card.
- On Proceed, replace the card bubble with a compact pending action summary.
- Execute through existing `/api/execute`, wallet send, and P2 confirmation polling.
- Update the action bubble to success or failure. Failed transactions remain visible in the thread.

Compact action summaries are tappable. Each message manages its own expanded state, so multiple summaries can be expanded at once. Expanded state renders the full `ConfirmationCard` inline; no modal is used.

## History Loading

Initial load is `GET /api/history/:addr?limit=50`. If exactly 50 items are returned, the thread shows `Load older messages` at the top. Tapping it fetches `?limit=200` and replaces the server-history segment while preserving in-session messages. No infinite scroll or cursor pagination ships in P3.

## M3 Follow-Ups

P3 documents, but does not implement, these M3 items:

- M3 to add (post Stage 1): either `GET /api/history/:addr/messages` returning `Message[]` directly, or extend `HistoryItem` with `messageType`. P3 ships with frontend inference logic from the current `HistoryItem` shape.
- M3 to add: `POST /api/history/:addr/messages` for appending new in-session messages. P3 stores in-memory only; messages do not persist across reconnects today.
- The paymaster proxy limitation from P2 still applies: sponsored on-chain sends can fail until `/api/paymaster` ships, but the chat thread records both successes and failures.

## Tests

TDD coverage will include:

- MessageThread chronological order, empty state, loading skeleton, auto-scroll at bottom, manual-scroll preservation, jump-to-bottom pill, load older control, mobile snapshot.
- MessageBubble user/Sherpa alignment, relative timestamps, thinking dots, compact action summary, independent inline expansion, Basescan link.
- useChatHistory fetch/mapping/cache/loadOlder/in-memory add/update and no POST behavior while M3 route is absent.
- Prompt/HomeContent integration: user bubble + thinking bubble, thinking replacement by ConfirmationCard, action summary updates for success/failure.
