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
 * Sherpa Base MCP skill (Mode A) — Sherpa actions as AgentKit ActionProviders.
 * See SKILL.md for the skill spec and the mandatory security contract.
 */

export { createSherpaActions } from './actions.js';
export { createSherpaActionProviders, type CustomActionProviderFactory } from './provider.js';
export type {
  WalletAddressProvider,
  SherpaActionContext,
  SherpaActionConfig,
  SherpaActionResult,
} from './types.js';
