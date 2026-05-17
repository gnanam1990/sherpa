import type pg from 'pg';
import { query, type QueryResult } from '@sherpa/config';

export type NotificationChannel = 'push' | 'email' | 'farcaster' | 'telegram';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

export type NotificationDispatchResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type NotificationSubscription = {
  id: string;
  userAddress: string;
  channel: NotificationChannel;
  recipient: string;
  condition?: string;
  label?: string;
  enabled: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: number;
  metadata: Record<string, unknown>;
  storage: 'memory' | 'postgres';
};

export type NotificationLogEntry = {
  id: string;
  userAddress: string;
  channel: NotificationChannel;
  recipient?: string;
  title: string;
  body: string;
  payload?: NotificationPayload;
  result?: NotificationDispatchResult;
  status: NotificationStatus;
  messageId?: string;
  error?: string;
  sentAt?: string;
  createdAt: number;
  storage: 'memory' | 'postgres';
};

export type CreateNotificationSubscriptionInput = {
  userAddress: string;
  channel: NotificationChannel;
  recipient: string;
  condition?: string;
  label?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: number;
};

export type CreateNotificationLogInput = {
  userAddress: string;
  channel: NotificationChannel;
  recipient?: string;
  payload: NotificationPayload;
  result?: NotificationDispatchResult;
  status: NotificationStatus;
  sentAt?: string;
  createdAt?: number;
};

export interface NotificationStore {
  subscribe(input: CreateNotificationSubscriptionInput): Promise<NotificationSubscription>;
  unsubscribe(id: string): Promise<void>;
  getByUser(userAddress: string): Promise<NotificationSubscription[]>;
  logNotification(notification: CreateNotificationLogInput): Promise<NotificationLogEntry>;
  getRecentNotifications(userAddress: string, limit?: number): Promise<NotificationLogEntry[]>;
}

export class InMemoryNotificationStore implements NotificationStore {
  private subscriptions = new Map<string, NotificationSubscription>();
  private notifications: NotificationLogEntry[] = [];

  async subscribe(input: CreateNotificationSubscriptionInput): Promise<NotificationSubscription> {
    const id = crypto.randomUUID();
    const subscription: NotificationSubscription = {
      id,
      userAddress: input.userAddress.toLowerCase(),
      channel: input.channel,
      recipient: input.recipient,
      ...(input.condition ? { condition: input.condition } : {}),
      ...(input.label ? { label: input.label } : {}),
      enabled: input.enabled ?? true,
      triggerCount: 0,
      createdAt: input.createdAt ?? Date.now(),
      metadata: input.metadata ?? {},
      storage: 'memory',
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async unsubscribe(id: string): Promise<void> {
    const sub = this.subscriptions.get(id);
    if (sub) this.subscriptions.set(id, { ...sub, enabled: false });
  }

  async getByUser(addr: string): Promise<NotificationSubscription[]> {
    return Array.from(this.subscriptions.values()).filter(
      (subscription) => subscription.userAddress.toLowerCase() === addr.toLowerCase(),
    );
  }

  async logNotification(input: CreateNotificationLogInput): Promise<NotificationLogEntry> {
    const id = crypto.randomUUID();
    const notification: NotificationLogEntry = {
      id,
      userAddress: input.userAddress.toLowerCase(),
      channel: input.channel,
      ...(input.recipient ? { recipient: input.recipient } : {}),
      title: input.payload.title,
      body: input.payload.body,
      payload: input.payload,
      ...(input.result ? { result: input.result } : {}),
      status: input.status,
      ...(input.result?.messageId ? { messageId: input.result.messageId } : {}),
      ...(input.result?.error ? { error: input.result.error } : {}),
      ...(input.sentAt ? { sentAt: input.sentAt } : {}),
      createdAt: input.createdAt ?? Date.now(),
      storage: 'memory',
    };
    this.notifications.push(notification);
    return notification;
  }

  async getRecentNotifications(addr: string, limit = 10): Promise<NotificationLogEntry[]> {
    return this.notifications
      .filter((notification) => notification.userAddress.toLowerCase() === addr.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

type SubscriptionDbRow = {
  id: string;
  user_address: string;
  channel: NotificationChannel;
  recipient: string | null;
  condition: string | null;
  label: string | null;
  enabled: boolean;
  last_triggered_at: Date | string | null;
  trigger_count: number;
  created_at: Date | string;
  metadata: Record<string, unknown> | null;
};

type NotificationLogDbRow = {
  id: string;
  user_address: string;
  channel: NotificationChannel;
  recipient: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  payload: NotificationPayload | null;
  result: NotificationDispatchResult | null;
  status: NotificationStatus;
  message_id: string | null;
  error: string | null;
  sent_at: Date | string | null;
  created_at: Date | string;
};

function timeValue(value: Date | string | null): number | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function isoValue(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isNotificationPayload(value: unknown): value is NotificationPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { title?: unknown }).title === 'string' &&
    typeof (value as { body?: unknown }).body === 'string'
  );
}

function isUndefinedColumnError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === '42703'
  );
}

function isMissingRelationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === '42P01'
  );
}

async function ensureNotificationSchema(pool: pg.Pool): Promise<void> {
  await query(
    pool,
    `CREATE TABLE IF NOT EXISTS notification_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_address text NOT NULL,
      channel text NOT NULL CHECK (channel IN ('push','email','farcaster','telegram')),
      condition text,
      enabled boolean NOT NULL DEFAULT true,
      last_triggered_at timestamptz,
      trigger_count int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  await query(
    pool,
    `CREATE TABLE IF NOT EXISTS notification_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_address text NOT NULL,
      channel text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      data jsonb,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
      message_id text,
      error text,
      sent_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  await query(
    pool,
    `ALTER TABLE notification_subscriptions
      ADD COLUMN IF NOT EXISTS recipient text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS label text,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb`,
  );
  await query(
    pool,
    `ALTER TABLE notification_log
      ADD COLUMN IF NOT EXISTS recipient text,
      ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS result jsonb`,
  );
  await query(
    pool,
    `CREATE INDEX IF NOT EXISTS idx_notif_subs_user
      ON notification_subscriptions(user_address, enabled)`,
  );
  await query(
    pool,
    `CREATE INDEX IF NOT EXISTS idx_notif_log_user
      ON notification_log(user_address, created_at DESC)`,
  );
  await query(
    pool,
    `CREATE INDEX IF NOT EXISTS idx_notif_log_status
      ON notification_log(status, created_at)`,
  );
  await query(
    pool,
    `CREATE INDEX IF NOT EXISTS idx_notif_subs_channel_enabled
      ON notification_subscriptions(channel, enabled)`,
  );
}

async function retryAfterSchemaCreate<T>(
  pool: pg.Pool,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (!isMissingRelationError(err)) throw err;
    await ensureNotificationSchema(pool);
    return operation();
  }
}

function subscriptionFromDb(row: SubscriptionDbRow): NotificationSubscription {
  const lastTriggeredAt = isoValue(row.last_triggered_at);
  return {
    id: row.id,
    userAddress: row.user_address,
    channel: row.channel,
    recipient: row.recipient ?? '',
    ...(row.condition ? { condition: row.condition } : {}),
    ...(row.label ? { label: row.label } : {}),
    enabled: row.enabled,
    ...(lastTriggeredAt ? { lastTriggeredAt } : {}),
    triggerCount: row.trigger_count,
    createdAt: timeValue(row.created_at) ?? Date.now(),
    metadata: row.metadata ?? {},
    storage: 'postgres',
  };
}

function notificationFromDb(row: NotificationLogDbRow): NotificationLogEntry {
  const dataPayload = (row.data?.payload ?? undefined) as NotificationPayload | undefined;
  const dataResult = (row.data?.result ?? undefined) as NotificationDispatchResult | undefined;
  const dataRecipient = row.data?.recipient;
  const payload = isNotificationPayload(row.payload)
    ? row.payload
    : isNotificationPayload(dataPayload)
      ? dataPayload
      : { title: row.title, body: row.body };
  const result = row.result ?? dataResult;
  const sentAt = isoValue(row.sent_at);

  return {
    id: row.id,
    userAddress: row.user_address,
    channel: row.channel,
    ...(row.recipient
      ? { recipient: row.recipient }
      : typeof dataRecipient === 'string'
        ? { recipient: dataRecipient }
        : {}),
    title: row.title,
    body: row.body,
    payload,
    ...(result ? { result } : {}),
    status: row.status,
    ...(row.message_id ? { messageId: row.message_id } : {}),
    ...(row.error ? { error: row.error } : {}),
    ...(sentAt ? { sentAt } : {}),
    createdAt: timeValue(row.created_at) ?? Date.now(),
    storage: 'postgres',
  };
}

export function createPostgresNotificationStore(pool: pg.Pool): NotificationStore {
  return {
    async subscribe(input: CreateNotificationSubscriptionInput): Promise<NotificationSubscription> {
      const params = [
        input.userAddress.toLowerCase(),
        input.channel,
        input.recipient,
        input.condition ?? null,
        input.label ?? null,
        input.enabled ?? true,
        input.metadata ?? {},
        new Date(input.createdAt ?? Date.now()),
      ];
      let result: QueryResult<SubscriptionDbRow>;
      try {
        result = await retryAfterSchemaCreate(
          pool,
          () => query<SubscriptionDbRow>(
            pool,
            `INSERT INTO notification_subscriptions (
               user_address, channel, recipient, condition, label, enabled, metadata, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, user_address, channel, recipient, condition, label, enabled,
               last_triggered_at, trigger_count, created_at, metadata`,
            params,
          ),
        );
      } catch (err) {
        if (!isUndefinedColumnError(err)) throw err;
        result = await query<SubscriptionDbRow>(
          pool,
          `INSERT INTO notification_subscriptions (
             user_address, channel, condition, enabled, created_at
           ) VALUES ($1, $2, $3, $4, $5)
           RETURNING id, user_address, channel, NULL::text AS recipient, condition,
             NULL::text AS label, enabled, last_triggered_at, trigger_count,
             created_at, '{}'::jsonb AS metadata`,
          [
            input.userAddress.toLowerCase(),
            input.channel,
            input.condition ?? null,
            input.enabled ?? true,
            new Date(input.createdAt ?? Date.now()),
          ],
        );
      }
      const row = result.rows[0];
      if (!row) throw new Error('[memory/notifications] subscribe returned no row');
      return subscriptionFromDb({
        ...row,
        recipient: row.recipient || input.recipient,
        label: row.label ?? input.label ?? null,
        metadata: row.metadata ?? input.metadata ?? {},
      });
    },

    async unsubscribe(id: string): Promise<void> {
      await query(
        pool,
        `UPDATE notification_subscriptions SET enabled = false WHERE id = $1`,
        [id],
      );
    },

    async getByUser(userAddress: string): Promise<NotificationSubscription[]> {
      let result: QueryResult<SubscriptionDbRow>;
      try {
        result = await retryAfterSchemaCreate(
          pool,
          () => query<SubscriptionDbRow>(
            pool,
            `SELECT id, user_address, channel, recipient, condition, label, enabled,
               last_triggered_at, trigger_count, created_at, metadata
             FROM notification_subscriptions
             WHERE user_address = $1
             ORDER BY created_at DESC`,
            [userAddress.toLowerCase()],
          ),
        );
      } catch (err) {
        if (!isUndefinedColumnError(err)) throw err;
        result = await query<SubscriptionDbRow>(
          pool,
          `SELECT id, user_address, channel, NULL::text AS recipient, condition,
             NULL::text AS label, enabled, last_triggered_at, trigger_count,
             created_at, '{}'::jsonb AS metadata
           FROM notification_subscriptions
           WHERE user_address = $1
           ORDER BY created_at DESC`,
          [userAddress.toLowerCase()],
        );
      }
      return result.rows.map(subscriptionFromDb);
    },

    async logNotification(input: CreateNotificationLogInput): Promise<NotificationLogEntry> {
      const resultPayload = input.result ?? null;
      const data = {
        ...(input.payload.data ? input.payload.data : {}),
        payload: input.payload,
        ...(resultPayload ? { result: resultPayload } : {}),
      };
      const params = [
        input.userAddress.toLowerCase(),
        input.channel,
        input.recipient ?? null,
        input.payload.title,
        input.payload.body,
        data,
        input.payload,
        resultPayload,
        input.status,
        input.result?.messageId ?? null,
        input.result?.error ?? null,
        input.sentAt ? new Date(input.sentAt) : null,
        new Date(input.createdAt ?? Date.now()),
      ];
      let result: QueryResult<NotificationLogDbRow>;
      try {
        result = await retryAfterSchemaCreate(
          pool,
          () => query<NotificationLogDbRow>(
            pool,
            `INSERT INTO notification_log (
               user_address, channel, recipient, title, body, data, payload,
               result, status, message_id, error, sent_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id, user_address, channel, recipient, title, body, data, payload,
               result, status, message_id, error, sent_at, created_at`,
            params,
          ),
        );
      } catch (err) {
        if (!isUndefinedColumnError(err)) throw err;
        result = await query<NotificationLogDbRow>(
          pool,
          `INSERT INTO notification_log (
             user_address, channel, title, body, data, status, message_id,
             error, sent_at, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, user_address, channel, NULL::text AS recipient, title,
             body, data, NULL::jsonb AS payload, NULL::jsonb AS result, status,
             message_id, error, sent_at, created_at`,
          [
            input.userAddress.toLowerCase(),
            input.channel,
            input.payload.title,
            input.payload.body,
            data,
            input.status,
            input.result?.messageId ?? null,
            input.result?.error ?? null,
            input.sentAt ? new Date(input.sentAt) : null,
            new Date(input.createdAt ?? Date.now()),
          ],
        );
      }
      const row = result.rows[0];
      if (!row) throw new Error('[memory/notifications] log insert returned no row');
      return notificationFromDb(row);
    },

    async getRecentNotifications(userAddress: string, limit = 10): Promise<NotificationLogEntry[]> {
      let result: QueryResult<NotificationLogDbRow>;
      try {
        result = await retryAfterSchemaCreate(
          pool,
          () => query<NotificationLogDbRow>(
            pool,
            `SELECT id, user_address, channel, recipient, title, body, data, payload,
               result, status, message_id, error, sent_at, created_at
             FROM notification_log
             WHERE user_address = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userAddress.toLowerCase(), limit],
          ),
        );
      } catch (err) {
        if (!isUndefinedColumnError(err)) throw err;
        result = await query<NotificationLogDbRow>(
          pool,
          `SELECT id, user_address, channel, NULL::text AS recipient, title,
             body, data, NULL::jsonb AS payload, NULL::jsonb AS result, status,
             message_id, error, sent_at, created_at
           FROM notification_log
           WHERE user_address = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [userAddress.toLowerCase(), limit],
        );
      }
      return result.rows.map(notificationFromDb);
    },
  };
}
