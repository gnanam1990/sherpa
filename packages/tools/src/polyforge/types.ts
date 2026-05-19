/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type PolyForgeMarket = {
  id: string;
  question: string;
  resolutionDate: string;
  yesPrice: number; // basis points
  noPrice: number; // basis points
  liquidity: bigint;
  status: 'open' | 'resolved' | 'closed';
};

export type PolyForgeSearchParams = {
  query: string;
  limit?: number;
};

export type PolyForgeDeps = {
  apiUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};
