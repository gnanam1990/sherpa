import type { AmountCap, Address } from './types.js';

/**
 * Default Stage-1 amount caps. Conservative — mainnet money never flows
 * during Stage 1 (Sepolia only), but the same caps are enforced regardless.
 */
export const DEFAULT_CAPS: readonly AmountCap[] = Object.freeze([
  // USDC (6 decimals): max 100 per tx, 500 per day
  {
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    maxPerTx: 100_000_000n,
    maxPerDay: 500_000_000n,
  },
  // Native ETH: max 0.05 per tx, 0.2 per day
  {
    asset: 'native',
    maxPerTx: 50_000_000_000_000_000n,
    maxPerDay: 200_000_000_000_000_000n,
  },
]);

export function findCap(
  asset: Address | 'native',
  caps: readonly AmountCap[] = DEFAULT_CAPS,
): AmountCap | undefined {
  return caps.find(
    (c) =>
      c.asset === asset ||
      (typeof c.asset === 'string' &&
        typeof asset === 'string' &&
        c.asset.toLowerCase() === asset.toLowerCase()),
  );
}

/** Throws if `amount` exceeds the per-tx cap for the given asset. */
export function assertAmountCap(
  asset: Address | 'native',
  amount: bigint,
  caps: readonly AmountCap[] = DEFAULT_CAPS,
): void {
  const cap = findCap(asset, caps);
  if (!cap) {
    throw new Error(`[safety] no amount cap configured for asset ${String(asset)}`);
  }
  if (amount > cap.maxPerTx) {
    throw new Error(
      `[safety] amount ${amount} exceeds per-tx cap ${cap.maxPerTx} for ${String(asset)}`,
    );
  }
}
