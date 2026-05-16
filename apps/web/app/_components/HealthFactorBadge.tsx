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
      classes: 'border-sherpa-success/30 bg-sherpa-success/10 text-sherpa-success',
    };
  }

  if (hf >= 2n * ONE) {
    return {
      label: `HF ${formatScaled(hf, 18)} · Safe`,
      classes: 'border-sherpa-success/30 bg-sherpa-success/10 text-sherpa-success',
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
    classes: 'border-sherpa-danger/30 bg-sherpa-danger/10 text-sherpa-danger',
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
