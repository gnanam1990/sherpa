import { describe, test, expect } from 'vitest';
import { InMemoryPortfolioSnapshotStore } from './portfolio-snapshots.js';

describe('InMemoryPortfolioSnapshotStore', () => {
  test('createSnapshot stores snapshot', async () => {
    const store = new InMemoryPortfolioSnapshotStore();
    const row = await store.createSnapshot({
      userAddress: '0x1234567890123456789012345678901234567890',
      chainId: 8453,
      totalValueUsd: '5000',
      tokens: JSON.stringify([{ symbol: 'ETH', balance: '1000000000000000000' }]),
      positions: '[]',
    });
    expect(row.id).toBeDefined();
    expect(row.user_address).toBe('0x1234567890123456789012345678901234567890');
    expect(row.total_value_usd).toBe('5000');
  });

  test('getLatestSnapshot returns most recent', async () => {
    const store = new InMemoryPortfolioSnapshotStore();
    const addr = '0x1234567890123456789012345678901234567890';
    await store.createSnapshot({ userAddress: addr, chainId: 8453, totalValueUsd: '4000', tokens: '[]', positions: '[]' });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    await store.createSnapshot({ userAddress: addr, chainId: 8453, totalValueUsd: '5000', tokens: '[]', positions: '[]' });

    const result = await store.getLatestSnapshot(addr);
    expect(result?.total_value_usd).toBe('5000');
  });

  test('getLatestSnapshot returns null for unknown address', async () => {
    const store = new InMemoryPortfolioSnapshotStore();
    const result = await store.getLatestSnapshot('0xunknown');
    expect(result).toBeNull();
  });

  test('getSnapshotHistory returns sorted history', async () => {
    const store = new InMemoryPortfolioSnapshotStore();
    const addr = '0x1234567890123456789012345678901234567890';
    await store.createSnapshot({ userAddress: addr, chainId: 8453, totalValueUsd: '4000', tokens: '[]', positions: '[]' });
    await new Promise((r) => setTimeout(r, 10));
    await store.createSnapshot({ userAddress: addr, chainId: 8453, totalValueUsd: '5000', tokens: '[]', positions: '[]' });

    const history = await store.getSnapshotHistory(addr);
    expect(history.length).toBe(2);
    expect(history[0].total_value_usd).toBe('5000');
  });

  test('trackAddress and getTrackedAddresses', async () => {
    const store = new InMemoryPortfolioSnapshotStore();
    await store.trackAddress('0xABC');
    await store.trackAddress('0xDEF');
    await store.trackAddress('0xABC'); // duplicate

    const tracked = await store.getTrackedAddresses();
    expect(tracked.length).toBe(2);
  });

  test('untrackAddress removes address', async () => {
    const store = new InMemoryPortfolioSnapshotStore();
    await store.trackAddress('0xABC');
    await store.untrackAddress('0xABC');

    const tracked = await store.getTrackedAddresses();
    expect(tracked.length).toBe(0);
  });
});
