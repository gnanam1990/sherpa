/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type AavePositionConfig = Record<string, never>;

export async function getHealthFactor(
  address: string,
  _config?: AavePositionConfig,
): Promise<number> {
  throw new Error(`aave_position_oracle_not_configured:${address}`);
}
