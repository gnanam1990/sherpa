/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { ZoraCollection, ZoraDeps } from './types.js';

export class ZoraNotConfiguredError extends Error {
  constructor() {
    super('Zora API not configured');
    this.name = 'ZoraNotConfiguredError';
  }
}

export async function resolveCollection(
  target: string,
  deps: ZoraDeps = {},
): Promise<ZoraCollection | null> {
  void target;
  void deps;
  return null;
}

export async function searchCollections(
  query: string,
  deps: ZoraDeps = {},
): Promise<ZoraCollection[]> {
  void query;
  if (!deps.apiUrl) return [];
  return [];
}
