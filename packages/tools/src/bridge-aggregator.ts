/**
 * Bridge aggregator — routes to the best bridge protocol.
 *
 * Compares Across and LayerZero quotes, returns the cheapest/fastest option.
 */

import type { Address } from '@sherpa/safety';
import { getBridgeQuote, buildBridgeCall, type BridgeParams, type BridgeQuote } from './across/index.js';
import { getLayerZeroQuote, buildLayerZeroCall, type LayerZeroParams, type LayerZeroQuote } from './layerzero/index.js';
import type { BuiltTx } from './types.js';

export type BridgeProtocol = 'across' | 'layerzero';

export type AggregatedBridgeQuote = {
  protocol: BridgeProtocol;
  fee: bigint;
  estimatedTime: number;
  minOutAmount: bigint;
  acrossQuote?: BridgeQuote;
  layerZeroQuote?: LayerZeroQuote;
};

export type BridgeRouteParams = {
  asset: string;
  amount: bigint;
  sourceChain: string;
  destinationChain: string;
  recipient: Address;
  sender: Address;
  preferSpeed?: boolean;
};

const CHAIN_NAME_MAP: Record<string, string> = {
  base: 'base',
  'base-mainnet': 'base',
  polygon: 'polygon',
  optimism: 'optimism',
  arbitrum: 'arbitrum',
  ethereum: 'ethereum',
};

function normalizeChainName(name: string): string {
  return CHAIN_NAME_MAP[name.toLowerCase()] ?? name.toLowerCase();
}

export async function getBestBridgeQuote(params: BridgeRouteParams): Promise<AggregatedBridgeQuote> {
  const src = normalizeChainName(params.sourceChain);
  const dst = normalizeChainName(params.destinationChain);

  const quotes: AggregatedBridgeQuote[] = [];

  // Try Across
  try {
    const acrossParams: BridgeParams = {
      asset: params.asset,
      amount: params.amount,
      sourceChain: src,
      destinationChain: dst,
    };
    const acrossQ = await getBridgeQuote(acrossParams);
    quotes.push({
      protocol: 'across',
      fee: acrossQ.relayerFee,
      estimatedTime: acrossQ.estimatedTime,
      minOutAmount: acrossQ.minOutAmount,
      acrossQuote: acrossQ,
    });
  } catch {
    // Across doesn't support this pair
  }

  // Try LayerZero
  try {
    const lzParams: LayerZeroParams = {
      asset: params.asset,
      amount: params.amount,
      sourceChain: src,
      destinationChain: dst,
      recipient: params.recipient,
    };
    const lzQ = await getLayerZeroQuote(lzParams);
    quotes.push({
      protocol: 'layerzero',
      fee: lzQ.nativeFee,
      estimatedTime: lzQ.estimatedTime,
      minOutAmount: params.amount - lzQ.nativeFee,
      layerZeroQuote: lzQ,
    });
  } catch {
    // LayerZero doesn't support this chain
  }

  if (quotes.length === 0) {
    throw new Error(`No bridge available for ${src} → ${dst}`);
  }

  // Sort by preference
  if (params.preferSpeed) {
    quotes.sort((a, b) => a.estimatedTime - b.estimatedTime);
  } else {
    quotes.sort((a, b) => (a.fee < b.fee ? -1 : a.fee > b.fee ? 1 : 0));
  }

  return quotes[0]!;
}

export async function buildBestBridgeCall(
  params: BridgeRouteParams,
): Promise<{ quote: AggregatedBridgeQuote; tx: BuiltTx }> {
  const q = await getBestBridgeQuote(params);

  if (q.protocol === 'across' && q.acrossQuote) {
    const result = await buildBridgeCall(
      { asset: params.asset, amount: params.amount, sourceChain: params.sourceChain, destinationChain: params.destinationChain },
      q.acrossQuote,
      params.sender,
      params.recipient,
      params.sender, // input token = sender for stub
    );
    return {
      quote: q,
      tx: { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable },
    };
  }

  if (q.protocol === 'layerzero' && q.layerZeroQuote) {
    const result = await buildLayerZeroCall(
      { asset: params.asset, amount: params.amount, sourceChain: params.sourceChain, destinationChain: params.destinationChain, recipient: params.recipient },
      q.layerZeroQuote,
      params.sender,
    );
    return {
      quote: q,
      tx: { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable },
    };
  }

  throw new Error('Failed to build bridge call');
}
