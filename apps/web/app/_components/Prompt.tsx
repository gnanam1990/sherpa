'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ConfirmationCard,
  type SerializedConfirmationCardProps,
  type SerializedSendCallsEnvelope,
} from '@sherpa/ui';
import { useSherpaSendCalls } from '../../lib/wagmi';

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

type PromptProps = {
  connectionEpoch?: number;
  isConnected: boolean;
  userAddress?: `0x${string}`;
  disconnectedCopy?: string;
};

function toSendCallsVariables(batch: SerializedSendCallsEnvelope) {
  return {
    chainId: (batch.chainId.startsWith('0x')
      ? Number.parseInt(batch.chainId, 16)
      : Number(batch.chainId)) as 84532,
    capabilities: batch.capabilities,
    calls: batch.calls.map((call) => ({
      to: call.to as `0x${string}`,
      data: call.data as `0x${string}`,
      value: BigInt(call.value),
    })),
  };
}

export function Prompt({
  connectionEpoch = 0,
  isConnected,
  userAddress,
  disconnectedCopy = 'Connect wallet to start',
}: PromptProps) {
  const [input, setInput] = useState('send 5 usdc to 0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [executed, setExecuted] = useState<ExecuteResponse | null>(null);
  const { sendSponsoredCallsAsync } = useSherpaSendCalls();
  const walletState = useRef({ connectionEpoch, isConnected, userAddress });

  useEffect(() => {
    walletState.current = { connectionEpoch, isConnected, userAddress };
    return () => {
      walletState.current = {
        connectionEpoch: connectionEpoch + 1,
        isConnected: false,
        userAddress: undefined,
      };
    };
  }, [connectionEpoch, isConnected, userAddress]);

  const submitParse = async () => {
    if (!isConnected || !userAddress) return;
    setBusy(true);
    setParsed(null);
    setExecuted(null);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, userKey: userAddress }),
      });
      setParsed((await res.json()) as ParseResponse);
    } catch (err) {
      setParsed({ error: String(err) });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!isConnected || !userAddress) return;
    const requestUserAddress = userAddress;
    const requestConnectionEpoch = connectionEpoch;
    setBusy(true);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, userAddress }),
      });
      const body = (await res.json()) as ExecuteResponse;
      const latestWallet = walletState.current;
      if (
        !latestWallet.isConnected ||
        latestWallet.connectionEpoch !== requestConnectionEpoch ||
        latestWallet.userAddress?.toLowerCase() !== requestUserAddress.toLowerCase()
      ) {
        setExecuted({ ok: false, error: 'Wallet disconnected. Connect to continue.' });
        return;
      }
      if (body.ok && body.card.batch) {
        await sendSponsoredCallsAsync(toSendCallsVariables(body.card.batch));
      }
      setExecuted(body);
    } catch {
      setExecuted({ ok: false, error: 'Wallet request failed. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  const batch: SerializedSendCallsEnvelope | undefined = executed?.ok
    ? executed.card.batch
    : parsed?.card?.batch;

  return (
    <section className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-stretch gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitParse();
          }}
          placeholder={isConnected ? 'send 5 usdc to vitalik.eth' : disconnectedCopy}
          className="min-h-11 w-full rounded-lg border border-sherpa-surface2 bg-sherpa-surface px-4 py-3 text-base text-sherpa-fg outline-none focus:border-sherpa-blue focus:ring-2 focus:ring-sherpa-blue/40 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Sherpa prompt"
          disabled={!isConnected || busy}
          title={!isConnected ? disconnectedCopy : undefined}
        />
        <button
          type="button"
          className="min-h-11 rounded-lg bg-sherpa-blue px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isConnected || busy}
          onClick={submitParse}
        >
          {busy ? '…' : 'Preview'}
        </button>
      </div>

      {parsed?.error ? (
        <div className="text-sm text-sherpa-danger">Error: {parsed.error}</div>
      ) : null}
      {parsed?.parsed ? (
        <div className="text-xs text-sherpa-muted">
          parsed: {parsed.parsed.intent} (conf {parsed.parsed.confidence.toFixed(2)})
        </div>
      ) : null}
      {parsed?.card ? (
        <ConfirmationCard card={parsed.card} disabled={!isConnected || busy} onConfirm={confirm} />
      ) : null}

      {executed && !executed.ok ? (
        <div className="text-sm text-sherpa-danger">Execute failed: {executed.error}</div>
      ) : null}
      {executed?.ok ? (
        <div className="text-sm text-sherpa-success">
          ✓ audit-log #{executed.auditLogId} · plan {executed.planHash.slice(0, 14)}…
        </div>
      ) : null}
      {batch ? (
        <details>
          <summary className="cursor-pointer text-xs text-sherpa-muted">
            EIP-5792 wallet_sendCalls payload ({batch.calls.length} calls)
          </summary>
          <pre className="mt-2 max-h-60 overflow-auto break-all whitespace-pre-wrap rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-4 text-[11px] text-sherpa-muted">
            {JSON.stringify(batch, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
