/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Types for the Sherpa Base MCP skill (Mode A).
 *
 * Sherpa actions are exported as plain `{ name, description, schema, invoke }`
 * configs that are *structurally* what Coinbase AgentKit's `customActionProvider`
 * consumes. The host MCP app supplies the heavy `@coinbase/agentkit` /
 * `@coinbase/agentkit-model-context-protocol` packages and calls
 * `customActionProvider(createSherpaActions(ctx))` — so this package stays lean and
 * never pulls AgentKit's wallet/CDP/Solana dependency tree (which would conflict
 * with the repo's viem and widen the untrusted surface — see SKILL.md §Security).
 */

import type { ZodTypeAny } from 'zod';
import type { ExecutorDeps, ExecutionStep, Intent, SendCallsEnvelope } from '@sherpa/core';

/**
 * Minimal structural view of an AgentKit `WalletProvider`. We only ever read the
 * connected account's address from it — the user's identity comes from the wallet,
 * never from model/tool input.
 */
export interface WalletAddressProvider {
  getAddress(): string | Promise<string>;
}

/**
 * Server-owned planning context. Holds the SherpaRouter address, protocol
 * addresses and network flags. This is set by the Sherpa operator, NOT by model
 * or tool input — so a prompt can never widen the allowlist, raise caps, change
 * the router, or flip the network. `userAddress` is intentionally omitted: it is
 * read from the connected wallet at invoke time.
 */
export type SherpaActionContext = {
  executorDeps: Omit<ExecutorDeps, 'userAddress'>;
};

/**
 * A Sherpa MCP action. Shape-compatible with AgentKit's `customActionProvider`
 * action config. `invoke` ALWAYS returns a JSON string (an unsigned confirmation
 * or a refusal) — never a signed transaction, and it never submits anything.
 */
export type SherpaActionConfig<TArgs = unknown> = {
  name: string;
  description: string;
  schema: ZodTypeAny;
  invoke: (walletProvider: WalletAddressProvider, args: TArgs) => Promise<string>;
};

/** Unsigned, non-executed result returned by every Sherpa MCP action. */
export type SherpaActionResult =
  | {
      ok: true;
      action: string;
      /** Hard invariants surfaced to the client: the human still signs. */
      signed: false;
      autoExecuted: false;
      rings: 'passed';
      intent: Intent;
      /** The unsigned calls for the Base Account to review and sign. */
      unsignedTx: { steps: ExecutionStep[]; batch?: SendCallsEnvelope };
      confirmation: {
        label: string;
        primaryAmount: string;
        warnings?: string[];
      };
    }
  | {
      ok: false;
      action: string;
      error: string;
      errorCode?: string;
      /** 'failed' when a safety ring rejected it; 'n/a' for other refusals. */
      rings: 'failed' | 'n/a';
    };
