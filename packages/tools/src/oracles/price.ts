/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type PriceOracleConfig = Record<string, never>;

export async function getPrice(
  symbol: string,
  _config?: PriceOracleConfig,
): Promise<number> {
  throw new Error(`price_oracle_not_configured:${symbol}`);
}
