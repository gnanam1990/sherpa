/** 0x-prefixed hex address (20-byte). */
export type Address = `0x${string}`;

/** The seven safety rings, checked in order per M1_BACKEND_PACK. */
export type SafetyRing =
  | 'ring1_allowlist'
  | 'ring2_amount_cap'
  | 'ring3_rate_limit'
  | 'ring4_recipient'
  | 'ring5_audit_log'
  | 'ring6_simulation'
  | 'ring7_user_confirmation';

export type RingCheckResult =
  | { ok: true; ring: SafetyRing }
  | { ok: false; ring: SafetyRing; reason: string };

export type AmountCap = {
  asset: Address | 'native';
  /** Cap in the asset's smallest unit (wei / base units). */
  maxPerTx: bigint;
  maxPerDay: bigint;
};

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowSec: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/** Minimum tx shape safety needs to vet. */
export type PendingTx = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  /** Semantic asset + amount the executor extracted (for amount caps). */
  asset: Address | 'native';
  amount: bigint;
  /** Recipient resolution source; must not be `'llm'`. */
  recipientSource: 'farcaster' | 'basename' | 'ens' | 'direct';
};
