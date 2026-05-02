'use client';

import { useState } from 'react';
import {
  ConfirmationCard,
  tokens,
  type SerializedConfirmationCardProps,
  type SerializedSendCallsEnvelope,
} from '@sherpa/ui';

type ParseResponse = {
  parsed?: { intent: string; confidence: number };
  card?: SerializedConfirmationCardProps;
  error?: string;
};

type ExecuteResponse =
  | {
      ok: true;
      auditLogId: number;
      planHash: string;
      card: SerializedConfirmationCardProps;
    }
  | { ok: false; error: string };

const DEMO_USER = '0x1111111111111111111111111111111111111111';

const inputStyle = {
  background: tokens.color.surface,
  color: tokens.color.fg,
  border: `1px solid ${tokens.color.surface2}`,
  borderRadius: tokens.radius.md,
  padding: tokens.space.md,
  fontSize: 16,
  width: '100%',
  outline: 'none',
};

const buttonStyle = {
  background: tokens.color.baseBlue,
  color: '#fff',
  border: 'none',
  borderRadius: tokens.radius.md,
  padding: `${tokens.space.sm} ${tokens.space.md}`,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const codeStyle = {
  background: tokens.color.surface,
  border: `1px solid ${tokens.color.surface2}`,
  borderRadius: tokens.radius.md,
  padding: tokens.space.md,
  fontSize: 11,
  color: tokens.color.muted,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-all' as const,
  maxHeight: 240,
  overflow: 'auto',
};

export function Prompt() {
  const [input, setInput] = useState('send 5 usdc to 0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [executed, setExecuted] = useState<ExecuteResponse | null>(null);

  const submitParse = async () => {
    setBusy(true);
    setParsed(null);
    setExecuted(null);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, userKey: DEMO_USER }),
      });
      setParsed((await res.json()) as ParseResponse);
    } catch (err) {
      setParsed({ error: String(err) });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, userAddress: DEMO_USER }),
      });
      setExecuted((await res.json()) as ExecuteResponse);
    } catch (err) {
      setExecuted({ ok: false, error: String(err) });
    } finally {
      setBusy(false);
    }
  };

  const batch: SerializedSendCallsEnvelope | undefined = executed?.ok
    ? executed.card.batch
    : parsed?.card?.batch;

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.space.md,
        width: '100%',
        maxWidth: 560,
      }}
    >
      <div style={{ display: 'flex', gap: tokens.space.sm, alignItems: 'stretch' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitParse();
          }}
          placeholder="send 5 usdc to vitalik.eth"
          style={inputStyle}
          aria-label="Sherpa prompt"
        />
        <button type="button" style={buttonStyle} disabled={busy} onClick={submitParse}>
          {busy ? '…' : 'Preview'}
        </button>
      </div>

      {parsed?.error ? (
        <div style={{ color: tokens.color.danger, fontSize: 14 }}>Error: {parsed.error}</div>
      ) : null}
      {parsed?.parsed ? (
        <div style={{ color: tokens.color.muted, fontSize: 12 }}>
          parsed: {parsed.parsed.intent} (conf {parsed.parsed.confidence.toFixed(2)})
        </div>
      ) : null}
      {parsed?.card ? <ConfirmationCard card={parsed.card} onConfirm={confirm} /> : null}

      {executed && !executed.ok ? (
        <div style={{ color: tokens.color.danger, fontSize: 14 }}>
          Execute failed: {executed.error}
        </div>
      ) : null}
      {executed?.ok ? (
        <div style={{ color: tokens.color.success, fontSize: 13 }}>
          ✓ audit-log #{executed.auditLogId} · plan {executed.planHash.slice(0, 14)}…
        </div>
      ) : null}
      {batch ? (
        <details>
          <summary style={{ cursor: 'pointer', color: tokens.color.muted, fontSize: 12 }}>
            EIP-5792 wallet_sendCalls payload ({batch.calls.length} calls)
          </summary>
          <pre style={codeStyle}>{JSON.stringify(batch, null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
}
