export interface AlertRow {
  id: string;
  user_address: string;
  condition_type: string;
  asset: Record<string, unknown> | null;
  comparison: string;
  threshold: string;
  threshold_asset: Record<string, unknown> | null;
  notification_channels: string[];
  triggered_intent: string | null;
  status: string;
  created_at: string;
  last_evaluated_at: string | null;
  triggered_at: string | null;
  trigger_count: number;
  last_value: string | null;
  params: Record<string, unknown>;
  one_shot: boolean;
  cooldown_seconds: number;
  last_triggered_at: string | null;
}

export interface EvaluateResult {
  value: number;
  triggered: boolean;
  error?: string;
}

export type EvaluatorFn = (alert: AlertRow) => Promise<EvaluateResult>;

export interface AlertStore {
  getActive(): Promise<AlertRow[]>;
  getById(id: string): Promise<AlertRow | null>;
  markEvaluated(id: string, value: number): Promise<void>;
  markTriggered(id: string): Promise<void>;
  logEvaluation(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface AlertCycleResult {
  evaluated: number;
  triggered: number;
  failed: number;
  errors: string[];
}
