import type { Address } from '@sherpa/safety';
import type { LayerZeroParams, LayerZeroQuote } from './types.js';
import { LZ_ENDPOINT_IDS, LZ_ENDPOINTS, isLayerZeroSupported } from './types.js';

export class LayerZeroNotSupportedError extends Error {
  constructor(chain: string) {
    super(`LayerZero not supported on chain: ${chain}`);
    this.name = 'LayerZeroNotSupportedError';
  }
}

export async function getLayerZeroQuote(params: LayerZeroParams): Promise<LayerZeroQuote> {
  const srcChain = params.sourceChain.toLowerCase();
  const dstChain = params.destinationChain.toLowerCase();

  if (!isLayerZeroSupported(srcChain)) throw new LayerZeroNotSupportedError(srcChain);
  if (!isLayerZeroSupported(dstChain)) throw new LayerZeroNotSupportedError(dstChain);

  const dstEndpointId = LZ_ENDPOINT_IDS[dstChain]!;

  // Stub fee estimation: 0.1% of amount + base fee
  const nativeFee = params.amount / 1000n + 1000000000000000n; // 0.001 ETH base
  const lzTokenFee = 0n; // LZ token fee usually 0 for standard sends

  // L2-to-L2 is fast, L1 involvement adds time
  const isL1Involved = srcChain === 'ethereum' || dstChain === 'ethereum';
  const estimatedTime = isL1Involved ? 900 : 180;

  return {
    nativeFee,
    lzTokenFee,
    estimatedTime,
    destinationEndpointId: dstEndpointId,
  };
}

const SEND_ULTRA_LIGHT_PACKET_ABI = [
  {
    type: 'function',
    name: 'send',
    stateMutability: 'payable',
    inputs: [
      { name: '_dstEid', type: 'uint32' },
      { name: '_message', type: 'bytes' },
      { name: '_options', type: 'bytes' },
      { name: '_fee', type: 'tuple', components: [
        { name: 'nativeFee', type: 'uint256' },
        { name: 'lzTokenFee', type: 'uint256' },
      ]},
      { name: '_refundAddress', type: 'address' },
    ],
    outputs: [],
  },
] as const;

export type LayerZeroCallResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
};

export async function buildLayerZeroCall(
  params: LayerZeroParams,
  quote: LayerZeroQuote,
  sender: Address,
): Promise<LayerZeroCallResult> {
  const srcChain = params.sourceChain.toLowerCase();
  const endpoint = LZ_ENDPOINTS[srcChain];
  if (!endpoint) throw new LayerZeroNotSupportedError(srcChain);

  // Encode a simple message: recipient + amount
  const message = params.recipient + params.amount.toString(16).padStart(64, '0');

  // Minimal options: no gas on destination for simple transfer
  const options = '0x';

  const { encodeFunctionData } = await import('viem');
  const data = encodeFunctionData({
    abi: SEND_ULTRA_LIGHT_PACKET_ABI,
    functionName: 'send',
    args: [
      quote.destinationEndpointId,
      message as `0x${string}`,
      options as `0x${string}`,
      { nativeFee: quote.nativeFee, lzTokenFee: quote.lzTokenFee },
      sender,
    ],
  });

  return {
    to: endpoint,
    data,
    value: quote.nativeFee,
    sponsorable: false,
  };
}
