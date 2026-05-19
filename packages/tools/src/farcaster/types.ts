/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type NeynarDeps = {
  neynarApiKey?: string;
  fetchImpl?: typeof fetch;
};

export type TipParams = {
  recipientUsername: string;
  amount: bigint;
  asset: string;
};

export type TipQuote = {
  recipientAddress: `0x${string}` | null;
  amount: bigint;
  asset: string;
};
