'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MessageThread,
  formatExecutionError,
  type ActionStatus,
  type ActionSummary,
  type SerializedConfirmationCardProps,
  type SerializedSendCallsEnvelope,
} from '@sherpa/ui';
import { useSherpaSendCalls } from '../../lib/wagmi';
import { useExecuteConfirm } from './useExecuteConfirm';
import { useChatHistory } from '../../hooks/useChatHistory';

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

type FlowPhase = 'idle' | 'parsing' | 'executing' | 'confirming';

type PendingConfirmation = {
  card: SerializedConfirmationCardProps;
  sourceInput: string;
};

type ConfirmingAction = PendingConfirmation & { messageId: string };

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

const successVerb: Record<string, string> = {
  SEND: 'Sent',
  BUY: 'Bought',
  BET: 'Placed bet',
  BALANCE: 'Checked balance',
  HISTORY: 'Loaded history',
};

const pendingVerb: Record<string, string> = {
  SEND: 'Sending',
  BUY: 'Buying',
  BET: 'Placing bet',
  BALANCE: 'Checking balance',
  HISTORY: 'Loading history',
};

function summaryFor(
  card: SerializedConfirmationCardProps,
  status: ActionStatus,
  txHash?: string,
  errorDetail?: string,
): ActionSummary {
  if (status === 'failed') {
    return {
      action: 'Transaction failed',
      error: errorDetail ? formatExecutionError(errorDetail) : undefined,
      status,
      subject: actionDescription(card),
      txHash,
    };
  }

  const verb = status === 'success' ? successVerb[card.intent] : pendingVerb[card.intent];
  const amount = card.primary_amount_display === '—' ? '' : card.primary_amount_display;
  return {
    action: [verb ?? card.primary_action_label, amount].filter(Boolean).join(' '),
    status,
    subject: card.recipient_display
      ? `to ${card.recipient_display}`
      : card.secondary_amount_display,
    txHash,
  };
}

export function Prompt({
  connectionEpoch = 0,
  isConnected,
  userAddress,
  disconnectedCopy = 'Connect wallet to start',
}: PromptProps) {
  const [input, setInput] = useState('send 5 usdc to 0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  const [parseBusy, setParseBusy] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>('idle');
  const [confirmingAction, setConfirmingAction] = useState<ConfirmingAction | null>(null);
  const pendingConfirmations = useRef<Record<string, PendingConfirmation>>({});
  const { sendSponsoredCallsAsync } = useSherpaSendCalls();
  const executeConfirm = useExecuteConfirm();
  const chat = useChatHistory(userAddress);
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
    const prompt = input.trim();
    if (!prompt) return;
    const submittedAt = Date.now();
    const userMessage = chat.makeClientMessage('user', { kind: 'text', text: prompt }, submittedAt);
    const thinkingMessage = chat.makeClientMessage('sherpa', { kind: 'thinking' }, submittedAt + 1);
    chat.addMessage(userMessage);
    chat.addMessage(thinkingMessage);
    setInput('');
    setParseBusy(true);
    executeConfirm.reset();
    setPhase('parsing');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: prompt, userKey: userAddress }),
      });
      const body = (await res.json()) as ParseResponse;
      if (body.card) {
        pendingConfirmations.current[thinkingMessage.id] = { card: body.card, sourceInput: prompt };
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'confirmation', card: body.card, sourceInput: prompt },
        });
      } else {
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: body.error ?? 'I could not build a plan for that.' },
        });
      }
    } catch (err) {
      chat.updateMessage(thinkingMessage.id, {
        content: { kind: 'text', text: `Error: ${String(err)}` },
      });
    } finally {
      setParseBusy(false);
      setPhase('idle');
    }
  };

  const confirm = async (messageId: string) => {
    if (!isConnected || !userAddress) return;
    const pending = pendingConfirmations.current[messageId];
    if (!pending) return;
    const { card, sourceInput } = pending;
    const requestUserAddress = userAddress;
    const requestConnectionEpoch = connectionEpoch;
    executeConfirm.reset();
    setPhase('executing');
    chat.updateMessage(messageId, {
      content: { kind: 'action', summary: summaryFor(card, 'pending'), card },
    });
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: sourceInput, userAddress }),
      });
      const body = (await res.json()) as ExecuteResponse;
      const latestWallet = walletState.current;
      if (
        !latestWallet.isConnected ||
        latestWallet.connectionEpoch !== requestConnectionEpoch ||
        latestWallet.userAddress?.toLowerCase() !== requestUserAddress.toLowerCase()
      ) {
        chat.updateMessage(messageId, {
          content: {
            kind: 'action',
            summary: summaryFor(
              card,
              'failed',
              undefined,
              'Wallet disconnected. Connect to continue.',
            ),
            card,
          },
        });
        setPhase('idle');
        return;
      }
      if (!body.ok) {
        chat.updateMessage(messageId, {
          content: {
            kind: 'action',
            summary: summaryFor(card, 'failed', undefined, body.error_detail ?? body.error),
            card,
          },
        });
        setPhase('idle');
        return;
      }
      if (body.ok && body.card.batch) {
        await sendSponsoredCallsAsync(toSendCallsVariables(body.card.batch));
      }
      if (!body.card.batch) {
        chat.updateMessage(messageId, {
          content: { kind: 'action', summary: summaryFor(card, 'success'), card },
        });
        setPhase('idle');
        return;
      }
      setConfirmingAction({ card, messageId, sourceInput });
      setPhase('confirming');
      executeConfirm.start(body.auditLogId);
    } catch (err) {
      chat.updateMessage(messageId, {
        content: {
          kind: 'action',
          summary: summaryFor(card, 'failed', undefined, errorDetailFrom(err)),
          card,
        },
      });
      setPhase('idle');
    }
  };

  useEffect(() => {
    if (phase !== 'confirming' || !confirmingAction) return;
    if (executeConfirm.status === 'success') {
      chat.updateMessage(confirmingAction.messageId, {
        content: {
          kind: 'action',
          summary: summaryFor(confirmingAction.card, 'success', executeConfirm.txHash),
          card: confirmingAction.card,
        },
      });
      setConfirmingAction(null);
      setPhase('idle');
    }
    if (executeConfirm.status === 'failure' || executeConfirm.status === 'timeout') {
      chat.updateMessage(confirmingAction.messageId, {
        content: {
          kind: 'action',
          summary: summaryFor(
            confirmingAction.card,
            'failed',
            executeConfirm.txHash,
            executeConfirm.errorDetail ?? 'Confirmation failed',
          ),
          card: confirmingAction.card,
        },
      });
      setConfirmingAction(null);
      setPhase('idle');
    }
  }, [
    chat,
    confirmingAction,
    executeConfirm.errorDetail,
    executeConfirm.status,
    executeConfirm.txHash,
    phase,
  ]);

  const cancel = (messageId: string) => {
    const pending = pendingConfirmations.current[messageId];
    if (pending) {
      chat.updateMessage(messageId, {
        content: { kind: 'text', text: `Cancelled ${actionDescription(pending.card)}` },
      });
      delete pendingConfirmations.current[messageId];
    }
    executeConfirm.reset();
    setPhase('idle');
  };

  return (
    <section className="flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3">
      <MessageThread
        isLoading={chat.isLoading}
        messages={chat.messages}
        onCancelConfirmation={cancel}
        onConfirmMessage={(messageId) => void confirm(messageId)}
        onLoadOlder={() => void chat.loadOlder()}
        showLoadOlder={chat.showLoadOlder}
      />

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
          Preview
        </button>
      </div>
    </section>
  );
}
