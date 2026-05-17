import { describe, expect, it } from 'vitest';
import type pg from 'pg';
import {
  createPostgresNotificationStore,
  InMemoryNotificationStore,
} from './notifications.js';

type Call = { sql: string; params: unknown[] };
type Reply = { rows: unknown[]; rowCount?: number } | Error;

function makePool(replies: Reply[]) {
  const calls: Call[] = [];
  let i = 0;
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      const reply = replies[i++];
      if (!reply) throw new Error(`unexpected query: ${sql}`);
      if (reply instanceof Error) throw reply;
      calls.push({ sql: sql.trim(), params });
      return { rows: reply.rows, rowCount: reply.rowCount ?? reply.rows.length };
    },
  } as unknown as pg.Pool;
  return { pool, calls };
}

const userAddress = '0x1234567890123456789012345678901234567890';
const createdAt = new Date('2026-05-17T12:00:00.000Z');

function undefinedColumnError(): Error {
  const err = new Error('column does not exist') as Error & { code: string };
  err.code = '42703';
  return err;
}

function missingRelationError(): Error {
  const err = new Error('relation does not exist') as Error & { code: string };
  err.code = '42P01';
  return err;
}

describe('notifications / in-memory store', () => {
  it('stores subscriptions and disables them without dropping history', async () => {
    const store = new InMemoryNotificationStore();
    const subscription = await store.subscribe({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      condition: 'hf < 1.5',
      label: 'HF guard',
      createdAt: createdAt.getTime(),
    });

    expect(subscription).toMatchObject({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      condition: 'hf < 1.5',
      label: 'HF guard',
      enabled: true,
      storage: 'memory',
    });

    await store.unsubscribe(subscription.id);
    const rows = await store.getByUser(userAddress.toUpperCase());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.enabled).toBe(false);
  });

  it('logs notifications in reverse chronological order', async () => {
    const store = new InMemoryNotificationStore();
    await store.logNotification({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      payload: { title: 'First', body: 'Older' },
      result: { success: true, messageId: '1' },
      status: 'sent',
      createdAt: createdAt.getTime(),
    });
    await store.logNotification({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      payload: { title: 'Second', body: 'Newer' },
      result: { success: true, messageId: '2' },
      status: 'sent',
      createdAt: createdAt.getTime() + 1,
    });

    const rows = await store.getRecentNotifications(userAddress, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe('Second');
    expect(rows[0]!.result?.messageId).toBe('2');
  });
});

describe('notifications / postgres store', () => {
  it('inserts subscription recipient metadata and maps the persisted row', async () => {
    const { pool, calls } = makePool([
      {
        rows: [{
          id: 'sub-1',
          user_address: userAddress,
          channel: 'telegram',
          recipient: '6102672721',
          condition: 'hf < 1.5',
          label: 'HF guard',
          enabled: true,
          last_triggered_at: null,
          trigger_count: 0,
          created_at: createdAt,
          metadata: { source: 'api' },
        }],
      },
    ]);

    const store = createPostgresNotificationStore(pool);
    const row = await store.subscribe({
      userAddress: userAddress.toUpperCase(),
      channel: 'telegram',
      recipient: '6102672721',
      condition: 'hf < 1.5',
      label: 'HF guard',
      metadata: { source: 'api' },
      createdAt: createdAt.getTime(),
    });

    expect(calls[0]!.sql).toContain('INSERT INTO notification_subscriptions');
    expect(calls[0]!.sql).toContain('user_address, channel, recipient, condition, label');
    expect(calls[0]!.params).toEqual([
      userAddress,
      'telegram',
      '6102672721',
      'hf < 1.5',
      'HF guard',
      true,
      { source: 'api' },
      createdAt,
    ]);
    expect(row).toMatchObject({
      id: 'sub-1',
      userAddress,
      recipient: '6102672721',
      storage: 'postgres',
    });
  });

  it('updates subscription enabled=false on unsubscribe', async () => {
    const { pool, calls } = makePool([{ rows: [], rowCount: 1 }]);
    const store = createPostgresNotificationStore(pool);
    await store.unsubscribe('sub-1');
    expect(calls[0]!.sql).toBe(
      'UPDATE notification_subscriptions SET enabled = false WHERE id = $1',
    );
    expect(calls[0]!.params).toEqual(['sub-1']);
  });

  it('persists dispatch payload/result without fake success fields', async () => {
    const { pool, calls } = makePool([
      {
        rows: [{
          id: 'log-1',
          user_address: userAddress,
          channel: 'telegram',
          recipient: '6102672721',
          title: 'Sherpa',
          body: 'Delivered',
          data: { severity: 'info' },
          payload: { title: 'Sherpa', body: 'Delivered', data: { severity: 'info' } },
          result: { success: true, messageId: '42' },
          status: 'sent',
          message_id: '42',
          error: null,
          sent_at: createdAt,
          created_at: createdAt,
        }],
      },
    ]);

    const store = createPostgresNotificationStore(pool);
    const row = await store.logNotification({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      payload: { title: 'Sherpa', body: 'Delivered', data: { severity: 'info' } },
      result: { success: true, messageId: '42' },
      status: 'sent',
      sentAt: createdAt.toISOString(),
      createdAt: createdAt.getTime(),
    });

    expect(calls[0]!.sql).toContain('INSERT INTO notification_log');
    expect(calls[0]!.sql).toContain('recipient, title, body, data, payload');
    expect(calls[0]!.params[0]).toBe(userAddress);
    expect(calls[0]!.params[2]).toBe('6102672721');
    expect(calls[0]!.params[9]).toBe('42');
    expect(row).toMatchObject({
      id: 'log-1',
      recipient: '6102672721',
      status: 'sent',
      messageId: '42',
      storage: 'postgres',
    });
    expect(row.result?.success).toBe(true);
  });

  it('lists subscriptions and recent notifications with camelCase API shape', async () => {
    const { pool, calls } = makePool([
      {
        rows: [{
          id: 'sub-1',
          user_address: userAddress,
          channel: 'email',
          recipient: 'builder@example.com',
          condition: null,
          label: null,
          enabled: true,
          last_triggered_at: null,
          trigger_count: 2,
          created_at: createdAt,
          metadata: {},
        }],
      },
      {
        rows: [{
          id: 'log-1',
          user_address: userAddress,
          channel: 'email',
          recipient: 'builder@example.com',
          title: 'Sherpa',
          body: 'Queued',
          data: {},
          payload: { title: 'Sherpa', body: 'Queued' },
          result: { success: false, error: 'email_channel_not_implemented' },
          status: 'failed',
          message_id: null,
          error: 'email_channel_not_implemented',
          sent_at: null,
          created_at: createdAt,
        }],
      },
    ]);

    const store = createPostgresNotificationStore(pool);
    const subscriptions = await store.getByUser(userAddress.toUpperCase());
    const logs = await store.getRecentNotifications(userAddress.toUpperCase(), 5);

    expect(calls[0]!.params).toEqual([userAddress]);
    expect(calls[1]!.params).toEqual([userAddress, 5]);
    expect(subscriptions[0]).toMatchObject({
      id: 'sub-1',
      userAddress,
      recipient: 'builder@example.com',
      triggerCount: 2,
    });
    expect(logs[0]).toMatchObject({
      id: 'log-1',
      userAddress,
      status: 'failed',
      error: 'email_channel_not_implemented',
    });
  });

  it('falls back to the original 0012 subscription schema while migration 0027 is pending', async () => {
    const { pool, calls } = makePool([
      undefinedColumnError(),
      {
        rows: [{
          id: 'sub-legacy',
          user_address: userAddress,
          channel: 'telegram',
          recipient: null,
          condition: 'hf < 1.5',
          label: null,
          enabled: true,
          last_triggered_at: null,
          trigger_count: 0,
          created_at: createdAt,
          metadata: {},
        }],
      },
    ]);

    const store = createPostgresNotificationStore(pool);
    const row = await store.subscribe({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      condition: 'hf < 1.5',
      label: 'HF guard',
      createdAt: createdAt.getTime(),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('user_address, channel, condition, enabled, created_at');
    expect(calls[0]!.sql).not.toContain('recipient, condition, label');
    expect(row).toMatchObject({
      id: 'sub-legacy',
      recipient: '6102672721',
      label: 'HF guard',
      storage: 'postgres',
    });
  });

  it('falls back to the original 0012 notification_log schema while migration 0027 is pending', async () => {
    const { pool, calls } = makePool([
      undefinedColumnError(),
      {
        rows: [{
          id: 'log-legacy',
          user_address: userAddress,
          channel: 'telegram',
          recipient: null,
          title: 'Sherpa',
          body: 'Delivered',
          data: {
            recipient: '6102672721',
            payload: { title: 'Sherpa', body: 'Delivered' },
            result: { success: true, messageId: '42' },
          },
          payload: null,
          result: null,
          status: 'sent',
          message_id: '42',
          error: null,
          sent_at: createdAt,
          created_at: createdAt,
        }],
      },
    ]);

    const store = createPostgresNotificationStore(pool);
    const row = await store.logNotification({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      payload: { title: 'Sherpa', body: 'Delivered' },
      result: { success: true, messageId: '42' },
      status: 'sent',
      sentAt: createdAt.toISOString(),
      createdAt: createdAt.getTime(),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('user_address, channel, title, body, data');
    expect(calls[0]!.sql).not.toContain('recipient, title, body, data, payload');
    expect(row).toMatchObject({
      id: 'log-legacy',
      recipient: '6102672721',
      messageId: '42',
    });
    expect(row.result?.success).toBe(true);
  });

  it('creates notification tables once when the database has no notification schema yet', async () => {
    const { pool, calls } = makePool([
      missingRelationError(),
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 0 },
      {
        rows: [{
          id: 'sub-created',
          user_address: userAddress,
          channel: 'telegram',
          recipient: '6102672721',
          condition: null,
          label: null,
          enabled: true,
          last_triggered_at: null,
          trigger_count: 0,
          created_at: createdAt,
          metadata: {},
        }],
      },
    ]);

    const store = createPostgresNotificationStore(pool);
    const row = await store.subscribe({
      userAddress,
      channel: 'telegram',
      recipient: '6102672721',
      createdAt: createdAt.getTime(),
    });

    expect(calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('CREATE TABLE IF NOT EXISTS notification_subscriptions'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS notification_log'),
        expect.stringContaining('ALTER TABLE notification_subscriptions'),
        expect.stringContaining('ALTER TABLE notification_log'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_notif_subs_user'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_notif_log_user'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_notif_log_status'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_notif_subs_channel_enabled'),
      ]),
    );
    expect(calls.at(-1)!.sql).toContain('INSERT INTO notification_subscriptions');
    expect(row.id).toBe('sub-created');
  });
});
