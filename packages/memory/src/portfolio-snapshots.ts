import type pg from 'pg';
import { query } from '@sherpa/config';

export type PortfolioSnapshotRow = {
  id: string;
  user_address: string;
  chain_id: number;
  total_value_usd: string;
  tokens: string; // JSON string of token balances
  positions: string; // JSON string of position data
  health_factor: string | null;
  snapshot_at: string;
  created_at: string;
};

export type CreateSnapshotInput = {
  userAddress: string;
  chainId: number;
  totalValueUsd: string;
  tokens: string;
  positions: string;
  healthFactor?: string;
};

export interface PortfolioSnapshotStore {
  createSnapshot(input: CreateSnapshotInput): Promise<PortfolioSnapshotRow>;
  getLatestSnapshot(userAddress: string, chainId?: number): Promise<PortfolioSnapshotRow | null>;
  getSnapshotHistory(userAddress: string, days?: number, chainId?: number): Promise<PortfolioSnapshotRow[]>;
  getTrackedAddresses(): Promise<string[]>;
  trackAddress(address: string): Promise<void>;
  untrackAddress(address: string): Promise<void>;
}

export class InMemoryPortfolioSnapshotStore implements PortfolioSnapshotStore {
  private snapshots: PortfolioSnapshotRow[] = [];
  private trackedAddresses = new Set<string>();

  async createSnapshot(input: CreateSnapshotInput): Promise<PortfolioSnapshotRow> {
    const row: PortfolioSnapshotRow = {
      id: crypto.randomUUID(),
      user_address: input.userAddress.toLowerCase(),
      chain_id: input.chainId,
      total_value_usd: input.totalValueUsd,
      tokens: input.tokens,
      positions: input.positions,
      health_factor: input.healthFactor ?? null,
      snapshot_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    this.snapshots.push(row);
    return row;
  }

  async getLatestSnapshot(userAddress: string, chainId?: number): Promise<PortfolioSnapshotRow | null> {
    const matches = this.snapshots
      .filter((s) => s.user_address === userAddress.toLowerCase())
      .filter((s) => chainId === undefined || s.chain_id === chainId)
      .sort((a, b) => b.snapshot_at.localeCompare(a.snapshot_at));
    return matches[0] ?? null;
  }

  async getSnapshotHistory(userAddress: string, days = 30, chainId?: number): Promise<PortfolioSnapshotRow[]> {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    return this.snapshots
      .filter((s) => s.user_address === userAddress.toLowerCase())
      .filter((s) => s.snapshot_at >= cutoff)
      .filter((s) => chainId === undefined || s.chain_id === chainId)
      .sort((a, b) => b.snapshot_at.localeCompare(a.snapshot_at));
  }

  async getTrackedAddresses(): Promise<string[]> {
    return [...this.trackedAddresses];
  }

  async trackAddress(address: string): Promise<void> {
    this.trackedAddresses.add(address.toLowerCase());
  }

  async untrackAddress(address: string): Promise<void> {
    this.trackedAddresses.delete(address.toLowerCase());
  }
}

export function createPostgresPortfolioSnapshotStore(pool: pg.Pool): PortfolioSnapshotStore {
  return {
    async createSnapshot(input) {
      const res = await query<PortfolioSnapshotRow>(
        pool,
        `INSERT INTO portfolio_snapshots (user_address, chain_id, total_value_usd, tokens, positions, health_factor)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.userAddress.toLowerCase(),
          input.chainId,
          input.totalValueUsd,
          input.tokens,
          input.positions,
          input.healthFactor ?? null,
        ],
      );
      return res.rows[0]!;
    },

    async getLatestSnapshot(userAddress, chainId) {
      const conditions = ['user_address = $1'];
      const params: unknown[] = [userAddress.toLowerCase()];
      if (chainId !== undefined) {
        conditions.push('chain_id = $2');
        params.push(chainId);
      }
      const res = await query<PortfolioSnapshotRow>(
        pool,
        `SELECT * FROM portfolio_snapshots
         WHERE ${conditions.join(' AND ')}
         ORDER BY snapshot_at DESC LIMIT 1`,
        params,
      );
      return res.rows[0] ?? null;
    },

    async getSnapshotHistory(userAddress, days = 30, chainId) {
      const conditions = ['user_address = $1', 'snapshot_at >= NOW() - INTERVAL \'1 day\' * $2'];
      const params: unknown[] = [userAddress.toLowerCase(), days];
      if (chainId !== undefined) {
        conditions.push('chain_id = $3');
        params.push(chainId);
      }
      const res = await query<PortfolioSnapshotRow>(
        pool,
        `SELECT * FROM portfolio_snapshots
         WHERE ${conditions.join(' AND ')}
         ORDER BY snapshot_at DESC`,
        params,
      );
      return res.rows;
    },

    async getTrackedAddresses() {
      const res = await query<{ address: string }>(
        pool,
        `SELECT DISTINCT user_address as address FROM portfolio_snapshots
         UNION
         SELECT address FROM tracked_wallets`,
      );
      return res.rows.map((r) => r.address);
    },

    async trackAddress(address) {
      await query(
        pool,
        `INSERT INTO tracked_wallets (address) VALUES ($1) ON CONFLICT (address) DO NOTHING`,
        [address.toLowerCase()],
      );
    },

    async untrackAddress(address) {
      await query(
        pool,
        `DELETE FROM tracked_wallets WHERE address = $1`,
        [address.toLowerCase()],
      );
    },
  };
}
