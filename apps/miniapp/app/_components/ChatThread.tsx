'use client';
import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import {
  addSherpaMiniApp,
  getFarcasterNotificationStatus,
  getFarcasterUser,
  saveFarcasterNotificationDetails,
  type FarcasterUser,
} from '../../lib/farcaster-connect';

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
};

type ParseResponse = {
  parsed?: {
    intent?: string;
    slots?: Record<string, unknown>;
  };
  card?: {
    primary_action_label?: string;
    primary_amount_display?: string;
    secondary_amount_display?: string;
    recipient_display?: string;
    gas_display?: string;
    recipient_metadata?: Record<string, unknown>;
    warnings?: string[];
  };
  error?: string;
  message?: string;
};

function stringSlot(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function formatAssistantText(data: ParseResponse): string {
  if (data.error || data.message) return data.error ?? data.message ?? 'Sherpa could not parse that.';

  const intent = data.parsed?.intent ?? data.card?.primary_action_label ?? 'UNKNOWN';
  const card = data.card;
  const slots = data.parsed?.slots ?? {};

  if (intent === 'IDENTITY_LOOKUP' && card) {
    const query = stringSlot(card.recipient_metadata?.query) ?? stringSlot(slots.query) ?? 'identity';
    const source = stringSlot(card.recipient_metadata?.source);
    const address = card.recipient_display ?? card.secondary_amount_display;
    return [
      `Resolved ${query}`,
      address ? `Address: ${address}` : undefined,
      source ? `Source: ${source}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (card) {
    const heading = card.primary_action_label ?? intent;
    return [
      card.primary_amount_display ? `${heading}: ${card.primary_amount_display}` : heading,
      card.recipient_display ? `To: ${card.recipient_display}` : undefined,
      card.gas_display ? `Gas: ${card.gas_display}` : undefined,
      ...(card.warnings ?? []).map((warning) => `Warning: ${warning}`),
    ]
      .filter(Boolean)
      .join('\n');
  }

  return `Intent: ${intent}`;
}

export function ChatThread() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { address } = useAccount();
  const [fcUser, setFcUser] = useState<FarcasterUser | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<
    'unknown' | 'checking' | 'ready' | 'missing' | 'saving' | 'error'
  >('unknown');
  const [notificationText, setNotificationText] = useState('Farcaster alerts not checked');

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [setFrameReady, isFrameReady]);

  useEffect(() => {
    getFarcasterUser().then((user) => {
      setFcUser(user);
      if (!user?.fid) {
        setNotificationStatus('missing');
        setNotificationText('Open in Farcaster to enable alerts');
        return;
      }
      setNotificationStatus('checking');
      setNotificationText('Checking alert readiness...');
      getFarcasterNotificationStatus(user.fid)
        .then((active) => {
          setNotificationStatus(active ? 'ready' : 'missing');
          setNotificationText(active ? 'Farcaster alerts ready' : 'Enable alerts for this Mini App');
        })
        .catch(() => {
          setNotificationStatus('error');
          setNotificationText('Alert readiness check failed');
        });
    });
  }, []);

  async function enableFarcasterAlerts() {
    if (!fcUser?.fid || notificationStatus === 'saving') return;
    setNotificationStatus('saving');
    setNotificationText('Opening Farcaster prompt...');
    const result = await addSherpaMiniApp();
    if (!result.added) {
      setNotificationStatus('missing');
      setNotificationText(result.reason === 'rejected-by-user' ? 'Prompt rejected' : 'Could not add Mini App');
      return;
    }
    if (!result.notificationDetails) {
      setNotificationStatus('missing');
      setNotificationText('Mini App added. Enable notifications in Farcaster settings.');
      return;
    }

    try {
      await saveFarcasterNotificationDetails(fcUser.fid, result.notificationDetails);
      setNotificationStatus('ready');
      setNotificationText('Farcaster alerts ready');
    } catch {
      setNotificationStatus('error');
      setNotificationText('Could not save notification token');
    }
  }

  async function onSubmit() {
    if (!input.trim() || busy) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: input, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);
    const apiBase = process.env.NEXT_PUBLIC_SHERPA_API_BASE || '';
    try {
      const res = await fetch(`${apiBase}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userMsg.text, userKey: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? 'API request failed');
      const assistantMsg: Msg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: formatAssistantText(data),
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Sherpa is unreachable. Try again.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
      setInput('');
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <header className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <img src="/sherpa-icon-192.svg" alt="" className="h-8 w-8 rounded-lg" />
          <div>
            <div className="text-sm font-semibold text-white">Sherpa</div>
            <div className="text-[11px] text-slate-400">Base mini app</div>
          </div>
        </div>
        <div className="text-[11px] text-blue-300">sponsored gas</div>
      </header>
      {fcUser && (
        <div className="mb-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-blue-400">
                FID: {fcUser.fid} · @{fcUser.username ?? 'unknown'}
              </div>
              <div
                className={
                  notificationStatus === 'ready'
                    ? 'mt-1 text-[11px] text-emerald-400'
                    : 'mt-1 text-[11px] text-slate-400'
                }
              >
                {notificationText}
              </div>
            </div>
            {notificationStatus !== 'ready' ? (
              <button
                className="rounded-md border border-blue-500/50 px-2 py-1 text-[11px] font-medium text-blue-200 disabled:opacity-50"
                disabled={notificationStatus === 'checking' || notificationStatus === 'saving'}
                onClick={enableFarcasterAlerts}
                type="button"
              >
                {notificationStatus === 'saving' ? 'Saving...' : 'Enable alerts'}
              </button>
            ) : null}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-[90%] whitespace-pre-wrap break-words px-3 py-2 text-left text-sm leading-relaxed rounded ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-100'}`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="send 0.01 usdc to vitalik.eth"
          className="flex-1 px-3 py-2 bg-slate-900 text-white rounded"
          disabled={busy}
        />
        <button
          onClick={onSubmit}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {busy ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
