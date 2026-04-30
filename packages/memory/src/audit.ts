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

export type UserHistorySnapshot = {
  address: `0x${string}`;
  lastSeenBlock: number;
  txCount: number;
};

/** Returns the new audit log row id. Stub — real impl talks to Postgres. */
export async function createAuditLog(_input: CreateAuditLogInput): Promise<number> {
  return 0;
}

export async function updateAuditLog(_id: number, _patch: Partial<AuditLogPatch>): Promise<void> {
  // no-op stub
}

export async function getUserHistorySnapshot(address: `0x${string}`): Promise<UserHistorySnapshot> {
  return { address, lastSeenBlock: 0, txCount: 0 };
}
