/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { LLMRequest, LLMResponse } from '@sherpa/llm';
import type { ParsedIntent, Intent } from './types.js';

/**
 * Deterministic Stage-1 parser. Covers the most common natural-language
 * patterns without needing an LLM. `parseWithLLM` is the fallback used by
 * the API when the deterministic parser returns UNKNOWN.
 *
 * Contract:
 *   - The deterministic layer is conservative — anything ambiguous (multi-word
 *     recipients, prose like "vitalik dot eth", asset names spelled funny)
 *     deliberately falls through to UNKNOWN so `parseWithLLM` can take it.
 *   - Recipient is captured as a single `\S+` token. We do NOT normalise
 *     "dot" → "." here; the LLM owns the looser cases.
 *   - All matches are case-insensitive and `$?` on amounts is optional.
 *
 * Supported forms:
 *   SEND     "send 5 usdc to 0x… / @handle / name.base.eth / name.eth"
 *            "5 usdc to <recipient>" / "5 to <recipient>"  (verbless)
 *   BET      "bet $5 on …"
 *   BUY      "buy $50 of eth" / "buy eth for $50"          (either order)
 *   DEPOSIT  "deposit $50" / "fund $50" / "top up 50"
 *   BALANCE  "balance" / "what's my balance" / "what is my balance" /
 *            "show my balance" / "show me my balance"
 *   HISTORY  "history" / "last N txs" / "my recent txs"
 *   IDENTITY_LOOKUP "who is vitalik.eth" / "resolve jesse.base.eth"
 *
 * Deliberately UNKNOWN (handed to the LLM):
 *   - "send 5 USDC to vitalik dot eth"  (multi-word recipient)
 *   - "send vitalik 5 USDC"             (indirect-object phrasing)
 *   - "I want to buy some ETH"          (prose)
 */

const SEND_RE = /^send\s+([\d.]+)\s*(usdc|eth)?\s+to\s+(\S+)\s*$/i;
// Verbless: "<amount> [asset] to <recipient>". Asset defaults to USDC like SEND_RE.
const SEND_NO_VERB_RE = /^([\d.]+)\s*(usdc|eth)?\s+to\s+(\S+)\s*$/i;
const BUY_RE = /^buy\s+\$?([\d.]+)\s+(?:of\s+)?(\w+)\s*$/i;
// Asset-first: "buy <asset> for $<amount>".
const BUY_FOR_RE = /^buy\s+(\w+)\s+for\s+\$?([\d.]+)\s*$/i;
// BET — specific patterns (checked before generic BET_RE)
const BET_ON_RE =
  /^bet\s+\$?([\d.]+)\s+(\w+)\s+on\s+(YES|NO)\s+(?:for\s+)?['"]?(.{1,300})['"]?\s*$/i;
const BET_AGAINST_RE = /^bet\s+\$?([\d.]+)\s+(\w+)\s+against\s+['"]?(.{1,300})['"]?\s*$/i;
const BUY_BET_RE = /^buy\s+\$?([\d.]+)\s+(\w+)\s+of\s+(YES|NO)\s+on\s+(.{1,300})\s*$/i;
// Generic fallback — captures amount + raw predicate blob.
const BET_RE = /^bet\s+\$?([\d.]+)\s+(.{1,300})\s*$/i;
const DEPOSIT_RE = /^(?:deposit|fund|add|top\s*up)\s+\$?([\d.]+)\s*(?:usdc|usd|dollars?)?\s*$/i;
// Accepts: "balance", "what's my balance", "what is my balance",
// "show my balance", "show me my balance", with optional "?".
const BALANCE_RE =
  /^(?:(?:what(?:[’']s|\s+is)\s+my\s+)|(?:show(?:\s+me)?\s+my\s+))?balance\??\s*$/i;
const HISTORY_RE =
  /^(?:show\s+)?(?:my\s+)?(?:last\s+(\d+)\s+)?(?:recent\s+)?(?:tx|txs|transactions|history)\s*$/i;
const POSITIONS_RE =
  /^(?:show\s+)?(?:my\s+)?(?:aave\s+)?positions?\??\s*$/i;
const POSITIONS_HEALTH_RE =
  /^(?:(?:what(?:[’']s|\s+is)\s+)|(?:show(?:\s+me)?\s+))?(?:my\s+)?(?:aave\s+)?(?:health\s+factor|hf)\??\s*$/i;
const POSITIONS_AAVE_RE =
  /^(?:show\s+)?(?:my\s+)?aave\s+(?:status|account|data)\??\s*$/i;
const IDENTITY_LOOKUP_RE = /^(?:who\s+is|resolve|lookup|look\s+up)\s+([^?\s]+)\??\s*$/i;
// SWAP: "swap 100 USDC for ETH", "convert 0.5 ETH to USDC", "trade 50 USDC to ETH"
// Optional slippage suffix: "with 1% slippage"
// LEND: "lend 100 USDC", "supply 200 USDC"
const LEND_RE = /^(?:lend|supply)\s+([\d.]+)\s+(\w+)\s*$/i;
const LEND_TO_AAVE_RE = /^(?:lend|supply)\s+([\d.]+)\s+(\w+)\s+(?:to|on|into|in)\s+aave\s*$/i;
// LEND with explicit Aave target: "deposit 50 USDC to aave", "deposit 100 USDC into aave"
const LEND_DEPOSIT_RE = /^deposit\s+([\d.]+)\s+(\w+)\s+(?:to|on|into|in)\s+aave\s*$/i;
const BORROW_RE = /^borrow\s+([\d.]+)\s+(\w+)\s*$/i;
const REPAY_RE = /^repay\s+([\d.]+)\s+(\w+)(?:\s+(?:to|on|into|in)\s+aave)?\s*$/i;
const WITHDRAW_RE = /^withdraw\s+([\d.]+)\s+(\w+)(?:\s+from\s+aave)?\s*$/i;
const BORROW_AGAINST_RE = /^borrow\s+([\d.]+)\s+(\w+)\s+against\s+(\w+)\s*$/i;
const BORROW_LOAN_RE = /^take\s+out\s+([\d.]+)\s+(\w+)\s+loan\s*$/i;
const BORROW_RATE_RE = /^borrow\s+([\d.]+)\s+(\w+)\s+(?:at\s+)?(variable|stable)\s+rate\s*$/i;
const BORROW_HF_RE = /^borrow\s+([\d.]+)\s+(\w+)\s+(?:health\s+factor|hf)\s+([\d.]+)\s*$/i;
const STAKE_RE = /^stake\s+([\d.]+)\s+(?:eth|steth)\s*$/i;
const STAKE_FOR_RE = /^stake\s+([\d.]+)\s+eth\s+for\s+steth\s*$/i;
const SWAP_RE =
  /^(?:swap|convert|trade)\s+([\d.]+)\s+(\w+)\s+(?:for|to|→|->)\s+(\w+)(?:\s+with\s+([\d.]+)%\s+slippage)?\s*$/i;
const LP_RE =
  /^(?:provide|add)\s+([\d.]+)\s+(\w+)\s+and\s+([\d.]+)\s+(\w+)\s+(?:liquidity|lp)\s*$/i;
const LP_POOL_RE =
  /^(?:provide|add)\s+([\d.]+)\s+(\w+)\s+(?:to|in)\s+(\w+)\/(\w+)\s+(?:pool|liquidity)\s*$/i;
const BRIDGE_RE = /^bridge\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)\s*$/i;
const BRIDGE_L2_RE = /^bridge\s+([\d.]+)\s+(\w+)\s+(?:from\s+)?(\w+)\s+to\s+(\w+)\s*$/i;
const BRIDGE_FROM_RE = /^send\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)\s+from\s+(\w+)\s*$/i;
const DCA_RE =
  /^dca\s+\$?([\d.]+)\s+(?:into|of)\s+(\w+)\s+(daily|weekly|biweekly|monthly)(?:\s+for\s+(\d+)\s+(\w+))?(?:\s+until\s+\$?([\d.]+))?\s*$/i;
const DCA_BUY_RE = /^buy\s+\$?([\d.]+)\s+(?:of|in)\s+(\w+)\s+(\w+)\s+(daily|weekly|biweekly|monthly)\s*$/i;
const DCA_MANAGE_RE = /^(?:(?:stop|pause|resume|cancel|delete)\s+(?:my\s+)?(\w+)\s+dca|(?:stop|pause|resume|cancel|delete)\s+(?:my\s+)?dca|(?:show|list|view|check)\s+(?:my\s+)?dcas?)\s*$/i;
const ALERT_PRICE_RE = /^alert\s+me\s+when\s+(\w+)\s*(>|<|>=|<=|==)\s*\$?([\d.]+)\s*$/i;
const ALERT_BALANCE_RE =
  /^notify\s+me\s+if\s+my\s+(\w+)\s+balance\s*(>|<|>=|<=|==)\s*([\d.]+)\s*$/i;
const ALERT_HF_RE =
  /^warn\s+me\s+if\s+my\s+(?:aave\s+)?health\s+factor\s*(>|<|>=|<=|==)\s*([\d.]+)\s*$/i;
const ALERT_CROSS_RE = /^tell\s+me\s+when\s+(\w+)\s+crosses?\s+\$?([\d.]+)\s*$/i;
const ALERT_LIST_RE = /^(?:show|list|view|check)\s+(?:my\s+)?alerts?\s*$/i;
const ALERT_CANCEL_RE = /^(?:cancel|stop|remove|delete)\s+alert\s+(.+)\s*$/i;
const AUTO_REPAY_HF_RE =
  /^auto-repay\s+(?:if\s+my\s+health\s+factor|when\s+hf)\s*(<|<=)\s*([\d.]+)\s*$/i;
const AUTO_REPAY_AMOUNT_RE =
  /^auto-repay\s+\$?([\d.]+)\s+(?:of\s+my\s+)?(\w+)?\s*(?:borrow\s+)?(?:if|when)\s+.{0,200}?([\d.]+)\s*$/i;
const AUTO_REPAY_SETUP_RE = /^set\s+up\s+auto-repay\s+at\s+hf\s+([\d.]+)\s*$/i;
const COLLECT_URL_RE = /^(?:collect|mint)\s+(\S+zora\S+)\s*$/i;
const COLLECT_RE = /^(?:collect|mint)\s+(?:the\s+)?(?:post|nft|zora)\s+(?:at\s+)?(\S+)\s*$/i;
const COLLECT_SIMPLE_RE = /^(?:collect|mint)\s+\$?([\d.]+)\s+(?:of\s+)?(?:the\s+)?(.{1,300})\s*$/i;
const POLL_RE =
  /^(?:create|make|start)\s+(?:a\s+)?poll\s*[:"]?\s*(.{1,300})["']?\s*(?:with\s+options?\s+(.{1,300}))?\s*$/i;
const POLL_SIMPLE_RE = /^poll\s*:\s*(.{1,300})\s*$/i;
const TIP_RE = /^tip\s+\$?([\d.]+)\s+(?:to\s+)?@?(\w+)\s*$/i;
const TIP_USER_RE = /^send\s+\$?([\d.]+)\s+(?:to\s+)?@?(\w+)\s+(?:on\s+)?farcaster\s*$/i;
const TIP_USDC_RE = /^tip\s+([\d.]+)\s+(\w+)\s+(?:to\s+)?@?(\w+)\s*$/i;
const TIMELOCK_RE =
  /^(?:schedule|time\s*lock|timelock)\s+(.{1,300})\s+(?:for|at|on|in)\s+(.{1,120})\s*$/i;
const SCHEDULE_RE =
  /^(?:schedule)\s+(?:send|transfer)\s+\$?([\d.]+)\s+(\w+)\s+(?:to\s+)?(\S+)\s+(?:in|at|for)\s+(.{1,120})\s*$/i;
const REBALANCE_RE =
  /^(?:rebalance|auto\s*rebalance)\s+(?:my\s+)?(?:portfolio|holdings|positions)\s*$/i;
const REBALANCE_TARGET_RE =
  /^(?:rebalance|auto\s*rebalance)\s+(?:to|so\s+that)\s+(?:my\s+)?(\w+)\s+(?:is|equals?)\s+(\d+)%?\s*$/i;
const SESSION_KEY_RE = /^(?:create|grant|enable)\s+session\s+key(?:\s+(?:for\s+)?(.{1,120}))?\s*$/i;
const SESSION_KEY_LIMIT_RE =
  /^(?:create|grant)\s+session\s+key\s+(?:with\s+)?(?:limit|cap)\s+\$?([\d.]+)\s*$/i;
const SESSION_KEY_REVOKE_RE = /^(?:revoke|disable|remove)\s+session\s+key\s*$/i;
const SESSION_KEY_PERMIT_RE =
  /^(?:give|allow)\s+sherpa\s+(?:permission|access)\s+to\s+(.{1,200})\s*$/i;
const SESSION_KEY_PERMIT_LIMIT_RE =
  /^(?:give|allow)\s+sherpa\s+(?:permission|access)\s+to\s+(\w+)\s+(?:up\s+to\s+)?\$?([\d.]+)\s+(\w+)\s*(daily|weekly|monthly)?\s*$/i;
const SESSION_KEY_SHOW_RE =
  /^(?:show|list|view|check|display)\s+(?:my\s+)?(?:active\s+)?(?:session\s+)?(?:keys?|permissions?)\s*$/i;
const SESSION_KEY_STATUS_RE =
  /^(?:what|show)\s+(?:are\s+)?(?:my\s+)?(?:current\s+)?(?:session\s+)?(?:key\s+)?(?:permissions?|grants?)\s*\??\s*$/i;

// STRATEGY patterns (Stage 5 — Strategy Marketplace)
const STRATEGY_CREATE_RE =
  /^(?:create|publish|share)\s+strategy\s+(?:called\s+)?['"]?(.{1,120})['"]?\s*$/i;
const STRATEGY_FOLLOW_RE = /^(?:follow|subscribe|copy)\s+strategy\s+(.{1,120})\s*$/i;
const STRATEGY_LIST_RE = /^(?:list|show|browse)\s+strateg(?:y|ies)\s*$/i;
const STRATEGY_RUN_RE = /^(?:run|execute|apply)\s+strategy\s+(.{1,120})\s*$/i;

// PORTFOLIO patterns (Stage 6 — Portfolio Dashboard)
const PORTFOLIO_RE = /^(?:show|display|view|check)\s+(?:my\s+)?portfolio\s*$/i;
const PORTFOLIO_DETAIL_RE =
  /^(?:show|display|view|check)\s+(?:my\s+)?(?:portfolio|holdings)\s+(?:on|for|at)\s+(\w+)\s*$/i;
const PORTFOLIO_PNL_RE =
  /^(?:show|display|what(?:'s|is))\s+(?:my\s+)?(?:pnl|profit|loss|gains)\s*$/i;
const PORTFOLIO_HISTORY_RE =
  /^(?:show|display)\s+(?:my\s+)?(?:portfolio|value)\s+(?:history|over\s+time)\s*$/i;

// NOTIFICATION patterns (Stage 6 — Notification System)
const NOTIFY_RE =
  /^(?:notify|alert|send)\s+me\s+(?:when|if)\s+(.{1,300})\s*(?:via|through|on)\s+(push|email|farcaster|telegram)\s*$/i;
const NOTIFY_CHANNEL_RE =
  /^(?:set|change|update)\s+(?:my\s+)?notification\s+(?:channel|method)\s+(?:to\s+)?(push|email|farcaster|telegram)\s*$/i;
const NOTIFY_STATUS_RE = /^(?:show|check|list)\s+(?:my\s+)?notifications?\s*$/i;

// GOVERNANCE patterns (Stage 7 — Governance)
const VOTE_RE =
  /^(?:vote|cast)\s+(?:my\s+)?(?:vote\s+)?(yes|no|abstain|for|against)\s+(?:on\s+)?(?:proposal\s+)?#?(\d+)?\s*$/i;
const VOTE_PROTOCOL_RE =
  /^vote\s+(yes|no|abstain|for|against)\s+(?:on\s+)?(?:the\s+)?(aave|compound|optimism)\s+(?:proposal\s+)?#?(\d+)\s*$/i;
const PROPOSAL_CREATE_RE = /^(?:create|submit|propose)\s+(?:a\s+)?proposal\s+(.{1,300})\s*$/i;
const PROPOSAL_LIST_RE = /^(?:list|show|browse)\s+(?:active\s+)?proposals?\s*$/i;
const PROPOSAL_SHOW_RE = /^(?:show|view|display)\s+(?:proposal|details)\s+#?(\d+)\s*$/i;
const DELEGATE_RE =
  /^(?:delegate|assign)\s+(?:my\s+)?(?:voting\s+)?(?:power|votes?)\s+(?:to\s+)?(\S+)\s*$/i;
const DELEGATE_PROTOCOL_RE =
  /^delegate\s+(?:my\s+)?(?:voting\s+)?(?:power|votes?)\s+(?:to\s+)?(\S+)\s+(?:on|for|via)\s+(aave|compound|optimism)\s*$/i;
const VOTE_HISTORY_RE = /^(?:show|list|view|check)\s+(?:my\s+)?vote\s+history\s*$/i;
const DELEGATION_STATUS_RE = /^(?:show|list|view|check)\s+(?:my\s+)?delegation(?:s| status)?\s*$/i;
const REVOKE_DELEGATION_RE = /^(?:revoke|remove|cancel)\s+(?:my\s+)?delegation\s+(?:on|for|via)\s+(aave|compound|optimism)\s*$/i;

// ANALYTICS patterns (Stage 7 — Analytics Dashboard)
const ANALYTICS_VOLUME_RE =
  /^(?:show|display|what(?:'s|is))\s+(?:my\s+)?(?:total\s+)?(?:volume|trading\s+volume)\s*$/i;
const ANALYTICS_FEES_RE =
  /^(?:show|display|what(?:'s|is))\s+(?:my\s+)?(?:total\s+)?fees?\s+(?:paid|spent)\s*$/i;
const ANALYTICS_STATS_RE = /^(?:show|display)\s+(?:my\s+)?(?:stats|statistics|analytics)\s*$/i;
const ANALYTICS_USAGE_RE = /^(?:show|display)\s+(?:my\s+)?(?:usage|activity)\s*$/i;

// SOCIAL patterns (Stage 7 — Social Features)
const FOLLOW_RE = /^(?:follow|subscribe\s+to)\s+(?:user\s+)?(\S+)\s*$/i;
const COPY_TRADE_RE = /^(?:copy|mirror)\s+(?:trade\s+)?(\S+)\s*$/i;
const LEADERBOARD_RE = /^(?:show|display|view)\s+(?:the\s+)?leaderboard\s*$/i;
const SOCIAL_PROFILE_RE = /^(?:show|view|display)\s+(?:my\s+)?(?:profile|social)\s*$/i;

// AUTOMATION patterns (Stage 7 — Advanced Automation)
const AUTOMATION_RE =
  /^(?:create|set\s+up)\s+(?:an?\s+)?(?:automation|rule|trigger)\s+(.{1,300})\s*$/i;
const AUTOMATION_IF_RE = /^if\s+(.{1,300})\s+then\s+(.{1,300})\s*$/i;
const AUTOMATION_LIST_RE = /^(?:list|show)\s+(?:my\s+)?automations?\s*$/i;
const AUTOMATION_CANCEL_RE = /^(?:cancel|stop|disable)\s+(?:automation|rule)\s+(.{1,120})\s*$/i;

// SECURITY patterns (Stage 8 — Security Hardening)
const MULTISIG_RE = /^(?:create|setup|enable)\s+multi\s*sig\s*(?:wallet)?\s*$/i;
const HARDWARE_RE = /^(?:connect|link|pair)\s+(?:hardware|ledger|trezor)\s+(?:wallet|device)\s*$/i;
const SECURITY_RE = /^(?:show|check|view)\s+(?:my\s+)?security\s+(?:settings|status)\s*$/i;
const WHITELIST_RE = /^(?:add|whitelist)\s+(\S+)\s+(?:to\s+)?(?:my\s+)?(?:whitelist|trusted)\s*$/i;

// DEVELOPER patterns (Stage 8 — Developer API)
const API_KEY_RE = /^(?:create|generate|get)\s+(?:an?\s+)?api\s+key\s*$/i;
const API_DOCS_RE = /^(?:show|open|view)\s+(?:api\s+)?docs?\s*$/i;
const API_STATUS_RE = /^(?:check|show)\s+(?:my\s+)?api\s+(?:status|usage|limits?)\s*$/i;
const WEBHOOK_RE = /^(?:create|add|setup)\s+(?:a\s+)?webhook\s+(?:for\s+)?(.{1,120})\s*$/i;

// COMPOSABLE patterns (Stage 9 — DeFi Composability)
const COMPOSE_RE = /^(?:compose|combine|chain)\s+(.{1,300})\s+and\s+(.{1,300})\s*$/i;
const FLASH_LOAN_RE = /^(?:flash\s*loan|borrow\s+flash)\s+([\d.]+)\s+(\w+)\s*$/i;
const LEVERAGE_RE = /^(?:leverage|lever\s+up)\s+(?:my\s+)?(\w+)\s+(?:by\s+)?(\d+)x\s*$/i;
const DELEVERAGE_RE = /^(?:deleverage|lever\s+down|unwind)\s+(?:my\s+)?(\w+)\s*$/i;

// CROSS_CHAIN patterns (Stage 8 — Cross-chain Orchestration)
const CROSS_CHAIN_RE =
  /^(?:bridge|send|move)\s+([\d.]+)\s+(\w+)\s+(?:from\s+)?(\w+)\s+to\s+(\w+)\s+and\s+(?:then\s+)?(.{1,300})\s*$/i;
const CROSS_CHAIN_SWAP_RE =
  /^(?:swap|convert)\s+([\d.]+)\s+(\w+)\s+(?:on|at)\s+(\w+)\s+(?:for|to)\s+(\w+)\s*$/i;

function make(
  intent: Intent,
  raw: string,
  slots: Record<string, unknown>,
  confidence: number,
): ParsedIntent {
  return { intent, raw, slots, confidence };
}

export function parseDeterministic(input: string): ParsedIntent {
  const trimmed = input.trim();
  if (trimmed.length > 500) return make('UNKNOWN', trimmed.slice(0, 500), {}, 0);
  const raw = trimmed;

  let m: RegExpMatchArray | null;

  if ((m = raw.match(SEND_RE))) {
    return make(
      'SEND',
      raw,
      { amount: m[1], asset: (m[2] ?? 'USDC').toUpperCase(), to: m[3] },
      0.95,
    );
  }

  if ((m = raw.match(SEND_NO_VERB_RE))) {
    // "5 ETH to USDC" is a SWAP intent (Stage 2), not a SEND with USDC as a
    // recipient. When the captured recipient is a known asset symbol, bail
    // to UNKNOWN so the LLM (or future SWAP regex) can disambiguate.
    const to = m[3] ?? '';
    if (!/^(usdc|usd|eth|weth|btc|wbtc)$/i.test(to)) {
      return make('SEND', raw, { amount: m[1], asset: (m[2] ?? 'USDC').toUpperCase(), to }, 0.85);
    }
  }

  if ((m = raw.match(BUY_RE))) {
    return make('BUY', raw, { usd: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.85);
  }

  if ((m = raw.match(BUY_FOR_RE))) {
    return make('BUY', raw, { usd: m[2], asset: (m[1] ?? '').toUpperCase() }, 0.85);
  }

  // BET — specific patterns first, then generic fallback.
  if ((m = raw.match(BET_ON_RE))) {
    return make(
      'BET',
      raw,
      {
        betAmount: m[1],
        betAsset: (m[2] ?? '').toUpperCase(),
        betSide: (m[3] ?? '').toUpperCase() as 'YES' | 'NO',
        marketQuery: m[4],
      },
      0.9,
    );
  }
  if ((m = raw.match(BET_AGAINST_RE))) {
    return make(
      'BET',
      raw,
      {
        betAmount: m[1],
        betAsset: (m[2] ?? '').toUpperCase(),
        betSide: 'NO' as const,
        marketQuery: m[3],
      },
      0.85,
    );
  }
  if ((m = raw.match(BUY_BET_RE))) {
    return make(
      'BET',
      raw,
      {
        betAmount: m[1],
        betAsset: (m[2] ?? '').toUpperCase(),
        betSide: (m[3] ?? '').toUpperCase() as 'YES' | 'NO',
        marketQuery: m[4],
      },
      0.88,
    );
  }
  if ((m = raw.match(BET_RE))) {
    return make('BET', raw, { usd: m[1], predicate: m[2] ?? '' }, 0.75);
  }

  // TIP patterns
  if ((m = raw.match(TIP_RE))) {
    return make('TIP', raw, { tipAmount: m[1], tipRecipient: (m[2] ?? '').toLowerCase() }, 0.9);
  }
  if ((m = raw.match(TIP_USER_RE))) {
    return make('TIP', raw, { tipAmount: m[1], tipRecipient: (m[2] ?? '').toLowerCase() }, 0.88);
  }
  if ((m = raw.match(TIP_USDC_RE))) {
    return make(
      'TIP',
      raw,
      {
        tipAmount: m[1],
        tipAsset: (m[2] ?? '').toUpperCase(),
        tipRecipient: (m[3] ?? '').toLowerCase(),
      },
      0.9,
    );
  }

  if ((m = raw.match(DEPOSIT_RE))) {
    return make('DEPOSIT', raw, { usd: m[1], asset: 'USDC' }, 0.9);
  }

  if (POSITIONS_RE.test(raw) || POSITIONS_HEALTH_RE.test(raw) || POSITIONS_AAVE_RE.test(raw)) {
    return make('POSITIONS', raw, { filter: 'all' }, 0.92);
  }

  // LEND patterns (must come after DEPOSIT_RE to avoid conflict)
  if ((m = raw.match(LEND_TO_AAVE_RE))) {
    return make('LEND', raw, { amount: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.9);
  }
  if ((m = raw.match(LEND_DEPOSIT_RE))) {
    return make('LEND', raw, { amount: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.9);
  }
  if ((m = raw.match(LEND_RE))) {
    return make('LEND', raw, { amount: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.9);
  }

  if ((m = raw.match(REPAY_RE))) {
    return make('REPAY', raw, { amount: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.9);
  }

  if ((m = raw.match(WITHDRAW_RE))) {
    return make('WITHDRAW', raw, { amount: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.9);
  }

  // BORROW patterns
  // STAKE patterns (Lido)
  if ((m = raw.match(STAKE_FOR_RE))) {
    return make(
      'STAKE',
      raw,
      { stakeAsset: 'ETH', stakeAmount: m[1], receiveAsset: 'stETH' },
      0.92,
    );
  }
  if ((m = raw.match(STAKE_RE))) {
    return make('STAKE', raw, { stakeAsset: 'ETH', stakeAmount: m[1] }, 0.9);
  }

  if ((m = raw.match(BORROW_RE))) {
    return make(
      'BORROW',
      raw,
      { borrowAsset: (m[2] ?? '').toUpperCase(), borrowAmount: m[1], interestMode: 'variable' },
      0.9,
    );
  }
  if ((m = raw.match(BORROW_AGAINST_RE))) {
    return make(
      'BORROW',
      raw,
      {
        borrowAsset: (m[2] ?? '').toUpperCase(),
        borrowAmount: m[1],
        collateralAsset: (m[3] ?? '').toUpperCase(),
        interestMode: 'variable',
      },
      0.92,
    );
  }
  if ((m = raw.match(BORROW_LOAN_RE))) {
    return make(
      'BORROW',
      raw,
      { borrowAsset: (m[2] ?? '').toUpperCase(), borrowAmount: m[1], interestMode: 'variable' },
      0.85,
    );
  }
  if ((m = raw.match(BORROW_RATE_RE))) {
    return make(
      'BORROW',
      raw,
      {
        borrowAsset: (m[2] ?? '').toUpperCase(),
        borrowAmount: m[1],
        interestMode: (m[3] ?? 'variable').toLowerCase(),
      },
      0.9,
    );
  }
  if ((m = raw.match(BORROW_HF_RE))) {
    return make(
      'BORROW',
      raw,
      {
        borrowAsset: (m[2] ?? '').toUpperCase(),
        borrowAmount: m[1],
        targetHealthFactor: m[3],
        interestMode: 'variable',
      },
      0.9,
    );
  }

  if (BALANCE_RE.test(raw)) {
    return make('BALANCE', raw, {}, 0.95);
  }

  if ((m = raw.match(HISTORY_RE))) {
    return make('HISTORY', raw, { limit: m[1] ? Number(m[1]) : 10 }, 0.9);
  }

  if ((m = raw.match(IDENTITY_LOOKUP_RE))) {
    return make('IDENTITY_LOOKUP', raw, { query: m[1] }, 0.9);
  }

  if ((m = raw.match(LP_RE))) {
    return make(
      'LP',
      raw,
      {
        asset1: (m[2] ?? '').toUpperCase(),
        amount1: m[1],
        asset2: (m[4] ?? '').toUpperCase(),
        amount2: m[3],
      },
      0.9,
    );
  }

  if ((m = raw.match(LP_POOL_RE))) {
    const a1 = (m[2] ?? '').toUpperCase();
    const a2 = (m[4] ?? '').toUpperCase();
    return make(
      'LP',
      raw,
      {
        asset1: a1,
        amount1: m[1],
        asset2: a2,
        poolName: `${a1}/${a2}`,
      },
      0.88,
    );
  }

  if ((m = raw.match(SWAP_RE))) {
    const slippage = m[4] ? Number(m[4]) : undefined;
    return make(
      'SWAP',
      raw,
      {
        fromAmount: m[1],
        fromAsset: (m[2] ?? '').toUpperCase(),
        toAsset: (m[3] ?? '').toUpperCase(),
        ...(slippage !== undefined ? { slippagePct: slippage } : {}),
      },
      0.9,
    );
  }

  if ((m = raw.match(BRIDGE_L2_RE))) {
    return make(
      'BRIDGE',
      raw,
      {
        bridgeAsset: (m[2] ?? '').toUpperCase(),
        bridgeAmount: m[1],
        sourceChain: (m[3] ?? '').toLowerCase(),
        destinationChain: (m[4] ?? '').toLowerCase(),
      },
      0.92,
    );
  }

  if ((m = raw.match(BRIDGE_RE))) {
    return make(
      'BRIDGE',
      raw,
      {
        bridgeAsset: (m[2] ?? '').toUpperCase(),
        bridgeAmount: m[1],
        destinationChain: (m[3] ?? '').toLowerCase(),
      },
      0.9,
    );
  }

  if ((m = raw.match(BRIDGE_FROM_RE))) {
    return make(
      'BRIDGE',
      raw,
      {
        bridgeAsset: (m[2] ?? '').toUpperCase(),
        bridgeAmount: m[1],
        destinationChain: (m[3] ?? '').toLowerCase(),
        sourceChain: (m[4] ?? '').toLowerCase(),
      },
      0.88,
    );
  }

  // DCA patterns
  if ((m = raw.match(DCA_RE))) {
    return make(
      'DCA',
      raw,
      {
        dcaAmount: m[1],
        dcaAsset: (m[2] ?? '').toUpperCase(),
        frequency: (m[3] ?? '').toLowerCase(),
        duration: m[4],
        durationUnit: m[5],
        untilAmount: m[6],
      },
      0.9,
    );
  }
  if ((m = raw.match(DCA_BUY_RE))) {
    return make(
      'DCA',
      raw,
      {
        dcaAmount: m[1],
        dcaAsset: (m[2] ?? '').toUpperCase(),
        frequency: (m[4] ?? '').toLowerCase(),
      },
      0.88,
    );
  }

  // DCA_MANAGE patterns
  if ((m = raw.match(DCA_MANAGE_RE))) {
    const lower = raw.toLowerCase();
    if (/show|list|view|check/.test(lower)) {
      return make('DCA_MANAGE', raw, { dcaAction: 'list' }, 0.9);
    }
    if (/stop|cancel|delete/.test(lower)) {
      return make('DCA_MANAGE', raw, { dcaAction: 'stop', dcaAsset: (m[1] ?? '').toUpperCase() }, 0.9);
    }
    if (/pause/.test(lower)) {
      return make('DCA_MANAGE', raw, { dcaAction: 'pause', dcaAsset: (m[1] ?? '').toUpperCase() }, 0.9);
    }
    if (/resume/.test(lower)) {
      return make('DCA_MANAGE', raw, { dcaAction: 'resume', dcaAsset: (m[1] ?? '').toUpperCase() }, 0.9);
    }
    return make('DCA_MANAGE', raw, { dcaAction: 'list' }, 0.85);
  }

  // ALERT patterns
  if ((m = raw.match(ALERT_PRICE_RE))) {
    return make(
      'ALERT',
      raw,
      {
        conditionType: 'price',
        asset: (m[1] ?? '').toUpperCase(),
        comparison: m[2],
        threshold: m[3],
      },
      0.9,
    );
  }
  if ((m = raw.match(ALERT_BALANCE_RE))) {
    return make(
      'ALERT',
      raw,
      {
        conditionType: 'balance',
        asset: (m[1] ?? '').toUpperCase(),
        comparison: m[2],
        threshold: m[3],
      },
      0.9,
    );
  }
  if ((m = raw.match(ALERT_HF_RE))) {
    return make(
      'ALERT',
      raw,
      { conditionType: 'health-factor', comparison: m[1], threshold: m[2] },
      0.9,
    );
  }
  if ((m = raw.match(ALERT_CROSS_RE))) {
    return make(
      'ALERT',
      raw,
      {
        conditionType: 'price',
        asset: (m[1] ?? '').toUpperCase(),
        comparison: 'cross',
        threshold: m[2],
      },
      0.85,
    );
  }
  if (ALERT_LIST_RE.test(raw)) {
    return make('ALERT', raw, { alertAction: 'list' }, 0.9);
  }
  if ((m = raw.match(ALERT_CANCEL_RE))) {
    return make('ALERT', raw, { alertAction: 'cancel', alertTarget: (m[1] ?? '').trim() }, 0.9);
  }

  // AUTO_REPAY patterns
  if ((m = raw.match(AUTO_REPAY_SETUP_RE))) {
    return make('AUTO_REPAY', raw, { triggerHF: m[1], setup: true }, 0.92);
  }
  if ((m = raw.match(AUTO_REPAY_HF_RE))) {
    return make('AUTO_REPAY', raw, { comparison: m[1], triggerHF: m[2] }, 0.92);
  }
  if ((m = raw.match(AUTO_REPAY_AMOUNT_RE))) {
    return make(
      'AUTO_REPAY',
      raw,
      { maxRepay: m[1], repayAsset: (m[2] ?? '').toUpperCase(), triggerHF: m[3] },
      0.88,
    );
  }

  // COLLECT patterns (Zora NFTs)
  if ((m = raw.match(COLLECT_URL_RE))) {
    return make('COLLECT', raw, { collectUrl: m[1] }, 0.9);
  }
  if ((m = raw.match(COLLECT_RE))) {
    return make('COLLECT', raw, { collectTarget: m[1] }, 0.85);
  }
  if ((m = raw.match(COLLECT_SIMPLE_RE))) {
    return make('COLLECT', raw, { collectAmount: m[1], collectTarget: m[2] }, 0.8);
  }

  if ((m = raw.match(POLL_RE))) {
    const q = m[1] ?? '';
    const opts = m[2] ? m[2].split(/,|\bor\b/i).map((o: string) => o.trim()) : [];
    return make('POLL', raw, { pollQuestion: q.trim(), pollOptions: opts }, 0.85);
  }
  if ((m = raw.match(POLL_SIMPLE_RE))) {
    return make('POLL', raw, { pollQuestion: (m[1] ?? '').trim() }, 0.8);
  }

  // AUTO_REBALANCE patterns
  if ((m = raw.match(REBALANCE_RE))) {
    return make('AUTO_REBALANCE', raw, {}, 0.85);
  }
  if ((m = raw.match(REBALANCE_TARGET_RE))) {
    return make(
      'AUTO_REBALANCE',
      raw,
      { rebalanceTarget: (m[1] ?? '').toUpperCase(), rebalancePercent: m[2] },
      0.9,
    );
  }

  // TIME_LOCK patterns
  if ((m = raw.match(SCHEDULE_RE))) {
    return make(
      'TIME_LOCK',
      raw,
      {
        scheduledAction: 'send',
        scheduledAmount: m[1],
        scheduledAsset: (m[2] ?? '').toUpperCase(),
        scheduledRecipient: m[3],
        scheduledTime: m[4],
      },
      0.9,
    );
  }
  if ((m = raw.match(TIMELOCK_RE))) {
    return make(
      'TIME_LOCK',
      raw,
      { scheduledAction: (m[1] ?? '').trim(), scheduledTime: (m[2] ?? '').trim() },
      0.85,
    );
  }

  // SESSION_KEY patterns
  if ((m = raw.match(SESSION_KEY_LIMIT_RE))) {
    return make('SESSION_KEY', raw, { sessionAction: 'create', sessionLimit: m[1] }, 0.9);
  }
  if ((m = raw.match(SESSION_KEY_RE))) {
    return make(
      'SESSION_KEY',
      raw,
      { sessionAction: 'create', sessionPurpose: (m[1] ?? '').trim() },
      0.85,
    );
  }
  if ((m = raw.match(SESSION_KEY_REVOKE_RE))) {
    return make('SESSION_KEY', raw, { sessionAction: 'revoke' }, 0.9);
  }
  if ((m = raw.match(SESSION_KEY_PERMIT_LIMIT_RE))) {
    return make(
      'SESSION_KEY',
      raw,
      {
        sessionAction: 'create',
        sessionPurpose: m[1],
        sessionLimit: m[2],
        sessionAsset: (m[3] ?? '').toUpperCase(),
        sessionFrequency: (m[4] ?? '').toLowerCase() || undefined,
      },
      0.92,
    );
  }
  if ((m = raw.match(SESSION_KEY_PERMIT_RE))) {
    return make(
      'SESSION_KEY',
      raw,
      { sessionAction: 'create', sessionPurpose: (m[1] ?? '').trim() },
      0.88,
    );
  }
  if (SESSION_KEY_SHOW_RE.test(raw) || SESSION_KEY_STATUS_RE.test(raw)) {
    return make('SESSION_KEY', raw, { sessionAction: 'list' }, 0.9);
  }

  // STRATEGY patterns (Stage 5 — Strategy Marketplace)
  if ((m = raw.match(STRATEGY_CREATE_RE))) {
    return make(
      'STRATEGY',
      raw,
      { strategyAction: 'create', strategyName: (m[1] ?? '').trim() },
      0.85,
    );
  }
  if ((m = raw.match(STRATEGY_FOLLOW_RE))) {
    return make(
      'STRATEGY',
      raw,
      { strategyAction: 'follow', strategyName: (m[1] ?? '').trim() },
      0.85,
    );
  }
  if ((m = raw.match(STRATEGY_LIST_RE))) {
    return make('STRATEGY', raw, { strategyAction: 'list' }, 0.8);
  }
  if ((m = raw.match(STRATEGY_RUN_RE))) {
    return make('STRATEGY', raw, { strategyAction: 'run', strategyName: (m[1] ?? '').trim() }, 0.9);
  }

  // PORTFOLIO patterns (Stage 6 — Portfolio Dashboard)
  if ((m = raw.match(PORTFOLIO_PNL_RE))) {
    return make('PORTFOLIO', raw, { portfolioAction: 'pnl' }, 0.9);
  }
  if ((m = raw.match(PORTFOLIO_HISTORY_RE))) {
    return make('PORTFOLIO', raw, { portfolioAction: 'history' }, 0.85);
  }
  if ((m = raw.match(PORTFOLIO_DETAIL_RE))) {
    return make(
      'PORTFOLIO',
      raw,
      { portfolioAction: 'show', portfolioChain: (m[1] ?? '').toLowerCase() },
      0.9,
    );
  }
  if ((m = raw.match(PORTFOLIO_RE))) {
    return make('PORTFOLIO', raw, { portfolioAction: 'show' }, 0.85);
  }

  // NOTIFICATION patterns
  if ((m = raw.match(NOTIFY_RE))) {
    return make(
      'NOTIFICATION',
      raw,
      {
        notificationAction: 'subscribe',
        notificationCondition: m[1]!.trim(),
        notificationChannel: m[2]!.toLowerCase(),
      },
      0.9,
    );
  }
  if ((m = raw.match(NOTIFY_CHANNEL_RE))) {
    return make(
      'NOTIFICATION',
      raw,
      { notificationAction: 'set_channel', notificationChannel: m[1]!.toLowerCase() },
      0.85,
    );
  }
  if ((m = raw.match(NOTIFY_STATUS_RE))) {
    return make('NOTIFICATION', raw, { notificationAction: 'list' }, 0.8);
  }

  // GOVERNANCE patterns (Stage 7 — Governance)
  if ((m = raw.match(VOTE_PROTOCOL_RE))) {
    const vote = (m[1] ?? '').toLowerCase();
    const voteChoice = vote === 'for' ? 'yes' : vote === 'against' ? 'no' : vote;
    return make(
      'GOVERNANCE',
      raw,
      { govAction: 'vote', govVote: voteChoice, govProtocol: (m[2] ?? '').toLowerCase(), govProposalId: m[3] },
      0.95,
    );
  }
  if ((m = raw.match(VOTE_RE))) {
    const vote = (m[1] ?? '').toLowerCase();
    const voteChoice = vote === 'for' ? 'yes' : vote === 'against' ? 'no' : vote;
    return make(
      'GOVERNANCE',
      raw,
      { govAction: 'vote', govVote: voteChoice, govProposalId: m[2] },
      0.9,
    );
  }
  if ((m = raw.match(PROPOSAL_CREATE_RE))) {
    return make(
      'GOVERNANCE',
      raw,
      { govAction: 'propose', govProposalText: (m[1] ?? '').trim() },
      0.85,
    );
  }
  if ((m = raw.match(PROPOSAL_SHOW_RE))) {
    return make('GOVERNANCE', raw, { govAction: 'show', govProposalId: m[1] }, 0.9);
  }
  if ((m = raw.match(PROPOSAL_LIST_RE))) {
    return make('GOVERNANCE', raw, { govAction: 'list' }, 0.8);
  }
  if ((m = raw.match(DELEGATE_PROTOCOL_RE))) {
    return make(
      'GOVERNANCE',
      raw,
      { govAction: 'delegate', govDelegatee: m[1], govProtocol: (m[2] ?? '').toLowerCase() },
      0.92,
    );
  }
  if ((m = raw.match(DELEGATE_RE))) {
    return make('GOVERNANCE', raw, { govAction: 'delegate', govDelegatee: m[1] }, 0.85);
  }
  if (VOTE_HISTORY_RE.test(raw)) {
    return make('GOVERNANCE', raw, { govAction: 'vote_history' }, 0.9);
  }
  if (DELEGATION_STATUS_RE.test(raw)) {
    return make('GOVERNANCE', raw, { govAction: 'delegation_status' }, 0.9);
  }
  if ((m = raw.match(REVOKE_DELEGATION_RE))) {
    return make(
      'GOVERNANCE',
      raw,
      { govAction: 'revoke_delegation', govProtocol: (m[1] ?? '').toLowerCase() },
      0.9,
    );
  }

  // ANALYTICS patterns (Stage 7 — Analytics Dashboard)
  if ((m = raw.match(ANALYTICS_VOLUME_RE))) {
    return make('ANALYTICS', raw, { analyticsAction: 'volume' }, 0.9);
  }
  if ((m = raw.match(ANALYTICS_FEES_RE))) {
    return make('ANALYTICS', raw, { analyticsAction: 'fees' }, 0.9);
  }
  if ((m = raw.match(ANALYTICS_STATS_RE))) {
    return make('ANALYTICS', raw, { analyticsAction: 'stats' }, 0.85);
  }
  if ((m = raw.match(ANALYTICS_USAGE_RE))) {
    return make('ANALYTICS', raw, { analyticsAction: 'usage' }, 0.8);
  }

  // SOCIAL patterns (Stage 7 — Social Features)
  if ((m = raw.match(FOLLOW_RE))) {
    return make('SOCIAL', raw, { socialAction: 'follow', socialTarget: m[1] }, 0.85);
  }
  if ((m = raw.match(COPY_TRADE_RE))) {
    return make('SOCIAL', raw, { socialAction: 'copy_trade', socialTarget: m[1] }, 0.9);
  }
  if ((m = raw.match(LEADERBOARD_RE))) {
    return make('SOCIAL', raw, { socialAction: 'leaderboard' }, 0.8);
  }
  if ((m = raw.match(SOCIAL_PROFILE_RE))) {
    return make('SOCIAL', raw, { socialAction: 'profile' }, 0.8);
  }

  // AUTOMATION patterns (Stage 7 — Advanced Automation)
  if ((m = raw.match(AUTOMATION_IF_RE))) {
    return make(
      'AUTOMATION',
      raw,
      {
        automationAction: 'create',
        automationCondition: m[1]!.trim(),
        automationAction2: m[2]!.trim(),
      },
      0.9,
    );
  }
  if ((m = raw.match(AUTOMATION_RE))) {
    return make(
      'AUTOMATION',
      raw,
      { automationAction: 'create', automationDescription: m[1]!.trim() },
      0.85,
    );
  }
  if ((m = raw.match(AUTOMATION_LIST_RE))) {
    return make('AUTOMATION', raw, { automationAction: 'list' }, 0.8);
  }
  if ((m = raw.match(AUTOMATION_CANCEL_RE))) {
    return make(
      'AUTOMATION',
      raw,
      { automationAction: 'cancel', automationName: m[1]!.trim() },
      0.85,
    );
  }

  // SECURITY patterns (Stage 8 — Security Hardening)
  if ((m = raw.match(MULTISIG_RE))) {
    return make('SECURITY', raw, { securityAction: 'multisig' }, 0.9);
  }
  if ((m = raw.match(HARDWARE_RE))) {
    return make('SECURITY', raw, { securityAction: 'hardware' }, 0.9);
  }
  if ((m = raw.match(SECURITY_RE))) {
    return make('SECURITY', raw, { securityAction: 'status' }, 0.8);
  }
  if ((m = raw.match(WHITELIST_RE))) {
    return make('SECURITY', raw, { securityAction: 'whitelist', securityTarget: m[1] }, 0.85);
  }

  // AI_AGENT patterns (Stage 9 — AI Agent)
  const AI_REMEMBER_RE = /^(?:remember|save|note)\s+(?:that\s+)?(.{1,300})\s*$/i;
  const AI_FORGET_RE = /^(?:forget|delete|remove)\s+(?:that\s+)?(.{1,300})\s*$/i;
  const AI_CONTEXT_RE =
    /^(?:what\s+do\s+you\s+know|show\s+context|what(?:'s|is)\s+(?:my|the)\s+context)(?:\s+about\s+(?:me|my\s+\w+))?\s*$/i;
  const AI_PLAN_RE = /^(?:plan|create\s+plan|make\s+plan)\s+(?:for\s+)?(.{1,300})\s*$/i;
  const AI_EXPLAIN_RE = /^(?:explain|describe|tell\s+me\s+about)\s+(.{1,300}?)(?:\s+to\s+me)?\s*$/i;

  // CROSS_CHAIN patterns (Stage 8 — Cross-chain Orchestration)
  if ((m = raw.match(CROSS_CHAIN_RE))) {
    return make(
      'CROSS_CHAIN',
      raw,
      {
        crossAmount: m[1],
        crossAsset: (m[2] ?? '').toUpperCase(),
        crossSource: (m[3] ?? '').toLowerCase(),
        crossDest: (m[4] ?? '').toLowerCase(),
        crossAction: (m[5] ?? '').trim(),
      },
      0.9,
    );
  }
  if ((m = raw.match(CROSS_CHAIN_SWAP_RE))) {
    return make(
      'CROSS_CHAIN',
      raw,
      {
        crossAmount: m[1],
        crossAsset: (m[2] ?? '').toUpperCase(),
        crossChain: (m[3] ?? '').toLowerCase(),
        crossTarget: (m[4] ?? '').toUpperCase(),
      },
      0.88,
    );
  }

  // DEVELOPER patterns (Stage 8 — Developer API)
  if ((m = raw.match(API_KEY_RE))) {
    return make('DEVELOPER', raw, { devAction: 'create_key' }, 0.9);
  }
  if ((m = raw.match(API_DOCS_RE))) {
    return make('DEVELOPER', raw, { devAction: 'docs' }, 0.8);
  }
  if ((m = raw.match(API_STATUS_RE))) {
    return make('DEVELOPER', raw, { devAction: 'status' }, 0.85);
  }
  if ((m = raw.match(WEBHOOK_RE))) {
    return make('DEVELOPER', raw, { devAction: 'webhook', devEvent: m[1]!.trim() }, 0.85);
  }

  // RISK patterns (Stage 9 — Risk Management)
  const RISK_CHECK_RE = /^(?:check|assess|analyze)\s+(?:my\s+)?(?:portfolio\s+)?risk\s*$/i;
  const RISK_EXPOSURE_RE = /^(?:show|display|what(?:'s|is))\s+(?:my\s+)?(?:risk\s+)?exposure\s*$/i;
  const RISK_HEDGE_RE = /^(?:hedge|protect|reduce\s+risk)\s+(?:my\s+)?(?:portfolio|position)\s*$/i;
  const RISK_ALERT_RE = /^(?:set|create)\s+(?:a\s+)?risk\s+alert\s+(?:if|when)\s+(.{1,300})\s*$/i;

  // COMPOSABLE patterns (Stage 9 — DeFi Composability)
  if ((m = raw.match(FLASH_LOAN_RE))) {
    return make(
      'COMPOSABLE',
      raw,
      {
        composableAction: 'flash_loan',
        composableAmount: m[1],
        composableAsset: (m[2] ?? '').toUpperCase(),
      },
      0.9,
    );
  }
  if ((m = raw.match(LEVERAGE_RE))) {
    return make(
      'COMPOSABLE',
      raw,
      {
        composableAction: 'leverage',
        composableAsset: (m[1] ?? '').toUpperCase(),
        composableLeverage: m[2],
      },
      0.9,
    );
  }
  if ((m = raw.match(DELEVERAGE_RE))) {
    return make(
      'COMPOSABLE',
      raw,
      { composableAction: 'deleverage', composableAsset: (m[1] ?? '').toUpperCase() },
      0.9,
    );
  }
  if ((m = raw.match(COMPOSE_RE))) {
    return make(
      'COMPOSABLE',
      raw,
      {
        composableAction: 'compose',
        composableStep1: (m[1] ?? '').trim(),
        composableStep2: (m[2] ?? '').trim(),
      },
      0.85,
    );
  }

  // RISK patterns (Stage 9 — Risk Management)
  if ((m = raw.match(RISK_CHECK_RE))) {
    return make('RISK', raw, { riskAction: 'check' }, 0.9);
  }
  if ((m = raw.match(RISK_EXPOSURE_RE))) {
    return make('RISK', raw, { riskAction: 'exposure' }, 0.85);
  }
  if ((m = raw.match(RISK_HEDGE_RE))) {
    return make('RISK', raw, { riskAction: 'hedge' }, 0.9);
  }
  if ((m = raw.match(RISK_ALERT_RE))) {
    return make('RISK', raw, { riskAction: 'alert', riskCondition: m[1]!.trim() }, 0.85);
  }

  // AI_AGENT patterns (Stage 9 — AI Agent)
  if ((m = raw.match(AI_REMEMBER_RE))) {
    return make('AI_AGENT', raw, { aiAction: 'remember', aiMemory: m[1]!.trim() }, 0.9);
  }
  if ((m = raw.match(AI_FORGET_RE))) {
    return make('AI_AGENT', raw, { aiAction: 'forget', aiMemory: m[1]!.trim() }, 0.9);
  }
  if (AI_CONTEXT_RE.test(raw)) {
    return make('AI_AGENT', raw, { aiAction: 'context' }, 0.8);
  }
  if ((m = raw.match(AI_PLAN_RE))) {
    return make('AI_AGENT', raw, { aiAction: 'plan', aiGoal: m[1]!.trim() }, 0.85);
  }
  if ((m = raw.match(AI_EXPLAIN_RE))) {
    return make('AI_AGENT', raw, { aiAction: 'explain', aiTopic: m[1]!.trim() }, 0.85);
  }

  return make('UNKNOWN', raw, {}, 0);
}

/**
 * LLM-backed fallback. Asks the router for a strict JSON object describing
 * the intent + slots; rejects anything that doesn't validate. Caller is
 * expected to pass a router instance from `@sherpa/llm` (real or mock).
 */
export type LLMComplete = (req: LLMRequest) => Promise<LLMResponse>;

const VALID_INTENTS: readonly Intent[] = [
  'SEND',
  'BUY',
  'BET',
  'SWAP',
  'LEND',
  'BORROW',
  'REPAY',
  'WITHDRAW',
  'POSITIONS',
  'LP',
  'STAKE',
  'BRIDGE',
  'DEPOSIT',
  'BALANCE',
  'HISTORY',
  'DCA',
  'DCA_MANAGE',
  'ALERT',
  'AUTO_REPAY',
  'POLL',
  'TIP',
  'COLLECT',
  'TIME_LOCK',
  'AUTO_REBALANCE',
  'SESSION_KEY',
  'STRATEGY',
  'PORTFOLIO',
  'NOTIFICATION',
  'GOVERNANCE',
  'ANALYTICS',
  'SOCIAL',
  'AUTOMATION',
  'SECURITY',
  'DEVELOPER',
  'CROSS_CHAIN',
  'AI_AGENT',
  'COMPOSABLE',
  'RISK',
];

const PARSE_SYSTEM = `You translate a user's natural-language Web3 instruction into a strict JSON object.

Output ONLY a single JSON object, no prose, with this shape:
{ "intent": "SEND|BUY|BET|SWAP|LEND|BORROW|REPAY|WITHDRAW|POSITIONS|DEPOSIT|BALANCE|HISTORY|BRIDGE|COLLECT|UNKNOWN", "slots": { ... }, "confidence": 0..1 }

Slot conventions:
- SEND     { "amount": "5", "asset": "USDC", "to": "<address|handle|ens>" }
- BUY      { "usd": "50", "asset": "ETH" }
- BET      { "usd": "5", "predicate": "<text>", "outcome": "YES|NO" }
- DEPOSIT  { "usd": "50", "asset": "USDC" }
- LEND     { "amount": "100", "asset": "USDC" }
- BORROW   { "borrowAmount": "100", "borrowAsset": "USDC", "interestMode": "variable|stable", "collateralAsset": "ETH", "targetHealthFactor": "1.5" }
- REPAY    { "amount": "100", "asset": "USDC" }
- WITHDRAW { "amount": "100", "asset": "USDC" }
- POSITIONS {}
- LP       { "asset1": "USDC", "amount1": "100", "asset2": "ETH", "amount2": "0.05" } or { "asset1": "USDC", "amount1": "100", "asset2": "ETH", "poolName": "USDC/ETH" }
- BALANCE  {}
- HISTORY  { "limit": 10 }
- BRIDGE   { "bridgeAmount": "100", "bridgeAsset": "USDC", "destinationChain": "optimism", "sourceChain": "base" }

If you cannot parse, return { "intent": "UNKNOWN", "slots": {}, "confidence": 0 }.`;

function safeParseJson(text: string): unknown {
  // The model may wrap the JSON in code fences. Strip them, then take the
  // first {...} block we find.
  const stripped = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function parseWithLLM(input: string, complete: LLMComplete): Promise<ParsedIntent> {
  const raw = input.trim();
  const det = parseDeterministic(raw);
  if (det.intent !== 'UNKNOWN') return det;

  const resp = await complete({ task: 'parse', system: PARSE_SYSTEM, user: raw });
  const json = safeParseJson(resp.text);
  if (!json || typeof json !== 'object') return make('UNKNOWN', raw, {}, 0);

  const obj = json as Record<string, unknown>;
  const intentRaw = typeof obj.intent === 'string' ? obj.intent.toUpperCase() : 'UNKNOWN';
  const intent = (VALID_INTENTS as readonly string[]).includes(intentRaw)
    ? (intentRaw as Intent)
    : 'UNKNOWN';
  const slots =
    obj.slots && typeof obj.slots === 'object' ? (obj.slots as Record<string, unknown>) : {};
  const confidence =
    typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.5;

  return make(intent, raw, slots, confidence);
}
