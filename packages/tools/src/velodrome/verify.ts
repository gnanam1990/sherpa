import type { BuiltTx, VerifyResult } from '../types.js';
import { SWAP_EXACT_TOKENS_SELECTOR } from './swap-builder.js';
import type { VelodromeDeps } from './types.js';

const DEFAULT_ROUTER = '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858';

export async function verifySwap(
  tx: BuiltTx,
  deps: VelodromeDeps = {},
): Promise<VerifyResult> {
  const routerAddress = deps.routerAddress ?? DEFAULT_ROUTER;
  if (tx.to.toLowerCase() !== routerAddress.toLowerCase()) {
    return { ok: false, reason: 'target is not Velodrome router' };
  }
  if (tx.value !== 0n) {
    return { ok: false, reason: 'SWAP via ERC-20 must have value=0' };
  }
  if (!tx.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)) {
    return { ok: false, reason: 'calldata is not swapExactTokensForTokens' };
  }
  return { ok: true };
}
