'use client';
import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import {
  GlassActionCard,
  GlassDeviceFrame,
  GlassPill,
  GlassSurface,
  SherpaGlassMark,
} from '@sherpa/ui';
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

const QUICK_LINKS = [
  { href: 'https://sherpa-web.vercel.app/positions', label: 'Positions', meta: 'Aave health' },
  { href: 'https://sherpa-web.vercel.app/swap', label: 'Swap', meta: 'Base mainnet' },
  { href: 'https://sherpa-web.vercel.app/lend', label: 'Lend', meta: 'Aave V3' },
  { href: 'https://sherpa-web.vercel.app/alerts', label: 'Alerts', meta: 'Beta' },
];

function stringSlot(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAssistantText(data: ParseResponse): string {
  if (data.error || data.message)
    return data.error ?? data.message ?? 'Sherpa could not parse that.';

  const intent = data.parsed?.intent ?? data.card?.primary_action_label ?? 'UNKNOWN';
  const card = data.card;
  const slots = data.parsed?.slots ?? {};

  if (intent === 'IDENTITY_LOOKUP' && card) {
    const query =
      stringSlot(card.recipient_metadata?.query) ?? stringSlot(slots.query) ?? 'identity';
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
          setNotificationText(
            active ? 'Farcaster alerts ready' : 'Enable alerts for this Mini App',
          );
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
      setNotificationText(
        result.reason === 'rejected-by-user' ? 'Prompt rejected' : 'Could not add Mini App',
      );
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
    <GlassDeviceFrame>
      <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-3">
        <header className="flex items-center justify-between gap-3 rounded-[22px] border border-white/12 bg-white/[0.07] px-3 py-2.5 backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <SherpaGlassMark className="h-10 w-10 shrink-0 rounded-xl" />
            <div>
              <div className="text-base font-bold leading-tight text-white">Sherpa</div>
              <div className="font-mono text-[11px] text-white/55">Base Mini App</div>
            </div>
          </div>
          <GlassPill className="shrink-0 normal-case tracking-normal">mainnet</GlassPill>
        </header>

        <GlassSurface className="p-4">
          <GlassPill>Mini App surface</GlassPill>
          <h1 className="mt-4 max-w-[14rem] text-4xl font-black leading-[0.98] tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,225,255,0.28)]">
            Type once. Act on Base.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Chat with Sherpa from Farcaster or Base App. Every state-changing action still goes
            through explicit wallet confirmation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {address ? (
              <GlassPill className="normal-case tracking-normal">{shortAddress(address)}</GlassPill>
            ) : null}
            <GlassPill className="normal-case tracking-normal">Farcaster ready</GlassPill>
          </div>
        </GlassSurface>

        <section className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map((item) => (
            <GlassActionCard href={item.href} key={item.href} label={item.label} meta={item.meta} />
          ))}
        </section>

        {fcUser && (
          <GlassSurface className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-[#A6F2FF]">
                  FID: {fcUser.fid} · @{fcUser.username ?? 'unknown'}
                </div>
                <div
                  className={
                    notificationStatus === 'ready'
                      ? 'mt-1 text-[11px] text-emerald-300'
                      : 'mt-1 text-[11px] text-white/58'
                  }
                >
                  {notificationText}
                </div>
              </div>
              {notificationStatus !== 'ready' ? (
                <button
                  className="rounded-xl border border-[#00E1FF]/35 bg-[#00E1FF]/10 px-3 py-2 text-[11px] font-semibold text-[#A6F2FF] disabled:opacity-50"
                  disabled={notificationStatus === 'checking' || notificationStatus === 'saving'}
                  onClick={enableFarcasterAlerts}
                  type="button"
                >
                  {notificationStatus === 'saving' ? 'Saving...' : 'Enable alerts'}
                </button>
              ) : null}
            </div>
          </GlassSurface>
        )}

        <GlassSurface className="flex min-h-[17rem] flex-1 flex-col p-3">
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <SherpaGlassMark className="h-12 w-12 rounded-2xl opacity-90" />
                <div className="mt-3 text-sm font-semibold text-white">Ask Sherpa anything</div>
                <p className="mt-1 max-w-52 text-xs leading-5 text-white/50">
                  Try sending USDC, checking positions, or setting an alert.
                </p>
              </div>
            ) : null}
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`inline-block max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#0052FF] text-white shadow-[0_10px_28px_rgba(0,82,255,0.25)]'
                      : 'border border-white/10 bg-white/[0.08] text-white/88'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/[0.08] px-3 py-3 text-sm text-white placeholder:text-white/38 outline-none transition focus:border-[#00E1FF]/45 disabled:opacity-50"
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
              placeholder="send 0.01 usdc to vitalik.eth"
              value={input}
            />
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,#CFF6FF_0%,#00E1FF_55%,#4D80FF_100%)] px-4 py-3 text-sm font-bold text-[#06081A] shadow-[0_14px_36px_rgba(0,225,255,0.32)] disabled:opacity-50"
              disabled={busy}
              onClick={onSubmit}
              type="button"
            >
              {busy ? '...' : 'Send'}
            </button>
          </div>
        </GlassSurface>

        <footer className="pb-[env(safe-area-inset-bottom)] text-center font-mono text-[11px] text-white/45">
          Farcaster / Base App / web surfaces share the same Sherpa engine
        </footer>
      </div>
    </GlassDeviceFrame>
  );
}
