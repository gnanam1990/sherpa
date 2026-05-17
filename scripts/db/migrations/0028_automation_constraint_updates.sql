ALTER TABLE dca_schedules
  DROP CONSTRAINT IF EXISTS dca_schedules_frequency_check;

ALTER TABLE dca_schedules
  ADD CONSTRAINT dca_schedules_frequency_check
  CHECK (frequency IN ('daily','weekly','biweekly','monthly'));

ALTER TABLE alerts
  DROP CONSTRAINT IF EXISTS alerts_condition_type_check;

ALTER TABLE alerts
  ADD CONSTRAINT alerts_condition_type_check
  CHECK (condition_type IN ('price','balance','health-factor','gas','apy','contract-event'));
