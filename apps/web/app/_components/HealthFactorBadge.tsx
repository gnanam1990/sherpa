/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

const MAX_HEALTH_FACTOR = 2n ** 256n - 1n;
const ONE = 1_000_000_000_000_000_000n;

function formatScaled(value: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = value % scale;
  const twoDecimals = (fraction / (scale / 100n)).toString().padStart(2, '0');
  return `${whole}.${twoDecimals}`;
}

export function healthFactorLabel(hf: bigint | null): {
  label: string;
  classes: string;
} {
  if (hf === null || hf === MAX_HEALTH_FACTOR) {
    return {
      label: 'HF ∞ · No debt',
      classes: 'border-base-green/30 bg-base-green/10 text-base-green',
    };
  }

  if (hf >= 2n * ONE) {
    return {
      label: `HF ${formatScaled(hf, 18)} · Safe`,
      classes: 'border-base-green/30 bg-base-green/10 text-base-green',
    };
  }
  if (hf >= (15n * ONE) / 10n) {
    return {
      label: `HF ${formatScaled(hf, 18)} · Caution`,
      classes: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
    };
  }
  if (hf >= (12n * ONE) / 10n) {
    return {
      label: `HF ${formatScaled(hf, 18)} · Risky`,
      classes: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
    };
  }
  return {
    label: `HF ${formatScaled(hf, 18)} · Danger`,
    classes: 'border-base-red/30 bg-base-red/10 text-base-red',
  };
}

export function HealthFactorBadge({ hf }: { hf: bigint | null }) {
  const config = healthFactorLabel(hf);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
