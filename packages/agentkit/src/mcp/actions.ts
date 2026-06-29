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
 * Sherpa Base MCP skill — action definitions (Mode A).
 *
 * Each action runs the EXISTING Sherpa pipeline: build a ParsedIntent → `plan()`
 * (which runs the 7-ring preflight and, on mainnet, routes through the audited
 * SherpaRouter) → return an UNSIGNED confirmation for the Base Account to sign.
 *
 * Security contract (enforced here; see SKILL.md):
 *  1. No auto-execution — we only ever call `plan()`, which builds calldata and
 *     never submits. Results are unsigned.
 *  2. No guard bypass from input — model/tool args feed only the zod schema
 *     (amount/asset). The router, allowlist, caps and network come from the
 *     server-owned context; the account comes from the connected wallet.
 *  3. Mainnet stays fail-closed — `plan()` refuses when the router/network is
 *     unconfigured, and the 7 rings reject unlisted tokens / over-cap amounts.
 *  4. No server key material — nothing here signs or holds keys.
 *  5. Tool/onchain strings are data — args are validated, never executed.
 */

import { z } from 'zod';
import { plan, type ParsedIntent, type PlanResult } from '@sherpa/core';
import type {
  SherpaActionConfig,
  SherpaActionContext,
  SherpaActionResult,
  WalletAddressProvider,
} from './types.js';

// Input hardening: amounts are positive decimal strings, assets are short symbols.
const amountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'amount must be a positive decimal string')
  .refine((v) => Number(v) > 0, 'amount must be greater than zero');
const assetSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{1,12}$/, 'asset must be a token symbol (1-12 alphanumerics)');

function toJson(result: SherpaActionResult): string {
  // The unsigned tx carries bigint values (step value, batch call values). JSON
  // (and therefore MCP tool output) cannot hold bigint — serialize them as
  // decimal strings so the client can reconstruct the values before signing.
  return JSON.stringify(result, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
}

/** Map a PlanResult (which already ran the 7 rings) to an unsigned MCP result. */
function planResultToActionResult(action: string, result: PlanResult): SherpaActionResult {
  if (!result.ok) {
    return {
      ok: false,
      action,
      error: result.error,
      errorCode: result.errorCode,
      // plan()/runRings formats ring failures as "safety ringN_… failed: …".
      rings: /ring\d/.test(result.error) ? 'failed' : 'n/a',
    };
  }
  const card = result.card;
  return {
    ok: true,
    action,
    signed: false,
    autoExecuted: false,
    rings: 'passed',
    intent: card.intent,
    unsignedTx: { steps: card.steps, batch: card.batch },
    confirmation: {
      label: card.primary_action_label,
      primaryAmount: card.primary_amount_display,
      warnings: card.warnings,
    },
  };
}

/**
 * Build the Sherpa MCP actions bound to a server-owned planning context.
 *
 * @param ctx server-owned planning config (router address, protocol addresses,
 *            network flags). Never derived from model/tool input.
 */
export function createSherpaActions(ctx: SherpaActionContext): SherpaActionConfig[] {
  // Resolve the connected account from the wallet — NOT from tool args.
  async function planFor(
    walletProvider: WalletAddressProvider,
    parsed: ParsedIntent,
  ): Promise<PlanResult> {
    const userAddress = (await walletProvider.getAddress()) as `0x${string}`;
    return plan(parsed, { ...ctx.executorDeps, userAddress });
  }

  const lendShape = { amount: amountSchema, asset: assetSchema };
  const swapShape = {
    fromAmount: amountSchema,
    fromAsset: assetSchema,
    toAsset: assetSchema,
    slippagePct: z.number().positive().max(50).optional(),
  };

  const supply: SherpaActionConfig = {
    name: 'sherpa_supply',
    description:
      'Build an UNSIGNED confirmation to supply (lend) an asset to Aave on Base via the audited SherpaRouter, after the 7-ring safety preflight. Returns an unsigned transaction for the user to sign; never executes.',
    schema: z.object(lendShape),
    invoke: async (walletProvider, args) => {
      const { amount, asset } = z.object(lendShape).parse(args);
      const parsed: ParsedIntent = {
        intent: 'LEND',
        confidence: 1,
        raw: `supply ${amount} ${asset}`,
        slots: { amount, asset: asset.toUpperCase() },
      };
      return toJson(planResultToActionResult('sherpa_supply', await planFor(walletProvider, parsed)));
    },
  };

  const withdraw: SherpaActionConfig = {
    name: 'sherpa_withdraw',
    description:
      'Build an UNSIGNED confirmation to withdraw a previously supplied asset from Aave on Base via the SherpaRouter, after the 7-ring preflight. Returns an unsigned transaction; never executes.',
    schema: z.object(lendShape),
    invoke: async (walletProvider, args) => {
      const { amount, asset } = z.object(lendShape).parse(args);
      const parsed: ParsedIntent = {
        intent: 'WITHDRAW',
        confidence: 1,
        raw: `withdraw ${amount} ${asset}`,
        slots: { amount, asset: asset.toUpperCase() },
      };
      return toJson(planResultToActionResult('sherpa_withdraw', await planFor(walletProvider, parsed)));
    },
  };

  const borrow: SherpaActionConfig = {
    name: 'sherpa_borrow',
    description:
      'Build an UNSIGNED confirmation to borrow an asset from Aave on Base (variable-rate only) via the SherpaRouter, after the 7-ring preflight. Returns an unsigned transaction; never executes.',
    schema: z.object(lendShape),
    invoke: async (walletProvider, args) => {
      const { amount, asset } = z.object(lendShape).parse(args);
      const parsed: ParsedIntent = {
        intent: 'BORROW',
        confidence: 1,
        raw: `borrow ${amount} ${asset}`,
        // interestMode pinned to variable: Aave V3 on Base is variable-only.
        slots: { amount, asset: asset.toUpperCase(), interestMode: 'variable' },
      };
      return toJson(planResultToActionResult('sherpa_borrow', await planFor(walletProvider, parsed)));
    },
  };

  const repay: SherpaActionConfig = {
    name: 'sherpa_repay',
    description:
      'Build an UNSIGNED confirmation to repay borrowed debt to Aave on Base via the SherpaRouter, after the 7-ring preflight. Returns an unsigned transaction; never executes.',
    schema: z.object(lendShape),
    invoke: async (walletProvider, args) => {
      const { amount, asset } = z.object(lendShape).parse(args);
      const parsed: ParsedIntent = {
        intent: 'REPAY',
        confidence: 1,
        raw: `repay ${amount} ${asset}`,
        slots: { amount, asset: asset.toUpperCase() },
      };
      return toJson(planResultToActionResult('sherpa_repay', await planFor(walletProvider, parsed)));
    },
  };

  const swap: SherpaActionConfig = {
    name: 'sherpa_swap',
    description:
      'Build an UNSIGNED confirmation to swap one token for another on Base (Aerodrome) via the SherpaRouter, after the 7-ring preflight. Returns an unsigned transaction; never executes.',
    schema: z.object(swapShape),
    invoke: async (walletProvider, args) => {
      const { fromAmount, fromAsset, toAsset, slippagePct } = z.object(swapShape).parse(args);
      const parsed: ParsedIntent = {
        intent: 'SWAP',
        confidence: 1,
        raw: `swap ${fromAmount} ${fromAsset} for ${toAsset}`,
        slots: {
          fromAmount,
          fromAsset: fromAsset.toUpperCase(),
          toAsset: toAsset.toUpperCase(),
          ...(slippagePct !== undefined ? { slippagePct } : {}),
        },
      };
      return toJson(planResultToActionResult('sherpa_swap', await planFor(walletProvider, parsed)));
    },
  };

  return [supply, withdraw, borrow, repay, swap];
}
