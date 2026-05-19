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
 * Cross-chain intent parsing extensions (Stage 8).
 *
 * Detects chain mentions in natural language and extracts bridge/swap intents.
 */

export type DetectedChain = {
  chainId: number;
  chainName: string;
  confidence: number;
};

export type CrossChainIntent = {
  type: 'bridge' | 'cross-chain-swap';
  asset: string;
  amount?: string;
  sourceChain?: DetectedChain;
  destinationChain?: DetectedChain;
  recipient?: string;
  confidence: number;
};

const CHAIN_PATTERNS: Array<{ pattern: RegExp; chainId: number; chainName: string }> = [
  { pattern: /\bon\s+polygon\b/i, chainId: 137, chainName: 'polygon' },
  { pattern: /\bon\s+optimism\b/i, chainId: 10, chainName: 'optimism' },
  { pattern: /\bon\s+arbitrum\b/i, chainId: 42161, chainName: 'arbitrum' },
  { pattern: /\bon\s+base\b/i, chainId: 8453, chainName: 'base' },
  { pattern: /\bon\s+arb\b/i, chainId: 42161, chainName: 'arbitrum' },
  { pattern: /\bon\s+op\b/i, chainId: 10, chainName: 'optimism' },
  { pattern: /\bon\s+matic\b/i, chainId: 137, chainName: 'polygon' },
  { pattern: /\bto\s+polygon\b/i, chainId: 137, chainName: 'polygon' },
  { pattern: /\bto\s+optimism\b/i, chainId: 10, chainName: 'optimism' },
  { pattern: /\bto\s+arbitrum\b/i, chainId: 42161, chainName: 'arbitrum' },
  { pattern: /\bto\s+base\b/i, chainId: 8453, chainName: 'base' },
  { pattern: /\bto\s+arb\b/i, chainId: 42161, chainName: 'arbitrum' },
  { pattern: /\bto\s+op\b/i, chainId: 10, chainName: 'optimism' },
  { pattern: /\bfrom\s+base\b/i, chainId: 8453, chainName: 'base' },
  { pattern: /\bfrom\s+polygon\b/i, chainId: 137, chainName: 'polygon' },
  { pattern: /\bfrom\s+optimism\b/i, chainId: 10, chainName: 'optimism' },
  { pattern: /\bfrom\s+arbitrum\b/i, chainId: 42161, chainName: 'arbitrum' },
  { pattern: /\bpolygon\b/i, chainId: 137, chainName: 'polygon' },
  { pattern: /\boptimism\b/i, chainId: 10, chainName: 'optimism' },
  { pattern: /\barbitrum\b/i, chainId: 42161, chainName: 'arbitrum' },
];

const BRIDGE_PATTERNS = [
  /\bbridge\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i,
  /\btransfer\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i,
  /\bsend\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)\s+chain/i,
  /\bmove\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i,
];

export function detectChain(text: string): DetectedChain | undefined {
  for (const { pattern, chainId, chainName } of CHAIN_PATTERNS) {
    if (pattern.test(text)) {
      const confidence = text.toLowerCase().includes(chainName) ? 0.9 : 0.7;
      return { chainId, chainName, confidence };
    }
  }
  return undefined;
}

export function detectAllChains(text: string): DetectedChain[] {
  const chains: DetectedChain[] = [];
  const seen = new Set<number>();

  for (const { pattern, chainId, chainName } of CHAIN_PATTERNS) {
    if (pattern.test(text) && !seen.has(chainId)) {
      seen.add(chainId);
      const confidence = text.toLowerCase().includes(chainName) ? 0.9 : 0.7;
      chains.push({ chainId, chainName, confidence });
    }
  }

  return chains;
}

export function parseBridgeIntent(text: string): CrossChainIntent | undefined {
  for (const pattern of BRIDGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const amount = match[1];
      const asset = match[2]?.toUpperCase() ?? 'USDC';
      const destChainName = match[3]?.toLowerCase() ?? '';

      // Find the destination chain
      const destChain = CHAIN_PATTERNS.find(
        (p) => p.chainName === destChainName || destChainName.startsWith(p.chainName.slice(0, 3)),
      );

      // Detect source chain from context
      const allChains = detectAllChains(text);
      const sourceChain = allChains.find(
        (c) => c.chainId !== destChain?.chainId,
      );

      return {
        type: 'bridge',
        asset,
        amount,
        sourceChain: sourceChain ? { ...sourceChain, confidence: 0.8 } : undefined,
        destinationChain: destChain
          ? { chainId: destChain.chainId, chainName: destChain.chainName, confidence: 0.85 }
          : undefined,
        confidence: destChain ? 0.85 : 0.5,
      };
    }
  }

  return undefined;
}

export function hasChainMention(text: string): boolean {
  return CHAIN_PATTERNS.some((p) => p.pattern.test(text));
}

export function extractChainFromIntent(text: string): { chainId?: number; chainName?: string } {
  const detected = detectChain(text);
  if (detected) {
    return { chainId: detected.chainId, chainName: detected.chainName };
  }
  return {};
}
