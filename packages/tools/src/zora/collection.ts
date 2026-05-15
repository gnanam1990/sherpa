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
