import type { Address } from '@sherpa/safety';

/** Stage-1+ supported intents. Keep in sync with the parser. */
export type Intent = 'SEND' | 'BUY' | 'BET' | 'SWAP' | 'BALANCE' | 'HISTORY';

export type ParsedIntent = {
  intent: Intent;
  confidence: number;
  raw: string;
  slots: Record<string, unknown>;
};

export type ExecutionStep = {
  kind: 'approve' | 'swap' | 'transfer' | 'bet' | 'custom';
  to: Address;
  data: `0x${string}`;
  value: bigint;
  /** Human-readable label rendered in the confirmation card. */
  label: string;
};

export type ExecutionPlan = {
  steps: ExecutionStep[];
  estimatedCompletionMs: number;
};

/**
 * Contract with M2 (frontend). The executor produces this shape; the UI
 * renders it. Never break without 24h notice — see M1_BACKEND_PACK §3.
 */
export type ConfirmationCardProps = {
  intent: Intent;
  primary_action_label: string;
  primary_amount_display: string;
  secondary_amount_display?: string;
  recipient_display?: string;
  recipient_metadata?: Record<string, unknown>;
  steps: ExecutionStep[];
  gas_display: string;
  warnings: string[];
  estimated_completion_ms: number;
};
