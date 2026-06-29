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
 * Bridge Sherpa MCP actions into Coinbase AgentKit without taking a hard
 * dependency on `@coinbase/agentkit` (which pins a divergent viem and pulls a
 * large wallet/CDP/Solana tree — see SKILL.md §Security). The host MCP app
 * injects AgentKit's `customActionProvider` factory.
 *
 * Host wiring (in the MCP app, which owns the AgentKit packages):
 *
 *   import { AgentKit, customActionProvider } from '@coinbase/agentkit';
 *   import { getMcpTools } from '@coinbase/agentkit-model-context-protocol';
 *   import { createSherpaActionProviders } from '@sherpa/agentkit';
 *
 *   const provider = createSherpaActionProviders(customActionProvider, ctx);
 *   const agentKit = await AgentKit.from({ walletProvider, actionProviders: [provider] });
 *   const { tools, toolHandler } = await getMcpTools(agentKit);
 *   // wire tools/toolHandler into an @modelcontextprotocol/sdk Server.
 */

import { createSherpaActions } from './actions.js';
import type { SherpaActionConfig, SherpaActionContext } from './types.js';

/** Structural type of AgentKit's `customActionProvider` factory. */
export type CustomActionProviderFactory<TProvider = unknown> = (
  configs: SherpaActionConfig[],
) => TProvider;

/**
 * Build a single AgentKit ActionProvider exposing all Sherpa MCP actions.
 *
 * @param customActionProvider AgentKit's `customActionProvider` (injected by host).
 * @param ctx server-owned planning context.
 */
export function createSherpaActionProviders<TProvider>(
  customActionProvider: CustomActionProviderFactory<TProvider>,
  ctx: SherpaActionContext,
): TProvider {
  return customActionProvider(createSherpaActions(ctx));
}
