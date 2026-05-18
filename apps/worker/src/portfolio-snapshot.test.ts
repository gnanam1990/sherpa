import { describe, test, expect, vi } from 'vitest';
import { runSnapshotCycle } from './portfolio-snapshot.js';

// Use a simple in-memory implementation for testing
class TestSnapshotStore {
  private snapshots: any[] = [];
  private tracked = new Set<string>();

  async createSnapshot(input: any) {
    const row = { id: crypto.randomUUID(), ...input, user_address: input.userAddress, total_value_usd: input.totalValueUsd, snapshot_at: new Date().toISOString() };
    this.snapshots.push(row);
    return row;
  }
  async getLatestSnapshot(addr: string) {
    const matches = this.snapshots.filter((s) => s.user_address === addr.toLowerCase()).sort((a, b) => b.snapshot_at.localeCompare(a.snapshot_at));
    return matches[0] ?? null;
  }
  async getTrackedAddresses() { return [...this.tracked]; }
  async trackAddress(addr: string) { this.tracked.add(addr.toLowerCase()); }
  async untrackAddress(addr: string) { this.tracked.delete(addr.toLowerCase()); }
  async getSnapshotHistory(addr: string) {
    return this.snapshots.filter((s) => s.user_address === addr.toLowerCase()).sort((a, b) => b.snapshot_at.localeCompare(a.snapshot_at));
  }
}

describe('runSnapshotCycle', () => {
  test('skips addresses with no data', async () => {
    const store = new TestSnapshotStore();
    const result = await runSnapshotCycle({
      store,
      fetchDeps: {
        getBalance: vi.fn(async () => 0n),
        readContract: vi.fn(async () => 0n),
      },
    });
    expect(result.snapshotCount).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  test('captures snapshot for tracked address', async () => {
    const store = new TestSnapshotStore();
    await store.trackAddress('0x1234567890123456789012345678901234567890');

    const result = await runSnapshotCycle({
      store,
      fetchDeps: {
        getBalance: vi.fn(async () => 2000000000000000000n),
        readContract: vi.fn(async () => 5000000000n),
      },
    });
    expect(result.snapshotCount).toBe(1);
    expect(result.errors.length).toBe(0);

    const history = await store.getSnapshotHistory('0x1234567890123456789012345678901234567890');
    expect(history.length).toBe(1);
    expect(JSON.parse(history[0].tokens).length).toBeGreaterThan(0);
  });

  test('skips addresses already snapshotted today', async () => {
    const store = new TestSnapshotStore();
    const addr = '0x1234567890123456789012345678901234567890';
    await store.trackAddress(addr);

    // First run
    const result1 = await runSnapshotCycle({
      store,
      fetchDeps: {
        getBalance: vi.fn(async () => 1000000000000000000n),
        readContract: vi.fn(async () => 1000000000n),
      },
    });
    expect(result1.snapshotCount).toBe(1);

    // Second run same day — should skip
    const result2 = await runSnapshotCycle({
      store,
      fetchDeps: {
        getBalance: vi.fn(async () => 1000000000000000000n),
        readContract: vi.fn(async () => 1000000000n),
      },
    });
    expect(result2.snapshotCount).toBe(0);
  });

  test('handles fetch errors gracefully', async () => {
    const store = new TestSnapshotStore();
    await store.trackAddress('0xbad');

    const result = await runSnapshotCycle({
      store,
      fetchDeps: {
        getBalance: vi.fn(async () => { throw new Error('RPC down'); }),
        readContract: vi.fn(async () => 0n),
      },
    });
    expect(result.snapshotCount).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('RPC down');
  });
});
