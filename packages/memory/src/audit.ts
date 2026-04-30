export type CreateAuditLogInput = {
  userAddress: `0x${string}`;
  intent: string;
  planHash: string;
  submittedAt: number;
};

export type AuditLogPatch = {
  txHash?: `0x${string}`;
  confirmedAt?: number;
  error?: string;
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

/** In-memory store. Replaced by a Postgres-backed impl in Week 3. */
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
        (r) => r.userAddress.toLowerCase() === address.toLowerCase() && r.patch.txHash,
      );
      return { address, lastSeenBlock: 0, txCount: mine.length };
    },
  };
}

const defaultStore: AuditStore = createInMemoryAuditStore();

/** Default store used when callers don't inject one (tests, local dev). */
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
