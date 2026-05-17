DROP INDEX IF EXISTS idx_notif_subs_channel_enabled;

ALTER TABLE notification_log
  DROP COLUMN IF EXISTS result,
  DROP COLUMN IF EXISTS payload,
  DROP COLUMN IF EXISTS recipient;

ALTER TABLE notification_subscriptions
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS label,
  DROP COLUMN IF EXISTS recipient;
