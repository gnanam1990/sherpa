export type JurisdictionInfo = {
  ip: string;
  country: string;
  region: string;
  city: string;
  org: string;
  timezone: string;
};

export type JurisdictionDeps = {
  ipinfoToken?: string;
  fetch?: typeof fetch;
};

export type JurisdictionResult =
  | { ok: true; info: JurisdictionInfo }
  | { ok: false; error: string };

const IPINFO_API = 'https://ipinfo.io';

/**
 * Detect jurisdiction from IP address using ipinfo.io.
 * Returns honest "not configured" when IPINFO_TOKEN is missing.
 */
export async function detectJurisdiction(
  ip: string,
  deps: JurisdictionDeps = {},
): Promise<JurisdictionResult> {
  if (!deps.ipinfoToken) {
    return { ok: false, error: 'IPINFO_TOKEN not configured — jurisdiction detection disabled' };
  }

  const fetchFn = deps.fetch ?? fetch;

  try {
    const res = await fetchFn(`${IPINFO_API}/${ip}/json?token=${deps.ipinfoToken}`);
    if (!res.ok) {
      return { ok: false, error: `ipinfo.io returned ${res.status}` };
    }

    const data = (await res.json()) as Record<string, string>;
    return {
      ok: true,
      info: {
        ip,
        country: data.country ?? 'Unknown',
        region: data.region ?? 'Unknown',
        city: data.city ?? 'Unknown',
        org: data.org ?? 'Unknown',
        timezone: data.timezone ?? 'Unknown',
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Jurisdiction detection failed: ${msg}` };
  }
}

/**
 * Check if a country code is in the blocked list.
 * Framework only — the blocked list is user-configured, not hardcoded.
 */
export function isCountryBlocked(
  countryCode: string,
  blockedCountries: string[],
): boolean {
  return blockedCountries.includes(countryCode.toUpperCase());
}

/**
 * Default compliance config with empty blocked jurisdictions.
 * Users configure their own rules via the compliance API.
 */
export const DEFAULT_JURISDICTION_CONFIG = {
  blockedCountries: [] as string[],
  requireKYC: false,
  kycThresholdUsd: 0,
};
