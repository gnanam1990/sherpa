import { describe, it, expect } from 'vitest';
import {
  ALLOWED_CONTRACTS,
  assertAllowlisted,
  assertAmountCap,
  buildSendCallsParams,
  checkRings,
  firstFailure,
  isBatchSponsorable,
  ringsOk,
  validateLeverage,
  validateFlashLoan,
  validateSecuritySettings,
  validateFeeAmount,
  validateTimeLock,
  validateDCASchedule,
  validateAlert,
  validateAutoRepay,
  validateTip,
  validateBridgeChains,
  validateCollect,
  validateSessionKey,
  validateStrategy,
  validateRebalance,
  assessBorrowRisk,
  checkBorrowCapacity,
  assertMainnetSafety,
  assessLPRisk,
  assessBetRisk,
  validateFeeTransfer,
  isWhitelisted,
  registerAllowlistedAddress,
  clearDynamicAllowlist,
  type Call,
  type PendingTx,
} from './index.js';

const goodTx: PendingTx = {
  to: ALLOWED_CONTRACTS.USDC,
  data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  value: 0n,
  asset: ALLOWED_CONTRACTS.USDC,
  amount: 1_000_000n,
  recipientSource: 'direct',
};

describe('safety/allowlist', () => {
  it('exports USDC on Base Sepolia', () => {
    expect(ALLOWED_CONTRACTS.USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('accepts an allowlisted address', () => {
    expect(() => assertAllowlisted(ALLOWED_CONTRACTS.USDC)).not.toThrow();
  });

  it('rejects an unknown address', () => {
    expect(() => assertAllowlisted('0x1111111111111111111111111111111111111111')).toThrow(
      /not in allowlist/,
    );
  });
});

describe('safety/caps', () => {
  it('accepts small USDC amounts', () => {
    expect(() => assertAmountCap(ALLOWED_CONTRACTS.USDC, 1_000_000n)).not.toThrow();
  });

  it('rejects amounts over per-tx cap', () => {
    expect(() => assertAmountCap(ALLOWED_CONTRACTS.USDC, 1_000_000_000n)).toThrow(
      /exceeds per-tx cap/,
    );
  });
});

describe('safety/rings', () => {
  it('all green for a clean tx', async () => {
    const results = await checkRings(goodTx);
    expect(ringsOk(results)).toBe(true);
    expect(firstFailure(results)).toBeUndefined();
  });

  it('fails ring1 for a non-allowlisted target', async () => {
    const results = await checkRings({
      ...goodTx,
      to: '0x1111111111111111111111111111111111111111',
    });
    expect(ringsOk(results)).toBe(false);
    expect(firstFailure(results)?.ring).toBe('ring1_allowlist');
  });

  it('fails ring2 for oversized amount', async () => {
    const results = await checkRings({ ...goodTx, amount: 9_999_999_999n });
    expect(firstFailure(results)?.ring).toBe('ring2_amount_cap');
  });

  it('fails ring6 when simulation rejects', async () => {
    const results = await checkRings(goodTx, {
      simulate: () => ({ ok: false, errorCode: 'SIMULATION_REVERT', errorMessage: 'reverted' }),
    });
    expect(firstFailure(results)?.ring).toBe('ring6_simulation');
  });

  it('ring6 passes with successful simulation', async () => {
    const results = await checkRings(goodTx, {
      simulate: () => ({ ok: true, gasEstimate: 50000n }),
    });
    expect(ringsOk(results)).toBe(true);
  });

  it('ring6 passes when no simulate callback provided', async () => {
    const results = await checkRings(goodTx);
    expect(ringsOk(results)).toBe(true);
  });

  it('ring6 passes through async simulate returning SimulationCheckResult', async () => {
    const results = await checkRings(goodTx, {
      simulate: async () => ({ ok: true, gasEstimate: 75000n }),
    });
    expect(ringsOk(results)).toBe(true);
  });

  it('ring6 fails with INSUFFICIENT_FUNDS_FOR_GAS', async () => {
    const results = await checkRings(goodTx, {
      simulate: () => ({
        ok: false,
        errorCode: 'INSUFFICIENT_FUNDS_FOR_GAS',
        errorMessage: 'insufficient balance',
      }),
    });
    const fail = firstFailure(results);
    expect(fail?.ring).toBe('ring6_simulation');
    expect(fail && !fail.ok && fail.reason).toContain('insufficient balance');
  });
});

describe('safety/sponsor', () => {
  const from = '0x1111111111111111111111111111111111111111' as const;
  const calls: Call[] = [
    { to: ALLOWED_CONTRACTS.USDC, data: '0xabcd', value: 0n },
    { to: ALLOWED_CONTRACTS.UNISWAP_ROUTER, data: '0x04e45aaf', value: 0n },
  ];

  it('builds an EIP-5792 envelope with hex chainId + values', () => {
    const env = buildSendCallsParams(calls, { chainId: 84532, from });
    expect(env.version).toBe('1.0');
    expect(env.chainId).toBe('0x14a34');
    expect(env.from).toBe(from);
    expect(env.calls.length).toBe(2);
    expect(env.calls[0]?.value).toBe('0x0');
    expect(env.capabilities).toBeUndefined();
  });

  it('includes paymasterService when url provided', () => {
    const env = buildSendCallsParams(calls, {
      chainId: 84532,
      from,
      paymasterUrl: 'https://paymaster.example/rpc',
    });
    expect(env.capabilities?.paymasterService?.url).toBe('https://paymaster.example/rpc');
  });

  it('throws on empty call list', () => {
    expect(() => buildSendCallsParams([], { chainId: 84532, from })).toThrow();
  });

  it('isBatchSponsorable: true when all values zero', () => {
    expect(isBatchSponsorable(calls)).toBe(true);
  });

  it('isBatchSponsorable: false when any call carries native value', () => {
    expect(
      isBatchSponsorable([...calls, { to: from, data: '0x', value: 1n }]),
    ).toBe(false);
  });
});

describe('safety/ring4_recipient', () => {
  it('passes for direct recipient source', async () => {
    const results = await checkRings(goodTx);
    const ring4 = results.find((r) => r.ring === 'ring4_recipient');
    expect(ring4?.ok).toBe(true);
  });

  it('passes for farcaster recipient source', async () => {
    const results = await checkRings({ ...goodTx, recipientSource: 'farcaster' });
    const ring4 = results.find((r) => r.ring === 'ring4_recipient');
    expect(ring4?.ok).toBe(true);
  });

  it('passes for ens recipient source', async () => {
    const results = await checkRings({ ...goodTx, recipientSource: 'ens' });
    const ring4 = results.find((r) => r.ring === 'ring4_recipient');
    expect(ring4?.ok).toBe(true);
  });

  it('passes for basename recipient source', async () => {
    const results = await checkRings({ ...goodTx, recipientSource: 'basename' });
    const ring4 = results.find((r) => r.ring === 'ring4_recipient');
    expect(ring4?.ok).toBe(true);
  });

  it('fails for untrusted recipient source', async () => {
    const results = await checkRings({ ...goodTx, recipientSource: 'unknown' });
    const ring4 = results.find((r) => r.ring === 'ring4_recipient');
    expect(ring4?.ok).toBe(false);
  });
});

describe('safety/ring3_rate_limit', () => {
  it('passes when rate limit check returns true', async () => {
    const results = await checkRings(goodTx, {
      checkRateLimit: () => true,
    });
    const ring3 = results.find((r) => r.ring === 'ring3_rate_limit');
    expect(ring3?.ok).toBe(true);
  });

  it('fails when rate limit check returns false', async () => {
    const results = await checkRings(goodTx, {
      checkRateLimit: () => false,
    });
    const ring3 = results.find((r) => r.ring === 'ring3_rate_limit');
    expect(ring3?.ok).toBe(false);
  });

  it('passes when no rate limit check provided', async () => {
    const results = await checkRings(goodTx);
    const ring3 = results.find((r) => r.ring === 'ring3_rate_limit');
    expect(ring3?.ok).toBe(true);
  });
});

describe('safety/validateLeverage', () => {
  it('accepts valid leverage ratio', () => {
    expect(validateLeverage({ ratio: 2 }).ok).toBe(true);
  });

  it('accepts leverage at max default (5x)', () => {
    expect(validateLeverage({ ratio: 5 }).ok).toBe(true);
  });

  it('rejects leverage below 1', () => {
    expect(validateLeverage({ ratio: 0.5 }).ok).toBe(false);
  });

  it('rejects leverage above max', () => {
    expect(validateLeverage({ ratio: 10 }).ok).toBe(false);
  });

  it('accepts custom max ratio', () => {
    expect(validateLeverage({ ratio: 10, maxRatio: 20 }).ok).toBe(true);
  });

  it('rejects when custom max exceeded', () => {
    expect(validateLeverage({ ratio: 3, maxRatio: 2 }).ok).toBe(false);
  });
});

describe('safety/validateFlashLoan', () => {
  it('accepts amount within default max', () => {
    expect(validateFlashLoan({ amount: 1000000000n }).ok).toBe(true);
  });

  it('rejects amount exceeding default max ($1M)', () => {
    expect(validateFlashLoan({ amount: 2000000000000n }).ok).toBe(false);
  });

  it('accepts amount within custom max', () => {
    expect(validateFlashLoan({ amount: 500n, maxAmount: 1000n }).ok).toBe(true);
  });

  it('rejects amount exceeding custom max', () => {
    expect(validateFlashLoan({ amount: 1500n, maxAmount: 1000n }).ok).toBe(false);
  });
});

describe('safety/validateSecuritySettings', () => {
  it('accepts valid multisig config', () => {
    const result = validateSecuritySettings({ threshold: 2, signers: ['0x1', '0x2', '0x3'] });
    expect(result.ok).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects threshold below 1', () => {
    const result = validateSecuritySettings({ threshold: 0, signers: ['0x1'] });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Multi-sig threshold must be at least 1');
  });

  it('rejects threshold exceeding signers count', () => {
    const result = validateSecuritySettings({ threshold: 3, signers: ['0x1', '0x2'] });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Threshold cannot exceed number of signers');
  });

  it('rejects more than 10 signers', () => {
    const signers = Array.from({ length: 11 }, (_, i) => `0x${i}`);
    const result = validateSecuritySettings({ threshold: 1, signers });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Maximum 10 signers allowed');
  });

  it('collects multiple errors', () => {
    const signers = Array.from({ length: 11 }, (_, i) => `0x${i}`);
    const result = validateSecuritySettings({ threshold: 12, signers });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(2);
  });
});

describe('safety/validateFeeAmount', () => {
  it('accepts fee within max bps', () => {
    expect(validateFeeAmount(10n, 100, 10000n).ok).toBe(true);
  });

  it('rejects fee exceeding max bps', () => {
    expect(validateFeeAmount(200n, 100, 10000n).ok).toBe(false);
  });

  it('accepts zero fee', () => {
    expect(validateFeeAmount(0n, 100, 10000n).ok).toBe(true);
  });

  it('calculates max fee correctly', () => {
    // 50 bps of 10000 = 50
    expect(validateFeeAmount(50n, 50, 10000n).ok).toBe(true);
    expect(validateFeeAmount(51n, 50, 10000n).ok).toBe(false);
  });
});

describe('safety/validateTimeLock', () => {
  it('accepts time in the future', () => {
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    expect(validateTimeLock({ scheduledTime: futureTime }).ok).toBe(true);
  });

  it('rejects time in the past', () => {
    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    expect(validateTimeLock({ scheduledTime: pastTime }).ok).toBe(false);
  });

  it('rejects time too close to now', () => {
    const tooSoon = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now
    expect(validateTimeLock({ scheduledTime: tooSoon }).ok).toBe(false);
  });

  it('accepts custom min delay', () => {
    const time = Math.floor(Date.now() / 1000) + 120; // 2 min from now
    expect(validateTimeLock({ scheduledTime: time, minDelay: 60 }).ok).toBe(true);
    expect(validateTimeLock({ scheduledTime: time, minDelay: 180 }).ok).toBe(false);
  });
});

describe('safety/validateDCASchedule', () => {
  it('accepts valid DCA params', () => {
    expect(validateDCASchedule({ amountPerTick: 1000000n }).ok).toBe(true);
  });

  it('rejects zero amount', () => {
    expect(validateDCASchedule({ amountPerTick: 0n }).ok).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(validateDCASchedule({ amountPerTick: -1n }).ok).toBe(false);
  });

  it('rejects budget less than one tick', () => {
    expect(validateDCASchedule({ amountPerTick: 100n, totalBudget: 50n }).ok).toBe(false);
  });

  it('accepts budget equal to one tick', () => {
    expect(validateDCASchedule({ amountPerTick: 100n, totalBudget: 100n }).ok).toBe(true);
  });

  it('rejects maxExecutions below 1 when truthy', () => {
    // Note: maxExecutions: 0 is falsy in JS, so the check is skipped
    expect(validateDCASchedule({ amountPerTick: 100n, maxExecutions: -1 }).ok).toBe(false);
  });
});

describe('safety/validateAlert', () => {
  it('accepts valid price alert', () => {
    expect(validateAlert({ conditionType: 'price', threshold: 5000, comparison: '>' }).ok).toBe(true);
  });

  it('rejects zero price threshold', () => {
    expect(validateAlert({ conditionType: 'price', threshold: 0, comparison: '>' }).ok).toBe(false);
  });

  it('rejects negative price threshold', () => {
    expect(validateAlert({ conditionType: 'price', threshold: -100, comparison: '>' }).ok).toBe(false);
  });

  it('accepts health factor above 1.0', () => {
    expect(validateAlert({ conditionType: 'health-factor', threshold: 1.5, comparison: '<' }).ok).toBe(true);
  });

  it('rejects health factor below 1.0', () => {
    expect(validateAlert({ conditionType: 'health-factor', threshold: 0.8, comparison: '<' }).ok).toBe(false);
  });

  it('accepts health factor exactly 1.0', () => {
    expect(validateAlert({ conditionType: 'health-factor', threshold: 1.0, comparison: '<' }).ok).toBe(true);
  });
});

describe('safety/validateAutoRepay', () => {
  it('accepts valid auto-repay params', () => {
    expect(validateAutoRepay({ triggerHF: 1.2, targetHF: 1.5, currentHF: 2.0 }).ok).toBe(true);
  });

  it('rejects trigger HF >= current HF', () => {
    expect(validateAutoRepay({ triggerHF: 2.0, targetHF: 2.5, currentHF: 2.0 }).ok).toBe(false);
  });

  it('rejects target HF <= trigger HF', () => {
    expect(validateAutoRepay({ triggerHF: 1.2, targetHF: 1.1, currentHF: 2.0 }).ok).toBe(false);
  });

  it('rejects target HF > current HF', () => {
    expect(validateAutoRepay({ triggerHF: 1.2, targetHF: 2.5, currentHF: 2.0 }).ok).toBe(false);
  });
});

describe('safety/validateTip', () => {
  it('accepts valid tip amount', () => {
    expect(validateTip({ amount: 5000000n }).ok).toBe(true); // $5
  });

  it('rejects zero tip', () => {
    expect(validateTip({ amount: 0n }).ok).toBe(false);
  });

  it('rejects negative tip', () => {
    expect(validateTip({ amount: -1n }).ok).toBe(false);
  });

  it('rejects tip exceeding max ($1000)', () => {
    expect(validateTip({ amount: 2000000000n }).ok).toBe(false);
  });

  it('accepts tip at max ($1000)', () => {
    expect(validateTip({ amount: 1000000000n }).ok).toBe(true);
  });
});

describe('safety/validateBridgeChains', () => {
  const supported = { ethereum: 1, base: 8453, arbitrum: 42161 };

  it('accepts valid source and dest chains', () => {
    expect(validateBridgeChains('ethereum', 'base', supported).ok).toBe(true);
  });

  it('rejects unsupported source chain', () => {
    expect(validateBridgeChains('polygon', 'base', supported).ok).toBe(false);
  });

  it('rejects unsupported dest chain', () => {
    expect(validateBridgeChains('base', 'polygon', supported).ok).toBe(false);
  });

  it('rejects same source and dest', () => {
    expect(validateBridgeChains('base', 'base', supported).ok).toBe(false);
  });
});

describe('safety/validateCollect', () => {
  it('accepts valid quantity', () => {
    expect(validateCollect({ quantity: 1 }).ok).toBe(true);
  });

  it('rejects zero quantity', () => {
    expect(validateCollect({ quantity: 0 }).ok).toBe(false);
  });

  it('rejects quantity above default max (10)', () => {
    expect(validateCollect({ quantity: 11 }).ok).toBe(false);
  });

  it('accepts quantity at max', () => {
    expect(validateCollect({ quantity: 10 }).ok).toBe(true);
  });

  it('accepts custom max', () => {
    expect(validateCollect({ quantity: 5, maxPerTx: 3 }).ok).toBe(false);
    expect(validateCollect({ quantity: 3, maxPerTx: 5 }).ok).toBe(true);
  });
});

describe('safety/validateSessionKey', () => {
  it('accepts valid session key params', () => {
    const result = validateSessionKey({
      spendLimit: 1000000000n,
      validDuration: 86400,
      permissions: [{ target: '0x1' }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects spend limit exceeding $10,000', () => {
    const result = validateSessionKey({
      spendLimit: 20000000000n,
      validDuration: 86400,
      permissions: [{ target: '0x1' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('spend limit');
  });

  it('rejects duration exceeding 30 days', () => {
    const result = validateSessionKey({
      spendLimit: 1000000000n,
      validDuration: 31 * 24 * 60 * 60,
      permissions: [{ target: '0x1' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('duration');
  });

  it('rejects more than 10 permissions', () => {
    const permissions = Array.from({ length: 11 }, (_, i) => ({ target: `0x${i}` }));
    const result = validateSessionKey({
      spendLimit: 1000000000n,
      validDuration: 86400,
      permissions,
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('permissions');
  });
});

describe('safety/validateStrategy', () => {
  it('accepts valid strategy', () => {
    const result = validateStrategy({
      intents: [{ type: 'SWAP' }, { type: 'LEND' }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects too many steps', () => {
    const intents = Array.from({ length: 11 }, () => ({ type: 'SWAP' }));
    const result = validateStrategy({ intents });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('too many steps');
  });

  it('rejects unsupported intent type', () => {
    const result = validateStrategy({
      intents: [{ type: 'SWAP' }, { type: 'HACK' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('unsupported intent');
  });

  it('accepts custom max steps', () => {
    const intents = Array.from({ length: 5 }, () => ({ type: 'SWAP' }));
    expect(validateStrategy({ intents, maxSteps: 3 }).ok).toBe(false);
    expect(validateStrategy({ intents, maxSteps: 5 }).ok).toBe(true);
  });
});

describe('safety/validateRebalance', () => {
  it('accepts drift within default max (50%)', () => {
    expect(validateRebalance({ driftPercent: 30 }).ok).toBe(true);
  });

  it('rejects drift exceeding default max', () => {
    expect(validateRebalance({ driftPercent: 60 }).ok).toBe(false);
  });

  it('accepts drift at max', () => {
    expect(validateRebalance({ driftPercent: 50 }).ok).toBe(true);
  });

  it('accepts custom max drift', () => {
    expect(validateRebalance({ driftPercent: 20, maxDrift: 15 }).ok).toBe(false);
    expect(validateRebalance({ driftPercent: 10, maxDrift: 15 }).ok).toBe(true);
  });
});

describe('safety/assessBorrowRisk', () => {
  it('returns danger badge for HF below 1.1', () => {
    const badges = assessBorrowRisk(1.05);
    expect(badges.length).toBe(1);
    expect(badges[0]?.type).toBe('HEALTH_FACTOR_DANGER');
    expect(badges[0]?.severity).toBe('red');
  });

  it('returns warning badge for HF between 1.1 and 1.5', () => {
    const badges = assessBorrowRisk(1.3);
    expect(badges.length).toBe(1);
    expect(badges[0]?.type).toBe('HEALTH_FACTOR_WARNING');
    expect(badges[0]?.severity).toBe('yellow');
  });

  it('returns no badges for HF above 1.5', () => {
    const badges = assessBorrowRisk(2.0);
    expect(badges.length).toBe(0);
  });
});

describe('safety/checkBorrowCapacity', () => {
  it('accepts borrow within capacity', () => {
    expect(checkBorrowCapacity(1000n, 500n).ok).toBe(true);
  });

  it('rejects borrow exceeding capacity', () => {
    expect(checkBorrowCapacity(1000n, 1500n).ok).toBe(false);
  });

  it('accepts borrow at exact capacity', () => {
    expect(checkBorrowCapacity(1000n, 1000n).ok).toBe(true);
  });
});

describe('safety/assertMainnetSafety', () => {
  it('passes on testnet regardless of config', () => {
    const result = assertMainnetSafety({
      isMainnet: false,
      feeEnabled: false,
      simulationFailOpen: true,
    });
    expect(result.ok).toBe(true);
  });

  it('passes on mainnet with correct config', () => {
    const result = assertMainnetSafety({
      isMainnet: true,
      feeEnabled: true,
      treasuryAddress: '0x1234',
      simulationFailOpen: false,
    });
    expect(result.ok).toBe(true);
  });

  it('fails on mainnet without fee enabled', () => {
    const result = assertMainnetSafety({
      isMainnet: true,
      feeEnabled: false,
      treasuryAddress: '0x1234',
      simulationFailOpen: false,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Protocol fee must be enabled on mainnet');
  });

  it('fails on mainnet without treasury', () => {
    const result = assertMainnetSafety({
      isMainnet: true,
      feeEnabled: true,
      simulationFailOpen: false,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Fee treasury address required on mainnet');
  });

  it('fails on mainnet with fail-open simulation', () => {
    const result = assertMainnetSafety({
      isMainnet: true,
      feeEnabled: true,
      treasuryAddress: '0x1234',
      simulationFailOpen: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Simulation must be fail-closed on mainnet');
  });

  it('collects all mainnet errors', () => {
    const result = assertMainnetSafety({
      isMainnet: true,
      feeEnabled: false,
      simulationFailOpen: true,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(3);
  });
});

describe('safety/assessLPRisk', () => {
  it('returns no badges for low price impact', () => {
    const badges = assessLPRisk(50, false);
    expect(badges.length).toBe(0);
  });

  it('returns high price impact badge when > 1%', () => {
    const badges = assessLPRisk(150, false);
    expect(badges.length).toBe(1);
    expect(badges[0]?.type).toBe('PRICE_IMPACT_HIGH');
    expect(badges[0]?.severity).toBe('red');
  });

  it('returns IL warning when flagged', () => {
    const badges = assessLPRisk(50, true);
    expect(badges.length).toBe(1);
    expect(badges[0]?.type).toBe('IMPERMANENT_LOSS');
    expect(badges[0]?.severity).toBe('yellow');
  });

  it('returns both badges when both conditions met', () => {
    const badges = assessLPRisk(200, true);
    expect(badges.length).toBe(2);
  });
});

describe('safety/assessBetRisk', () => {
  it('returns no badges for normal bet', () => {
    const badges = assessBetRisk(
      { liquidity: 1000000n, status: 'active' },
      10000n,
    );
    expect(badges.length).toBe(0);
  });

  it('returns resolved market badge', () => {
    const badges = assessBetRisk(
      { liquidity: 1000000n, status: 'resolved' },
      10000n,
    );
    expect(badges.length).toBe(1);
    expect(badges[0]?.type).toBe('MARKET_RESOLVED');
    expect(badges[0]?.severity).toBe('red');
  });

  it('returns large bet badge when > 10% of liquidity', () => {
    const badges = assessBetRisk(
      { liquidity: 100000n, status: 'active' },
      20000n,
    );
    expect(badges.length).toBe(1);
    expect(badges[0]?.type).toBe('BET_AMOUNT_LARGE');
    expect(badges[0]?.severity).toBe('yellow');
  });
});

describe('safety/validateFeeTransfer', () => {
  const treasury = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

  it('accepts valid fee transfer', () => {
    expect(validateFeeTransfer({ to: treasury, value: 10n }, treasury, 100, 10000n).ok).toBe(true);
  });

  it('rejects wrong treasury address', () => {
    const wrongTreasury = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`;
    expect(validateFeeTransfer({ to: wrongTreasury, value: 10n }, treasury, 100, 10000n).ok).toBe(false);
  });

  it('rejects fee exceeding max', () => {
    expect(validateFeeTransfer({ to: treasury, value: 200n }, treasury, 100, 10000n).ok).toBe(false);
  });
});

describe('safety/isWhitelisted', () => {
  it('returns true for whitelisted address', () => {
    const whitelist = new Set(['0x1234']);
    expect(isWhitelisted('0x1234' as `0x${string}`, whitelist)).toBe(true);
  });

  it('returns false for non-whitelisted address', () => {
    const whitelist = new Set(['0x1234']);
    expect(isWhitelisted('0x5678' as `0x${string}`, whitelist)).toBe(false);
  });

  it('is case-insensitive', () => {
    const whitelist = new Set(['0xabcd']);
    expect(isWhitelisted('0xABCD' as `0x${string}`, whitelist)).toBe(true);
  });
});

describe('safety/dynamicAllowlist', () => {
  it('registers and clears dynamic addresses', () => {
    const addr = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as `0x${string}`;
    registerAllowlistedAddress(addr);
    expect(() => assertAllowlisted(addr)).not.toThrow();
    clearDynamicAllowlist();
    expect(() => assertAllowlisted(addr)).toThrow(/not in allowlist/);
  });
});
