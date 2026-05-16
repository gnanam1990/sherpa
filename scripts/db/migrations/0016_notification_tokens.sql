CREATE TABLE IF NOT EXISTS notification_tokens (
  fid bigint PRIMARY KEY,
  token text NOT NULL,
  url text NOT NULL,
  client text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);
