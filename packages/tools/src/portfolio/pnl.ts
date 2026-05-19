/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export function calculatePnl(
  currentValue: bigint,
  costBasis: bigint,
): { pnlUsd: bigint; pnlPercent: number } {
  const pnlUsd = currentValue - costBasis;
  const pnlPercent = costBasis > 0n ? Number(pnlUsd * 10000n / costBasis) / 100 : 0;
  return { pnlUsd, pnlPercent };
}
