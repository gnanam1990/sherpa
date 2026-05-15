import type { PolyForgeMarket, PolyForgeSearchParams, PolyForgeDeps } from './types.js';

export class PolyForgeNotConfiguredError extends Error {
  constructor() {
    super('PolyForge API not configured');
    this.name = 'PolyForgeNotConfiguredError';
  }
}

export async function searchMarkets(
  params: PolyForgeSearchParams,
  deps: PolyForgeDeps = {},
): Promise<PolyForgeMarket[]> {
  if (!deps.apiUrl) {
    throw new PolyForgeNotConfiguredError();
  }

  // Stub: return mock markets
  return [];
}
