CREATE TABLE IF NOT EXISTS dca_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dca_schedule_id uuid NOT NULL REFERENCES dca_schedules(id) ON DELETE CASCADE,
  amount_in numeric NOT NULL,
  amount_out numeric,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  error text,
  builder_code text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dca_schedules ADD COLUMN IF NOT EXISTS consecutive_failures int NOT NULL DEFAULT 0;
ALTER TABLE dca_schedules ADD COLUMN IF NOT EXISTS end_condition text DEFAULT 'never'
  CHECK (end_condition IN ('never','count','date'));
ALTER TABLE dca_schedules ADD COLUMN IF NOT EXISTS end_date timestamptz;

CREATE INDEX idx_dca_exec_schedule ON dca_executions(dca_schedule_id, executed_at DESC);
CREATE INDEX idx_dca_exec_status ON dca_executions(status);
