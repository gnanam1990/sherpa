import type { PortfolioSnapshot } from './types.js';

export function aggregatePortfolio(snapshots: PortfolioSnapshot[]): {
  totalValueUsd: bigint;
  chainBreakdown: Array<{ chainId: number; valueUsd: bigint; percent: number }>;
} {
  const totalValueUsd = snapshots.reduce((sum, s) => sum + s.totalValueUsd, 0n);

  const chainBreakdown = snapshots.map(s => ({
    chainId: s.chainId ?? s.tokens[0]?.chainId ?? 0,
    valueUsd: s.totalValueUsd,
    percent: totalValueUsd > 0n ? Number(s.totalValueUsd * 10000n / totalValueUsd) / 100 : 0,
  }));

  return { totalValueUsd, chainBreakdown };
}
