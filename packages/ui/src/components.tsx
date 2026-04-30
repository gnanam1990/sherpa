'use client';

/**
 * Shared React components (M2 ownership).
 *
 * Inline style only — `@sherpa/ui` deliberately avoids bringing a styling
 * runtime (Tailwind's compiler is banned per M2 hard rules; a plain
 * utility-class approach can be layered on later without breaking callers).
 */

import type { CSSProperties, ReactNode } from 'react';
import { tokens } from './index.js';

export type SerializedStep = {
  kind: string;
  to: string;
  data: string;
  value: string;
  label: string;
};

export type SerializedConfirmationCardProps = {
  intent: string;
  primary_action_label: string;
  primary_amount_display: string;
  secondary_amount_display?: string;
  recipient_display?: string;
  recipient_metadata?: Record<string, unknown>;
  steps: SerializedStep[];
  gas_display: string;
  warnings: string[];
  estimated_completion_ms: number;
};

const cardStyle: CSSProperties = {
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.surface2}`,
  borderRadius: tokens.radius.lg,
  padding: tokens.space.lg,
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space.md,
  maxWidth: 420,
  width: '100%',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 14,
  color: tokens.color.muted,
};

const primaryStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  color: tokens.color.fg,
  margin: 0,
};

const buttonStyle: CSSProperties = {
  background: tokens.color.baseBlue,
  color: '#fff',
  border: 'none',
  borderRadius: tokens.radius.md,
  padding: `${tokens.space.sm} ${tokens.space.md}`,
  fontSize: 16,
  fontWeight: 500,
  cursor: 'pointer',
  width: '100%',
};

const badgeStyle = (bg: string): CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: tokens.radius.sm,
  background: bg,
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
});

export function ConfirmationCard(props: {
  card: SerializedConfirmationCardProps;
  onConfirm?: () => void;
}) {
  const { card, onConfirm } = props;
  return (
    <div style={cardStyle} data-testid="confirmation-card">
      <div style={rowStyle}>
        <span style={badgeStyle(tokens.color.baseBlue)}>{card.intent}</span>
        <span>{card.gas_display}</span>
      </div>
      <p style={primaryStyle}>{card.primary_amount_display}</p>
      {card.secondary_amount_display ? (
        <div style={{ color: tokens.color.muted, fontSize: 14, marginTop: -8 }}>
          {card.secondary_amount_display}
        </div>
      ) : null}
      {card.recipient_display ? (
        <div style={rowStyle}>
          <span>To</span>
          <span style={{ color: tokens.color.fg }}>{card.recipient_display}</span>
        </div>
      ) : null}
      {card.warnings.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: tokens.space.md, color: tokens.color.warning }}>
          {card.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <button style={buttonStyle} onClick={onConfirm} type="button">
        {card.primary_action_label}
      </button>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: tokens.space.xl,
        gap: tokens.space.lg,
        background: tokens.color.bg,
        color: tokens.color.fg,
      }}
    >
      {children}
    </main>
  );
}
