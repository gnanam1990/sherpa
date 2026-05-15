export function calculatePnl(
  currentValue: bigint,
  costBasis: bigint,
): { pnlUsd: bigint; pnlPercent: number } {
  const pnlUsd = currentValue - costBasis;
  const pnlPercent = costBasis > 0n ? Number(pnlUsd * 10000n / costBasis) / 100 : 0;
  return { pnlUsd, pnlPercent };
}
