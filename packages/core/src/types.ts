import type { Address } from '@sherpa/safety';

/** Stage-1+ supported intents. Keep in sync with the parser. */
export type Intent =
  | 'SEND'
  | 'BUY'
  | 'BET'
  | 'SWAP'
  | 'LEND'
  | 'DEPOSIT'
  | 'BALANCE'
  | 'HISTORY'
  | 'UNKNOWN';

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
 * EIP-5792 `wallet_sendCalls` envelope. Surfaced on the confirmation card
 * for the frontend; null when the plan is a single non-batched step (e.g.
 * pure SEND that the wallet can submit directly).
 */
export type SendCallsEnvelope = {
  version: '1.0';
  chainId: `0x${string}`;
  calls: Array<{ to: Address; data: `0x${string}`; value: `0x${string}` }>;
  capabilities?: { paymasterService?: { url: string } };
};

export type RiskIndicator =
  | string
  | { level?: 'info' | 'warning' | 'danger'; label: string; detail?: string };

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
  /** Optional risk indicators rendered by M2 when M3/safety provides them. */
  risk_indicators?: RiskIndicator[];
  steps: ExecutionStep[];
  /** Sponsored EIP-5792 batch the frontend should submit (when steps.length > 0). */
  batch?: SendCallsEnvelope;
  /** External redirect (e.g. Coinbase Onramp URL) for off-chain actions. */
  redirect_url?: string;
  gas_display: string;
  warnings: string[];
  estimated_completion_ms: number;
};

export type ParseResponse = {
  parsed: ParsedIntent;
  card?: ConfirmationCardProps;
  error?: string;
};

export type ExecuteResponse =
  | { ok: true; auditLogId: number; planHash: string }
  | { ok: false; error: string };
