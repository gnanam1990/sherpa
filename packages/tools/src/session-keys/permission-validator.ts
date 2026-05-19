/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { SessionKeyPermission } from './types.js';

export interface PermissionGrant {
  permissions: SessionKeyPermission[];
  spendLimit: bigint;
  spentAmount: bigint;
  validUntil: number;
  maxExecutions: number;
  executionCount: number;
  status: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateTransaction(
  grant: PermissionGrant,
  target: `0x${string}`,
  selector: `0x${string}`,
  value: bigint,
  now?: number,
): ValidationResult {
  const errors: string[] = [];
  const ts = now ?? Math.floor(Date.now() / 1000);

  if (grant.status !== 'active') {
    errors.push(`Session key is ${grant.status}`);
    return { ok: false, errors };
  }

  if (ts >= grant.validUntil) {
    errors.push('Session key has expired');
    return { ok: false, errors };
  }

  if (grant.executionCount >= grant.maxExecutions) {
    errors.push('Execution limit reached');
    return { ok: false, errors };
  }

  if (grant.spentAmount + value > grant.spendLimit) {
    errors.push(
      `Spend limit exceeded: ${grant.spentAmount} + ${value} > ${grant.spendLimit}`,
    );
  }

  const matching = grant.permissions.filter(
    (p) =>
      p.target.toLowerCase() === target.toLowerCase() &&
      p.selector === selector,
  );

  if (matching.length === 0) {
    const targetMatch = grant.permissions.filter(
      (p) => p.target.toLowerCase() === target.toLowerCase(),
    );
    if (targetMatch.length === 0) {
      errors.push(`Target contract ${target} not in permission whitelist`);
    } else {
      errors.push(`Function ${selector} not permitted on ${target}`);
    }
  } else {
    const maxAllowed = matching.reduce(
      (max, p) => (p.maxValue > max ? p.maxValue : max),
      0n,
    );
    if (value > maxAllowed) {
      errors.push(
        `Value ${value} exceeds per-call limit ${maxAllowed} for ${target}.${selector}`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validatePermissionScope(
  permissions: SessionKeyPermission[],
): ValidationResult {
  const errors: string[] = [];

  if (permissions.length === 0) {
    errors.push('At least one permission required');
  }

  for (const perm of permissions) {
    if (!perm.target || !/^0x[a-fA-F0-9]{40}$/.test(perm.target)) {
      errors.push(`Invalid target address: ${perm.target}`);
    }
    if (!perm.selector || !/^0x[a-fA-F0-9]{8}$/.test(perm.selector)) {
      errors.push(`Invalid selector: ${perm.selector}`);
    }
    if (perm.maxValue < 0n) {
      errors.push(`maxValue must be non-negative for ${perm.target}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
