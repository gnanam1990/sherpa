import type { AmountCap, Address } from './types.js';

/**
 * Default Stage-1 amount caps. Conservative — mainnet money never flows
 * during Stage 1 (Sepolia only), but the same caps are enforced regardless.
 */
export const DEFAULT_CAPS: readonly AmountCap[] = Object.freeze([
  // USDC (6 decimals): max 500 per tx, 500 per day
  {
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    maxPerTx: 500_000_000n,
    maxPerDay: 500_000_000n,
  },
  // Native ETH: max 0.05 per tx, 0.2 per day
  {
    asset: 'native',
    maxPerTx: 50_000_000_000_000_000n,
    maxPerDay: 200_000_000_000_000_000n,
  },
]);

/**
 * Stage-2 caps for bridge/stake operations.
 *
 * Bridge transactions may carry higher per-tx limits to accommodate relayer
 * fees and cross-chain gas. Stake operations are typically 1:1 with the
 * underlying asset but we allow slightly more headroom for staking wrappers
 * (e.g. stETH rebasing).
 */
export const BRIDGE_CAPS: readonly AmountCap[] = Object.freeze([
  // USDC bridge: max 500 per tx, 2000 per day
  {
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    maxPerTx: 500_000_000n,
    maxPerDay: 2_000_000_000n,
  },
  // Native ETH bridge: max 0.2 per tx, 1.0 per day
  {
    asset: 'native',
    maxPerTx: 200_000_000_000_000_000n,
    maxPerDay: 1_000_000_000_000_000_000n,
  },
]);

export const STAKE_CAPS: readonly AmountCap[] = Object.freeze([
  // USDC stake: max 200 per tx, 1000 per day
  {
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    maxPerTx: 200_000_000n,
    maxPerDay: 1_000_000_000n,
  },
  // Native ETH stake: max 0.1 per tx, 0.5 per day
  {
    asset: 'native',
    maxPerTx: 100_000_000_000_000_000n,
    maxPerDay: 500_000_000_000_000_000n,
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

const dailyUsage = new Map<string, { amount: bigint; day: string }>();

export function checkDailyCap(
  userKey: string,
  amount: bigint,
  maxPerDay: bigint,
): { ok: boolean; error?: string } {
  const today = new Date().toISOString().split('T')[0]!;
  const usage = dailyUsage.get(userKey);

  let currentUsage = 0n;
  if (usage && usage.day === today) {
    currentUsage = usage.amount;
  }

  if (currentUsage + amount > maxPerDay) {
    return {
      ok: false,
      error: `Daily spend limit would be exceeded. Used: $${currentUsage}, Limit: $${maxPerDay}`,
    };
  }

  dailyUsage.set(userKey, { amount: currentUsage + amount, day: today });
  return { ok: true };
}

export function resetDailyUsage(): void {
  dailyUsage.clear();
}

/** Checks per-tx cap (and per-day cap if userKey provided). Returns result object. */
export function assertAmountCap(
  asset: Address | 'native',
  amount: bigint,
  caps: readonly AmountCap[] = DEFAULT_CAPS,
  userKey?: string,
): { ok: boolean; error?: string } {
  const cap = findCap(asset, caps);
  if (!cap) {
    return { ok: false, error: `[safety] no amount cap configured for asset ${String(asset)}` };
  }

  if (userKey && cap.maxPerDay) {
    const dailyResult = checkDailyCap(userKey, amount, cap.maxPerDay);
    if (!dailyResult.ok) return dailyResult;
  }

  if (amount > cap.maxPerTx) {
    return {
      ok: false,
      error: `[safety] amount ${amount} exceeds per-tx cap ${cap.maxPerTx} for ${String(asset)}`,
    };
  }

  return { ok: true };
}
