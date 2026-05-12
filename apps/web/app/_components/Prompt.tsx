'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ConfirmationCard,
  ExecutionFailureCard,
  ExecutionPendingCard,
  ExecutionSuccessCard,
  type SerializedConfirmationCardProps,
  type SerializedSendCallsEnvelope,
} from '@sherpa/ui';
import { useSherpaSendCalls } from '../../lib/wagmi';
import { useExecuteConfirm } from './useExecuteConfirm';

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
  | { ok: false; error: string; error_detail?: string };

type FlowPhase = 'idle' | 'preview' | 'executing' | 'confirming' | 'success' | 'failure';

type FlowFailure = {
  actionDescription: string;
  errorDetail: string;
};

type FlowSuccess = {
  actionDescription: string;
  txHash?: string;
};

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

const actionVerb: Record<string, string> = {
  SEND: 'Send',
  BUY: 'Buy',
  BET: 'Bet',
  BALANCE: 'Show balance',
  HISTORY: 'Show history',
};

function actionDescription(card: SerializedConfirmationCardProps | undefined): string {
  if (!card) return 'complete this action';
  const verb = actionVerb[card.intent] ?? card.primary_action_label;
  if (!card.primary_amount_display || card.primary_amount_display === '—') return verb;
  if (card.primary_amount_display.toLowerCase().startsWith(verb.toLowerCase())) {
    return card.primary_amount_display;
  }
  return `${verb} ${card.primary_amount_display}`;
}

function errorDetailFrom(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function Prompt({
  connectionEpoch = 0,
  isConnected,
  userAddress,
  disconnectedCopy = 'Connect wallet to start',
}: PromptProps) {
  const [input, setInput] = useState('send 5 usdc to 0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  const [parseBusy, setParseBusy] = useState(false);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [phase, setPhase] = useState<FlowPhase>('idle');
  const [failure, setFailure] = useState<FlowFailure | null>(null);
  const [success, setSuccess] = useState<FlowSuccess | null>(null);
  const { sendSponsoredCallsAsync } = useSherpaSendCalls();
  const executeConfirm = useExecuteConfirm();
  const walletState = useRef({ connectionEpoch, isConnected, userAddress });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const busy = parseBusy || phase === 'executing' || phase === 'confirming';

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
    setParseBusy(true);
    setParsed(null);
    setFailure(null);
    setSuccess(null);
    executeConfirm.reset();
    setPhase('idle');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input, userKey: userAddress }),
      });
      const body = (await res.json()) as ParseResponse;
      setParsed(body);
      setPhase(body.card ? 'preview' : 'idle');
    } catch (err) {
      setParsed({ error: String(err) });
    } finally {
      setParseBusy(false);
    }
  };

  const confirm = async () => {
    if (!isConnected || !userAddress) return;
    const card = parsed?.card;
    if (!card) return;
    const description = actionDescription(card);
    const requestUserAddress = userAddress;
    const requestConnectionEpoch = connectionEpoch;
    setFailure(null);
    setSuccess(null);
    executeConfirm.reset();
    setPhase('executing');
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
        setFailure({
          actionDescription: description,
          errorDetail: 'Wallet disconnected. Connect to continue.',
        });
        setPhase('failure');
        return;
      }
      if (!body.ok) {
        setFailure({
          actionDescription: description,
          errorDetail: body.error_detail ?? body.error,
        });
        setPhase('failure');
        return;
      }
      if (body.ok && body.card.batch) {
        await sendSponsoredCallsAsync(toSendCallsVariables(body.card.batch));
      }
      if (!body.card.batch) {
        setSuccess({ actionDescription: description });
        setPhase('success');
        return;
      }
      setPhase('confirming');
      executeConfirm.start(body.auditLogId);
    } catch (err) {
      setFailure({ actionDescription: description, errorDetail: errorDetailFrom(err) });
      setPhase('failure');
    }
  };

  useEffect(() => {
    if (phase !== 'confirming') return;
    const description = actionDescription(parsed?.card);
    if (executeConfirm.status === 'success') {
      setSuccess({ actionDescription: description, txHash: executeConfirm.txHash });
      setPhase('success');
    }
    if (executeConfirm.status === 'failure' || executeConfirm.status === 'timeout') {
      setFailure({
        actionDescription: description,
        errorDetail: executeConfirm.errorDetail ?? 'Confirmation failed',
      });
      setPhase('failure');
    }
  }, [
    executeConfirm.errorDetail,
    executeConfirm.status,
    executeConfirm.txHash,
    parsed?.card,
    phase,
  ]);

  const focusPrompt = () => {
    inputRef.current?.focus();
  };

  const resetActionWorkspace = () => {
    setInput('');
    setParsed(null);
    setFailure(null);
    setSuccess(null);
    executeConfirm.reset();
    setPhase('idle');
    focusPrompt();
  };

  const editAndRetry = () => {
    setFailure(null);
    setSuccess(null);
    executeConfirm.reset();
    setPhase(parsed?.card ? 'preview' : 'idle');
    focusPrompt();
  };

  const cancel = () => {
    setParsed(null);
    setFailure(null);
    setSuccess(null);
    executeConfirm.reset();
    setPhase('idle');
  };

  const retry = () => {
    void confirm();
  };

  return (
    <section className="flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
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
      {phase === 'success' && success ? (
        <ExecutionSuccessCard
          actionDescription={success.actionDescription}
          onSendAnother={resetActionWorkspace}
          txHash={success.txHash}
        />
      ) : null}

      {phase === 'failure' && failure ? (
        <ExecutionFailureCard
          actionDescription={failure.actionDescription}
          errorDetail={failure.errorDetail}
          onEditAndRetry={editAndRetry}
          onSendAnother={resetActionWorkspace}
          onTryAgain={retry}
        />
      ) : null}

      {phase === 'confirming' ? <ExecutionPendingCard message={executeConfirm.message} /> : null}

      {phase === 'preview' && parsed?.card ? (
        <ConfirmationCard
          card={parsed.card}
          disabled={!isConnected || busy}
          onCancel={cancel}
          onConfirm={confirm}
        />
      ) : null}
    </section>
  );
}
