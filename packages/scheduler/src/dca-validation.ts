export const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'] as const;
export type Frequency = (typeof VALID_FREQUENCIES)[number];

export const VALID_END_CONDITIONS = ['never', 'count', 'date'] as const;
export type EndCondition = (typeof VALID_END_CONDITIONS)[number];

export type ValidationResult = { ok: true } | { ok: false; error: string };

export interface DCAValidationParams {
  frequency: string;
  amountPerTick: string;
  endCondition?: string;
  maxExecutions?: number;
  endDate?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay?: number;
}

export function validateDCASchedule(params: DCAValidationParams): ValidationResult {
  if (!VALID_FREQUENCIES.includes(params.frequency as Frequency)) {
    return { ok: false, error: `Invalid frequency: ${params.frequency}. Must be one of: ${VALID_FREQUENCIES.join(', ')}` };
  }

  const amount = Number(params.amountPerTick);
  if (!params.amountPerTick || isNaN(amount) || amount <= 0) {
    return { ok: false, error: 'amountPerTick must be a positive number' };
  }

  if (amount > 1_000_000) {
    return { ok: false, error: 'amountPerTick exceeds maximum of 1,000,000' };
  }

  const endCondition = params.endCondition ?? 'never';
  if (!VALID_END_CONDITIONS.includes(endCondition as EndCondition)) {
    return { ok: false, error: `Invalid endCondition: ${endCondition}. Must be one of: ${VALID_END_CONDITIONS.join(', ')}` };
  }

  if (endCondition === 'count') {
    if (!params.maxExecutions || params.maxExecutions < 1) {
      return { ok: false, error: 'maxExecutions must be a positive integer when endCondition is "count"' };
    }
    if (params.maxExecutions > 10000) {
      return { ok: false, error: 'maxExecutions exceeds maximum of 10,000' };
    }
  }

  if (endCondition === 'date') {
    if (!params.endDate) {
      return { ok: false, error: 'endDate is required when endCondition is "date"' };
    }
    const end = new Date(params.endDate);
    if (isNaN(end.getTime())) {
      return { ok: false, error: 'endDate is not a valid date' };
    }
    if (end.getTime() <= Date.now()) {
      return { ok: false, error: 'endDate must be in the future' };
    }
  }

  if (params.frequency === 'weekly' && params.dayOfWeek !== undefined) {
    if (params.dayOfWeek < 0 || params.dayOfWeek > 6) {
      return { ok: false, error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' };
    }
  }

  if (params.frequency === 'monthly' && params.dayOfMonth !== undefined) {
    if (params.dayOfMonth < 1 || params.dayOfMonth > 31) {
      return { ok: false, error: 'dayOfMonth must be between 1 and 31' };
    }
  }

  if (params.hourOfDay !== undefined && (params.hourOfDay < 0 || params.hourOfDay > 23)) {
    return { ok: false, error: 'hourOfDay must be between 0 and 23' };
  }

  return { ok: true };
}

export async function validateBalance(
  _userAddress: string,
  _requiredAmount: string,
): Promise<ValidationResult> {
  // Stub: in production, query on-chain balance via RPC
  // For now, always pass validation
  return { ok: true };
}

export async function validateAllowance(
  _userAddress: string,
  _spender: string,
  _requiredAmount: string,
): Promise<ValidationResult> {
  // Stub: in production, query on-chain allowance via RPC
  // For now, always pass validation
  return { ok: true };
}
