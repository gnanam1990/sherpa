CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push','email','farcaster','telegram')),
  condition text,
  enabled boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_log (
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
);

CREATE INDEX idx_notif_subs_user ON notification_subscriptions(user_address, enabled);
CREATE INDEX idx_notif_log_user ON notification_log(user_address, created_at DESC);
CREATE INDEX idx_notif_log_status ON notification_log(status, created_at);
