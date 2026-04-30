/** 0x-prefixed hex address. Narrowed by safety layer before use. */
export type Address = `0x${string}`;

/** The seven safety rings. */
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
