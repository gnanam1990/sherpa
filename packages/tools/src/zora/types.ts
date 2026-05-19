/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type ZoraCollection = {
  address: `0x${string}`;
  name: string;
  description: string;
  image: string;
  chainId: number;
  mintPrice: bigint;
  maxSupply: number;
  currentSupply: number;
};

export type ZoraMintParams = {
  collection: `0x${string}`;
  quantity: number;
  recipient: `0x${string}`;
  comment?: string;
};

export type ZoraMintQuote = {
  pricePerUnit: bigint;
  totalPrice: bigint;
  gasEstimate: bigint;
};

export type ZoraDeps = {
  apiUrl?: string;
  apiKey?: string;
};
