ALTER TABLE notification_subscriptions
  DROP CONSTRAINT IF EXISTS notification_subscriptions_channel_check;

ALTER TABLE notification_subscriptions
  ADD CONSTRAINT notification_subscriptions_channel_check
  CHECK (channel IN ('push','email','farcaster','telegram'));
