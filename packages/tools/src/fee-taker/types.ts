/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type FeeConfig = {
  treasury: `0x${string}`;
  feeBps: number;
  chainId: number;
};

export type FeeCalculation = {
  inputAmount: bigint;
  feeAmount: bigint;
  feeBps: number;
  treasury: `0x${string}`;
};

export type FeeTransfer = {
  token: `0x${string}`;
  amount: bigint;
  recipient: `0x${string}`;
};

export type FeeDeps = {
  chainId: number;
};
