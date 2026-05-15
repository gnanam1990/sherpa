import type { SessionKeyPermission } from './types.js';

export function buildSessionKeyCall(params: {
  target: `0x${string}`;
  selector: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
}): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return {
    to: params.target,
    data: params.data,
    value: params.value,
  };
}

export function validateExecution(
  permission: SessionKeyPermission,
  target: `0x${string}`,
  selector: `0x${string}`,
  value: bigint,
): { ok: boolean; error?: string } {
  if (permission.target.toLowerCase() !== target.toLowerCase()) {
    return { ok: false, error: 'Target not permitted' };
  }
  if (permission.selector !== selector) {
    return { ok: false, error: 'Function selector not permitted' };
  }
  if (value > permission.maxValue) {
    return { ok: false, error: 'Value exceeds permission limit' };
  }
  return { ok: true };
}
