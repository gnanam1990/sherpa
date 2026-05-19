/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Pyth Hermes HTTPS price-feed reader.
 *
 * Free, no API key. Used as the middle tier in price quotes — between a real
 * RPC quoter (most accurate) and the hard-coded stub (no network). All
 * failures are swallowed and returned as `null` so the caller can fall back
 * to the next tier; we never throw out of this module.
 *
 * Default endpoint is `GET /v2/updates/price/latest?ids[]=<feed_id>` on
 * `https://hermes.pyth.network`. The older `/api/latest_price_feeds` shape
 * is also accepted so swapping `baseUrl` to a mirror is non-breaking.
 *
 * Feed IDs (mainnet — Pyth's feed IDs are global and not chain-specific):
 *   ETH/USD = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
 */

const PYTH_HERMES_BASE_URL = 'https://hermes.pyth.network';

export const PYTH_FEED_IDS = {
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
} as const;

export type PythSupportedAsset = keyof typeof PYTH_FEED_IDS;

export type PythConfig = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Total request timeout in ms (default 1500). Returns null on timeout. */
  timeoutMs?: number;
};

type PythPriceObj = {
  price: string;
  conf?: string;
  expo: number;
  publish_time?: number;
};

type V2Response = { parsed?: Array<{ id: string; price: PythPriceObj }> };
type V1Response = Array<{ id: string; price: PythPriceObj }>;

function extractPrice(json: unknown): PythPriceObj | null {
  if (Array.isArray(json)) {
    const v1 = json as V1Response;
    return v1[0]?.price ?? null;
  }
  if (json && typeof json === 'object' && 'parsed' in json) {
    const v2 = json as V2Response;
    return v2.parsed?.[0]?.price ?? null;
  }
  return null;
}

function pyhPriceToUsd(p: PythPriceObj): number | null {
  const raw = Number(p.price);
  if (!Number.isFinite(raw)) return null;
  // expo is typically -8 for crypto: priceUsd = raw * 10^expo.
  const usd = raw * 10 ** p.expo;
  return Number.isFinite(usd) && usd > 0 ? usd : null;
}

export async function fetchPythPriceUsd(
  asset: PythSupportedAsset,
  config: PythConfig = {},
): Promise<number | null> {
  const baseUrl = config.baseUrl ?? PYTH_HERMES_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 1500;
  const id = PYTH_FEED_IDS[asset];

  const url = `${baseUrl}/v2/updates/price/latest?ids[]=${id}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const price = extractPrice(json);
    if (!price) return null;
    return pyhPriceToUsd(price);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
