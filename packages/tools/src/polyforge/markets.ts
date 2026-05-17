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

  const f = deps.fetchImpl ?? fetch;
  const url = new URL(`${deps.apiUrl}/markets`);
  url.searchParams.set('search', params.query);
  url.searchParams.set('limit', String(params.limit ?? 10));

  const headers: Record<string, string> = {};
  if (deps.apiKey) headers.Authorization = `Bearer ${deps.apiKey}`;

  const res = await f(url.toString(), { headers });
  if (!res.ok) throw new Error(`PolyForge API error: ${res.status}`);

  const data = (await res.json()) as { markets?: PolyForgeMarketRow[] } | PolyForgeMarketRow[];
  const rows = Array.isArray(data) ? data : data.markets ?? [];
  return rows.map(normaliseMarketRow).filter((market): market is PolyForgeMarket => market !== null);
}

type PolyForgeMarketRow = {
  id?: string;
  question?: string;
  title?: string;
  resolutionDate?: string;
  resolution_date?: string;
  yesPrice?: number | string;
  yes_price?: number | string;
  noPrice?: number | string;
  no_price?: number | string;
  liquidity?: bigint | number | string;
  status?: string;
};

function normaliseMarketRow(row: PolyForgeMarketRow): PolyForgeMarket | null {
  if (!row.id) return null;
  const question = row.question ?? row.title;
  if (!question) return null;

  const status = row.status === 'resolved' || row.status === 'closed' ? row.status : 'open';
  return {
    id: row.id,
    question,
    resolutionDate: row.resolutionDate ?? row.resolution_date ?? '',
    yesPrice: Number(row.yesPrice ?? row.yes_price ?? 0),
    noPrice: Number(row.noPrice ?? row.no_price ?? 0),
    liquidity: BigInt(row.liquidity ?? 0),
    status,
  };
}
