/**
 * audit.ts — AuditStore interface + in-memory reference implementation.
 *
 * The Postgres-backed implementation lives in `audit.postgres.ts`; both
 * implement the same interface so callers (M1's executor, apps/api) can
 * swap via `createAuditStore(config)` in `index.ts`.
 *
 * Stage-2 columns (surface, rawInput, parsedIntent, plan, executedSteps,
 * txHashes, status, errorDetail) are optional on the input shapes — older
 * callers that only set {userAddress, intent, planHash, submittedAt} keep
 * working. New callers populate the richer columns when available.
 */

export type AuditStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'partial';
export type AuditSurface = 'web' | 'miniapp' | 'telegram' | 'api' | 'cron' | 'paymaster';

export type CreateAuditLogInput = {
  userAddress: `0x${string}`;
  intent: string;
  planHash: string;
  submittedAt: number;
  /** Surface that initiated the request. Defaults to 'api' if omitted. */
  surface?: AuditSurface;
  /** Verbatim user input (pre-parse). Optional for legacy callers. */
  rawInput?: string;
  /** Structured ParsedIntent JSON. */
  parsedIntent?: Record<string, unknown>;
  /** Structured ConfirmationCard / ExecutionPlan JSON. */
  plan?: Record<string, unknown>;
  /** Executed step receipts JSON. */
  executedSteps?: Record<string, unknown>;
};

export type AuditLogPatch = {
  /** Single-tx convenience — appended to `tx_hashes`. */
  txHash?: `0x${string}`;
  /** Bulk replace of tx_hashes (multi-step plans). */
  txHashes?: `0x${string}`[];
  confirmedAt?: number;
  error?: string;
  status?: AuditStatus;
  executedSteps?: Record<string, unknown>;
};

export type AuditLogRow = CreateAuditLogInput & {
  id: number;
  patch: Partial<AuditLogPatch>;
};

export type UserHistorySnapshot = {
  address: `0x${string}`;
  lastSeenBlock: number;
  txCount: number;
};

export interface AuditStore {
  create(input: CreateAuditLogInput): Promise<number>;
  update(id: number, patch: Partial<AuditLogPatch>): Promise<void>;
  list(userAddress: `0x${string}`): Promise<readonly AuditLogRow[]>;
  snapshot(address: `0x${string}`): Promise<UserHistorySnapshot>;
}

export function createInMemoryAuditStore(): AuditStore {
  const rows = new Map<number, AuditLogRow>();
  let nextId = 1;

  return {
    async create(input) {
      const id = nextId++;
      rows.set(id, { ...input, id, patch: {} });
      return id;
    },
    async update(id, patch) {
      const row = rows.get(id);
      if (!row) throw new Error(`[memory] audit row ${id} not found`);
      rows.set(id, { ...row, patch: { ...row.patch, ...patch } });
    },
    async list(userAddress) {
      return [...rows.values()].filter(
        (r) => r.userAddress.toLowerCase() === userAddress.toLowerCase(),
      );
    },
    async snapshot(address) {
      const mine = [...rows.values()].filter(
        (r) =>
          r.userAddress.toLowerCase() === address.toLowerCase() &&
          (r.patch.txHash || (r.patch.txHashes && r.patch.txHashes.length > 0)),
      );
      return { address, lastSeenBlock: 0, txCount: mine.length };
    },
  };
}

const defaultStore: AuditStore = createInMemoryAuditStore();

export async function createAuditLog(
  input: CreateAuditLogInput,
  store: AuditStore = defaultStore,
): Promise<number> {
  return store.create(input);
}

export async function updateAuditLog(
  id: number,
  patch: Partial<AuditLogPatch>,
  store: AuditStore = defaultStore,
): Promise<void> {
  return store.update(id, patch);
}

export async function getUserHistorySnapshot(
  address: `0x${string}`,
  store: AuditStore = defaultStore,
): Promise<UserHistorySnapshot> {
  return store.snapshot(address);
}
