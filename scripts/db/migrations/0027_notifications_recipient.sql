ALTER TABLE notification_subscriptions
  ADD COLUMN IF NOT EXISTS recipient text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS result jsonb;

CREATE INDEX IF NOT EXISTS idx_notif_subs_channel_enabled
  ON notification_subscriptions(channel, enabled);
