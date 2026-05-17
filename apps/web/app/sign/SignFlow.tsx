'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  ConfirmationCard,
  ConnectButton,
  type SerializedConfirmationCardProps,
  type SerializedSendCallsEnvelope,
} from '@sherpa/ui';
import { useSherpaCallsStatus, useSherpaSendCalls } from '../../lib/wagmi';

type TokenData = {
  surface: string;
  surfaceUserId: string;
  intentPayload: unknown;
  expiresAt: string;
  consumed: boolean;
};

type CallsStatusReceipt = {
  transactionHash?: string;
};

type CallsStatusResult = {
  receipts?: CallsStatusReceipt[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSendCallsEnvelope(value: unknown): value is SerializedSendCallsEnvelope {
  return (
    isRecord(value) &&
    value.version === '1.0' &&
    typeof value.chainId === 'string' &&
    Array.isArray(value.calls)
  );
}

function isConfirmationCard(value: unknown): value is SerializedConfirmationCardProps {
  return (
    isRecord(value) &&
    typeof value.intent === 'string' &&
    typeof value.primary_action_label === 'string' &&
    typeof value.primary_amount_display === 'string'
  );
}

function cardFromPayload(payload: unknown): SerializedConfirmationCardProps | undefined {
  if (isConfirmationCard(payload)) return payload;
  if (isRecord(payload) && isConfirmationCard(payload.card)) return payload.card;
  return undefined;
}

function toSendCallsVariables(batch: SerializedSendCallsEnvelope) {
  return {
    chainId: (batch.chainId.startsWith('0x')
      ? Number.parseInt(batch.chainId, 16)
      : Number(batch.chainId)) as 84532 | 8453,
    capabilities: batch.capabilities,
    calls: batch.calls.map((call) => ({
      to: call.to as `0x${string}`,
      data: call.data as `0x${string}`,
      value: BigInt(call.value),
    })),
  };
}

export function SignFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isConnected } = useAccount();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [consuming, setConsuming] = useState(false);

  const {
    sendSponsoredCalls,
    data: callsData,
    error: sendError,
    isError: sendFailed,
    isPending,
  } = useSherpaSendCalls();
  const { data: callsStatus } = useSherpaCallsStatus({
    id: callsData?.id,
    query: { enabled: !!callsData?.id },
  });

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      return;
    }
    fetch(`/api/surfaces/sign-token/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(setTokenData)
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    const status = callsStatus as CallsStatusResult | undefined;
    if (status?.receipts?.[0]?.transactionHash && !txHash) {
      const hash = status.receipts[0].transactionHash;
      setTxHash(hash);
      consumeToken(hash);
    }
  }, [callsStatus, txHash]);

  useEffect(() => {
    if (sendFailed && sendError) setError(sendError.message);
  }, [sendFailed, sendError]);

  async function consumeToken(hash: string) {
    if (!token || consuming) return;
    setConsuming(true);
    try {
      await fetch(`/api/surfaces/sign-intent/${token}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hash }),
      });
    } catch {
      // Token consumption failure is non-critical
    }
  }

  function handleSign() {
    if (!tokenData?.intentPayload) return;
    const card = cardFromPayload(tokenData.intentPayload);
    const batch = card?.batch;
    if (!isSendCallsEnvelope(batch)) {
      setError(
        'This signing link does not contain executable transaction calls. Please regenerate it from Sherpa.',
      );
      return;
    }
    sendSponsoredCalls(toSendCallsVariables(batch));
  }

  if (error) {
    return (
      <div className="max-w-md w-full bg-slate-900 rounded-xl p-6 text-center">
        <div className="text-red-400 text-lg font-medium mb-2">Error</div>
        <div className="text-slate-300">{error}</div>
      </div>
    );
  }

  if (!tokenData) {
    return <div className="text-slate-400">Loading token...</div>;
  }

  if (txHash) {
    return (
      <div className="max-w-md w-full bg-slate-900 rounded-xl p-6 text-center">
        <div className="text-green-400 text-lg font-medium mb-2">Transaction Sent</div>
        <a
          href={`https://sepolia.basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline break-all"
        >
          {txHash}
        </a>
        <div className="mt-4">
          <a
            href="tg://"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Telegram
          </a>
        </div>
      </div>
    );
  }

  const payload = isRecord(tokenData.intentPayload) ? tokenData.intentPayload : {};
  const card = cardFromPayload(tokenData.intentPayload);

  return (
    <div className="max-w-md w-full bg-slate-900 rounded-xl p-6">
      <h1 className="text-lg font-medium text-white mb-4">Sign Transaction</h1>
      {card ? (
        <div className="mb-4">
          <ConfirmationCard card={card} disabled />
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="text-sm text-slate-400 mb-1">Intent</div>
          <div className="text-white font-medium">{String(payload.intent ?? 'Unknown')}</div>
        </div>
      )}
      {isRecord(payload.params) ? (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="text-sm text-slate-400 mb-2">Parameters</div>
          {Object.entries(payload.params).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm py-1">
              <span className="text-slate-400">{key}</span>
              <span className="text-white">{String(value)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="text-red-400 text-sm mb-4">{error}</div> : null}
      <div className="text-xs text-slate-500 mb-4">
        Surface: {tokenData.surface} · Expires: {new Date(tokenData.expiresAt).toLocaleTimeString()}
      </div>
      {!isConnected ? (
        <ConnectButton variant="hero" className="w-full rounded-lg" />
      ) : (
        <button
          onClick={handleSign}
          disabled={isPending}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Signing...' : 'Confirm & Sign'}
        </button>
      )}
    </div>
  );
}
