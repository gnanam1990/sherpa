import type { Pool } from 'pg';

export type CachedProposal = {
  id: string;
  source: 'snapshot' | 'aave' | 'compound' | 'optimism';
  externalId: string;
  space?: string;
  title: string;
  description?: string;
  proposer?: string;
  status: string;
  choices?: string[];
  scores?: number[];
  quorum?: number;
  startTime?: Date;
  endTime?: Date;
  link?: string;
  raw?: Record<string, unknown>;
  cachedAt: Date;
};

export type VoteRecord = {
  id: string;
  userAddress: string;
  source: 'snapshot' | 'aave' | 'compound' | 'optimism';
  proposalExternalId: string;
  space?: string;
  choice: string;
  weight?: number;
  reason?: string;
  txHash?: string;
  votedAt: Date;
};

export type DelegationRecord = {
  id: string;
  delegatorAddress: string;
  delegateeAddress: string;
  protocol: 'aave' | 'compound' | 'optimism';
  chainId: number;
  txHash?: string;
  active: boolean;
  delegatedAt: Date;
  revokedAt?: Date;
};

export async function cacheProposals(
  pool: Pool,
  proposals: Array<{
    source: CachedProposal['source'];
    externalId: string;
    space?: string;
    title: string;
    description?: string;
    proposer?: string;
    status: string;
    choices?: string[];
    scores?: number[];
    quorum?: number;
    startTime?: Date;
    endTime?: Date;
    link?: string;
    raw?: Record<string, unknown>;
  }>,
): Promise<void> {
  for (const p of proposals) {
    await pool.query(
      `INSERT INTO proposal_cache (source, external_id, space, title, description, proposer, status, choices, scores, quorum, start_time, end_time, link, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (source, external_id) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, status=EXCLUDED.status,
         choices=EXCLUDED.choices, scores=EXCLUDED.scores, quorum=EXCLUDED.quorum,
         start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time, raw=EXCLUDED.raw, cached_at=now()`,
      [
        p.source, p.externalId, p.space, p.title, p.description, p.proposer,
        p.status, JSON.stringify(p.choices), JSON.stringify(p.scores), p.quorum,
        p.startTime, p.endTime, p.link, JSON.stringify(p.raw ?? {}),
      ],
    );
  }
}

export async function getCachedProposals(
  pool: Pool,
  source?: string,
  status = 'active',
): Promise<CachedProposal[]> {
  const conditions: string[] = ['status = $1'];
  const params: unknown[] = [status];
  if (source) {
    conditions.push('source = $2');
    params.push(source);
  }
  const { rows } = await pool.query(
    `SELECT id, source, external_id, space, title, description, proposer, status,
            choices, scores, quorum, start_time, end_time, link, raw, cached_at
     FROM proposal_cache WHERE ${conditions.join(' AND ')}
     ORDER BY end_time ASC NULLS LAST LIMIT 100`,
    params,
  );
  return rows.map(mapProposalRow);
}

export async function getCachedProposalById(
  pool: Pool,
  id: string,
): Promise<CachedProposal | null> {
  const { rows } = await pool.query(
    `SELECT id, source, external_id, space, title, description, proposer, status,
            choices, scores, quorum, start_time, end_time, link, raw, cached_at
     FROM proposal_cache WHERE id = $1 OR external_id = $1`,
    [id],
  );
  return rows[0] ? mapProposalRow(rows[0]) : null;
}

export async function recordVote(
  pool: Pool,
  params: {
    userAddress: string;
    source: VoteRecord['source'];
    proposalExternalId: string;
    space?: string;
    choice: string;
    weight?: number;
    reason?: string;
    txHash?: string;
  },
): Promise<VoteRecord> {
  const { rows } = await pool.query(
    `INSERT INTO vote_history (user_address, source, proposal_external_id, space, choice, weight, reason, tx_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_address, source, proposal_external_id) DO UPDATE SET
       choice=EXCLUDED.choice, weight=EXCLUDED.weight, reason=EXCLUDED.reason, tx_hash=EXCLUDED.tx_hash, voted_at=now()
     RETURNING *`,
    [params.userAddress, params.source, params.proposalExternalId, params.space, params.choice, params.weight, params.reason, params.txHash],
  );
  return mapVoteRow(rows[0]);
}

export async function getVoteHistory(
  pool: Pool,
  userAddress: string,
  limit = 50,
): Promise<VoteRecord[]> {
  const { rows } = await pool.query(
    `SELECT * FROM vote_history WHERE user_address = $1 ORDER BY voted_at DESC LIMIT $2`,
    [userAddress, limit],
  );
  return rows.map(mapVoteRow);
}

export async function getVotesForProposal(
  pool: Pool,
  proposalExternalId: string,
): Promise<VoteRecord[]> {
  const { rows } = await pool.query(
    `SELECT * FROM vote_history WHERE proposal_external_id = $1 ORDER BY voted_at DESC`,
    [proposalExternalId],
  );
  return rows.map(mapVoteRow);
}

export async function recordDelegation(
  pool: Pool,
  params: {
    delegatorAddress: string;
    delegateeAddress: string;
    protocol: DelegationRecord['protocol'];
    chainId: number;
    txHash?: string;
  },
): Promise<DelegationRecord> {
  const { rows } = await pool.query(
    `INSERT INTO delegation_records (delegator_address, delegatee_address, protocol, chain_id, tx_hash)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (delegator_address, protocol) DO UPDATE SET
       delegatee_address=EXCLUDED.delegatee_address, tx_hash=EXCLUDED.tx_hash,
       active=true, delegated_at=now(), revoked_at=null
     RETURNING *`,
    [params.delegatorAddress, params.delegateeAddress, params.protocol, params.chainId, params.txHash],
  );
  return mapDelegationRow(rows[0]);
}

export async function getDelegations(
  pool: Pool,
  userAddress: string,
): Promise<DelegationRecord[]> {
  const { rows } = await pool.query(
    `SELECT * FROM delegation_records WHERE delegator_address = $1 AND active = true ORDER BY delegated_at DESC`,
    [userAddress],
  );
  return rows.map(mapDelegationRow);
}

export async function revokeDelegation(
  pool: Pool,
  userAddress: string,
  protocol: string,
): Promise<void> {
  await pool.query(
    `UPDATE delegation_records SET active = false, revoked_at = now()
     WHERE delegator_address = $1 AND protocol = $2 AND active = true`,
    [userAddress, protocol],
  );
}

function mapProposalRow(row: any): CachedProposal {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    space: row.space,
    title: row.title,
    description: row.description,
    proposer: row.proposer,
    status: row.status,
    choices: row.choices ? (typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices) : undefined,
    scores: row.scores ? (typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores) : undefined,
    quorum: row.quorum ? Number(row.quorum) : undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    link: row.link,
    raw: row.raw ? (typeof row.raw === 'string' ? JSON.parse(row.raw) : row.raw) : undefined,
    cachedAt: row.cached_at,
  };
}

function mapVoteRow(row: any): VoteRecord {
  return {
    id: row.id,
    userAddress: row.user_address,
    source: row.source,
    proposalExternalId: row.proposal_external_id,
    space: row.space,
    choice: row.choice,
    weight: row.weight ? Number(row.weight) : undefined,
    reason: row.reason,
    txHash: row.tx_hash,
    votedAt: row.voted_at,
  };
}

function mapDelegationRow(row: any): DelegationRecord {
  return {
    id: row.id,
    delegatorAddress: row.delegator_address,
    delegateeAddress: row.delegatee_address,
    protocol: row.protocol,
    chainId: row.chain_id,
    txHash: row.tx_hash,
    active: row.active,
    delegatedAt: row.delegated_at,
    revokedAt: row.revoked_at,
  };
}

export class InMemoryGovernanceStore {
  private proposals = new Map<string, CachedProposal>();
  private votes: VoteRecord[] = [];
  private delegations = new Map<string, DelegationRecord>();

  async cacheProposals(proposals: CachedProposal[]): Promise<void> {
    for (const p of proposals) {
      this.proposals.set(`${p.source}:${p.externalId}`, { ...p, cachedAt: new Date() });
    }
  }

  async getCachedProposals(source?: string, status = 'active'): Promise<CachedProposal[]> {
    return Array.from(this.proposals.values()).filter(
      (p) => (!source || p.source === source) && (!status || p.status === status),
    );
  }

  async recordVote(vote: VoteRecord): Promise<VoteRecord> {
    const existing = this.votes.findIndex(
      (v) => v.userAddress === vote.userAddress && v.source === vote.source && v.proposalExternalId === vote.proposalExternalId,
    );
    if (existing >= 0) this.votes[existing] = vote;
    else this.votes.push(vote);
    return vote;
  }

  async getVoteHistory(userAddress: string): Promise<VoteRecord[]> {
    return this.votes.filter((v) => v.userAddress === userAddress);
  }

  async recordDelegation(delegation: DelegationRecord): Promise<DelegationRecord> {
    const key = `${delegation.delegatorAddress}:${delegation.protocol}`;
    this.delegations.set(key, delegation);
    return delegation;
  }

  async getDelegations(userAddress: string): Promise<DelegationRecord[]> {
    return Array.from(this.delegations.values()).filter(
      (d) => d.delegatorAddress === userAddress && d.active,
    );
  }

  async revokeDelegation(userAddress: string, protocol: string): Promise<void> {
    const key = `${userAddress}:${protocol}`;
    const existing = this.delegations.get(key);
    if (existing) {
      this.delegations.set(key, { ...existing, active: false, revokedAt: new Date() });
    }
  }
}
