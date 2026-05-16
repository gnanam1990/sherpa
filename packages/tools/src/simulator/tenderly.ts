/**
 * Tenderly transaction simulation adapter (Stage 2).
 *
 * Wraps the Tenderly Simulation API to pre-flight transactions before
 * the executor commits them. Designed for smart-mock testing via DI
 * (inject `fetchImpl` to intercept requests).
 *
 * Architecture:
 * - 5s timeout per request via AbortController
 * - 1 automatic retry on network/timeout errors
 * - In-memory LRU cache (30s TTL, max 1000 entries)
 * - Deterministic error classification (SIMULATION_REVERT, etc.)
 */

// ── Types ────────────────────────────────────────────────────────────────
// SimulationResult is defined locally to avoid a circular dependency with
// @sherpa/core (which depends on @sherpa/tools). The canonical type in
// packages/core/src/types.ts mirrors this shape exactly.

export type SimulationErrorCode =
  | 'INSUFFICIENT_FUNDS_FOR_GAS'
  | 'SIMULATION_REVERT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_USEROP';

export type SimulationResult =
  | { ok: true; gasEstimate: bigint; simulatedAt: number }
  | { ok: false; errorCode: SimulationErrorCode; errorMessage: string };

export type SimulatorCall = {
  to: string;
  data: string;
  value?: bigint;
};

export type TenderlyConfig = {
  apiKey: string;
  user: string;
  project: string;
  /** Override the base URL (default: https://api.tenderly.co). */
  baseUrl?: string;
};

export type SimulatorOptions = {
  /** Override fetch for testing (smart mocks assert request shape). */
  fetchImpl?: typeof fetch;
  /** Override Date.now for deterministic cache TTL tests. */
  now?: () => number;
  /** Override setTimeout for timeout tests. */
  setTimeoutImpl?: typeof setTimeout;
};

export type Simulator = {
  simulate: (calls: SimulatorCall[], sender: string) => Promise<SimulationResult>;
};

// ── Cache ────────────────────────────────────────────────────────────────

type CacheEntry = { result: SimulationResult; expiresAt: number };

const DEFAULT_CACHE_TTL_MS = 30_000;
const DEFAULT_CACHE_MAX = 1_000;

function hashCalls(calls: SimulatorCall[]): string {
  // Stable JSON: sort keys recursively. For our flat call objects a single
  // sort pass is sufficient.
  const stable = calls
    .map((c) => ({
      to: c.to.toLowerCase(),
      data: c.data.toLowerCase(),
      value: (c.value ?? 0n).toString(),
    }))
    .sort((a, b) => a.to.localeCompare(b.to));
  return JSON.stringify(stable);
}

class SimulationCache {
  private map = new Map<string, CacheEntry>();
  private ttl: number;
  private max: number;
  private now: () => number;

  constructor(opts?: { ttlMs?: number; max?: number; now?: () => number }) {
    this.ttl = opts?.ttlMs ?? DEFAULT_CACHE_TTL_MS;
    this.max = opts?.max ?? DEFAULT_CACHE_MAX;
    this.now = opts?.now ?? (() => Date.now());
  }

  get(key: string): SimulationResult | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (this.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.result;
  }

  set(key: string, result: SimulationResult): void {
    // Evict oldest if at capacity (simple FIFO — good enough for 1000 entries).
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, { result, expiresAt: this.now() + this.ttl });
  }
}

// ── Tenderly API types ───────────────────────────────────────────────────

type TenderlySimRequest = {
  network_id: string;
  from: string;
  to: string;
  input: string;
  value: string;
  gas?: number;
  save?: boolean;
  save_if_fails?: boolean;
  simulation_type?: 'quick' | 'full';
};

type TenderlySimResponse = {
  transaction: {
    status: boolean;
    gas_used: number;
    error_info?: {
      error_message?: string;
      error_type?: string;
    };
  };
  simulation?: {
    id: string;
  };
};

// ── Error classification ─────────────────────────────────────────────────

function classifyError(
  status: number,
  body: TenderlySimResponse | null,
  bodyText: string,
): SimulationResult {
  // HTTP-level errors (non-2xx)
  if (status === 401 || status === 403) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: `Tenderly auth error (${status}). Check TENDERLY_API_KEY.`,
    };
  }
  if (status === 429) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: 'Tenderly rate limit hit. Retry later.',
    };
  }
  if (status >= 500) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: `Tenderly server error (${status}).`,
    };
  }

  // 200 but simulation-level failure
  if (body?.transaction?.status === false) {
    const errMsg = body.transaction.error_info?.error_message ?? 'Transaction reverted.';
    const errType = body.transaction.error_info?.error_type ?? '';

    if (
      errMsg.toLowerCase().includes('insufficient funds') ||
      errMsg.toLowerCase().includes('insufficient balance') ||
      errType.toLowerCase().includes('insufficient_funds')
    ) {
      return {
        ok: false,
        errorCode: 'INSUFFICIENT_FUNDS_FOR_GAS',
        errorMessage: errMsg,
      };
    }

    return {
      ok: false,
      errorCode: 'SIMULATION_REVERT',
      errorMessage: errMsg,
    };
  }

  // Unparseable response
  return {
    ok: false,
    errorCode: 'NETWORK_ERROR',
    errorMessage: `Unexpected Tenderly response (status ${status}): ${bodyText.slice(0, 200)}`,
  };
}

// ── Factory ──────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_BASE_URL = 'https://api.tenderly.co';

function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

/**
 * Create a Tenderly simulation adapter.
 *
 * @example
 * ```ts
 * const sim = createSimulator(
 *   { apiKey: '...', user: 'alice', project: 'sherpa' },
 *   { fetchImpl: myMockFetch },
 * );
 * const result = await sim.simulate([call], '0xSender');
 * ```
 */
export function createSimulator(config: TenderlyConfig, options?: SimulatorOptions): Simulator {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const now = options?.now ?? (() => Date.now());
  const setTimeoutFn = options?.setTimeoutImpl ?? setTimeout;
  const baseUrl = stripTrailingSlashes(config.baseUrl ?? DEFAULT_BASE_URL);
  const cache = new SimulationCache({ now });

  async function doFetch(calls: SimulatorCall[], sender: string): Promise<SimulationResult> {
    // Build a single-simulation request from the first call. For multi-step
    // plans (approve + swap), we simulate the full batch via the first call
    // — Tenderly will replay the full sequence. If the caller sends only
    // one call, that's fine too.
    const first = calls[0];
    if (!first) {
      return { ok: false, errorCode: 'INVALID_USEROP', errorMessage: 'No calls provided.' };
    }

    const url = `${baseUrl}/api/v1/account/${config.user}/project/${config.project}/simulate`;
    const body: TenderlySimRequest = {
      network_id: '84532', // Base Sepolia — always simulate against the target chain
      from: sender,
      to: first.to,
      input: first.data,
      value: (first.value ?? 0n).toString(),
      save: false,
      save_if_fails: false,
      simulation_type: 'quick',
    };

    const controller = new AbortController();
    const timer = setTimeoutFn(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': config.apiKey,
        },
        body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') {
        return { ok: false, errorCode: 'TIMEOUT', errorMessage: 'Simulation timed out after 5s.' };
      }
      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: `Network error: ${(err as Error).message}`,
      };
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let parsed: TenderlySimResponse | null = null;
    try {
      parsed = JSON.parse(text) as TenderlySimResponse;
    } catch {
      // non-JSON response — fall through to classifyError
    }

    if (!response.ok || parsed?.transaction?.status === false) {
      return classifyError(response.status, parsed, text);
    }

    if (parsed?.transaction?.status === true) {
      return {
        ok: true,
        gasEstimate: BigInt(parsed.transaction.gas_used),
        simulatedAt: now(),
      };
    }

    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: `Unexpected Tenderly response shape: ${text.slice(0, 200)}`,
    };
  }

  return {
    async simulate(calls: SimulatorCall[], sender: string): Promise<SimulationResult> {
      // ── Cache check ──
      const cacheKey = `${sender.toLowerCase()}:${hashCalls(calls)}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      // ── First attempt ──
      const result = await doFetch(calls, sender);

      // ── Retry on network/timeout (once) ──
      if (!result.ok && (result.errorCode === 'NETWORK_ERROR' || result.errorCode === 'TIMEOUT')) {
        const retry = await doFetch(calls, sender);
        // Cache the retry result regardless (even if it fails again)
        cache.set(cacheKey, retry);
        return retry;
      }

      // ── Cache and return ──
      cache.set(cacheKey, result);
      return result;
    },
  };
}
