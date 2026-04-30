'use client';

import { useState } from 'react';
import { ConfirmationCard, tokens, type SerializedConfirmationCardProps } from '@sherpa/ui';

type ParseResponse = {
  parsed?: { intent: string; confidence: number };
  card?: SerializedConfirmationCardProps;
  error?: string;
};

const inputStyle = {
  background: tokens.color.surface,
  color: tokens.color.fg,
  border: `1px solid ${tokens.color.surface2}`,
  borderRadius: tokens.radius.md,
  padding: `${tokens.space.md}`,
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

export function Prompt() {
  const [input, setInput] = useState('send 5 usdc to 0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);

  const submit = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, userKey: 'web-demo' }),
      });
      const json = (await res.json()) as ParseResponse;
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setBusy(false);
    }
  };

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
            if (e.key === 'Enter') submit();
          }}
          placeholder="send 5 usdc to vitalik.eth"
          style={inputStyle}
          aria-label="Sherpa prompt"
        />
        <button type="button" style={buttonStyle} disabled={busy} onClick={submit}>
          {busy ? '…' : 'Go'}
        </button>
      </div>

      {result?.error ? (
        <div style={{ color: tokens.color.danger, fontSize: 14 }}>Error: {result.error}</div>
      ) : null}
      {result?.parsed ? (
        <div style={{ color: tokens.color.muted, fontSize: 12 }}>
          parsed: {result.parsed.intent} (conf {result.parsed.confidence.toFixed(2)})
        </div>
      ) : null}
      {result?.card ? (
        <ConfirmationCard
          card={result.card}
          onConfirm={() => {
            // Stage 1 Week 3+ wires Coinbase Smart Wallet here.
            alert(`(week 2 demo) would sign & send plan: ${result.card?.intent}`);
          }}
        />
      ) : null}
    </section>
  );
}
