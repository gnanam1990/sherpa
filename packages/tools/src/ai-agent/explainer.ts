/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

const EXPLANATIONS: Record<string, string> = {
  swap:
    'A swap on Aerodrome (Base) exchanges one token for another using an AMM pool. ' +
    'You pay a small fee (typically 0.05–0.3%) and the output depends on pool depth and slippage tolerance.',

  'health factor':
    'Your Health Factor is the ratio of your collateral value to your borrowed value on Aave. ' +
    'If it drops below 1.0 your position faces liquidation — meaning the protocol sells your collateral to repay the debt.',

  staking:
    'Staking locks tokens to earn yield. On Base, ETH staking via Lido gives you stETH which accrues rewards automatically. ' +
    'You can use stETH as collateral on Aave while still earning staking yield.',

  bridge:
    'Bridging moves tokens from one chain to another (e.g. Ethereum → Base). ' +
    'Protocols like Across or the native bridge lock tokens on the source chain and mint them on the destination. ' +
    'Fees and times vary — native bridges take ~20 min, fast bridges like Across take ~2 min.',

  lp:
    'Providing liquidity (LP) means depositing two tokens into an Aerodrome pool. ' +
    'You earn swap fees proportional to your share of the pool. Beware of impermanent loss — ' +
    'if one token rises significantly vs the other, you may have been better off just holding.',

  lend:
    'Lending on Aave V3 deposits your tokens into a pool that borrowers pay interest to use. ' +
    'You receive aToken receipts (e.g. aUSDC) that grow in balance as interest accrues.',

  borrow:
    'Borrowing on Aave lets you take a loan against your collateral. Variable rates change with demand; ' +
    'stable rates offer predictability. Keep your health factor above 1.5 to avoid liquidation risk.',

  dca:
    'Dollar-cost averaging (DCA) buys a fixed dollar amount of a token at regular intervals. ' +
    'This smooths out volatility — you buy more when prices are low and less when high.',

  yield:
    'Yield in DeFi comes from lending interest, LP fees, staking rewards, or protocol incentives. ' +
    'Higher yield usually means higher risk (smart contract risk, impermanent loss, liquidation).',
};

export function explainConcept(topic: string): string {
  const key = topic.toLowerCase().trim();
  const explanation = EXPLANATIONS[key];
  if (explanation) return explanation;

  for (const [k, v] of Object.entries(EXPLANATIONS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  return `I don't have a pre-written explanation for "${topic}". I can still help — try asking in more detail or try: swap, health factor, staking, bridge, lp, lend, borrow, dca, yield.`;
}
