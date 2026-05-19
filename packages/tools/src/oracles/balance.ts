/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type BalanceOracleConfig = Record<string, never>;

export async function getBalance(
  address: string,
  asset: string,
  _config?: BalanceOracleConfig,
): Promise<bigint> {
  throw new Error(`balance_oracle_not_configured:${address}:${asset}`);
}
