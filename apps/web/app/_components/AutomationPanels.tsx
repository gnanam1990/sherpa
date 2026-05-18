'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { GovernanceActionsPanel } from './AdvancedPanels';

type AlertRule = {
  id: string;
  conditionType: string;
  asset?: { symbol?: string } | null;
  comparison: string;
  threshold: number;
  status: string;
  triggerCount: number;
  createdAt: string;
};

type FarcasterNotificationStatus = {
  active: boolean;
  fid: string;
  client?: string;
  urlHost?: string;
};

type AlertNotificationChannel = 'push' | 'web-push' | 'email' | 'telegram' | 'farcaster';

type PushSubscriptionJson = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

type DCASchedule = {
  id: string;
  fromAsset: { symbol?: string };
  toAsset: { symbol?: string };
  amountPerTick: string;
  frequency: string;
  status: string;
  nextExecutionAt?: string;
};

type AutoRepayRule = {
  id: string;
  triggerHF: number;
  targetHF: number;
  maxRepayPerExecution: string;
  status: string;
  maxPerDay: number;
};

type ChainStatus = 'mainnet' | 'testnet' | 'read-only' | 'experimental';

type ChainInfo = {
  chainId: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  dex?: { name: string; routerAddress: string };
  aave?: { poolAddress: string };
  bridgeProtocols: string[];
  status?: ChainStatus;
  note?: string;
};

type GovernanceProposal = {
  id: string;
  title?: string;
  state?: string;
  status?: string;
  source?: string;
  link?: string;
};

const cardClass = 'base-card-soft p-4';
const fieldClass =
  'base-input w-full text-sm';
const buttonClass =
  'base-btn text-sm disabled:cursor-not-allowed disabled:opacity-50';
const ghostButtonClass =
  'base-btn-ghost text-sm';

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: (T & { error?: string; details?: string }) | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as T & { error?: string; details?: string };
    } catch {
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      throw new Error('Response was not valid JSON');
    }
  }
  if (!res.ok) throw new Error(body?.error ?? body?.details ?? `Request failed: ${res.status}`);
  if (!body) throw new Error('Response was empty');
  return body;
}

function useWalletAddress() {
  const { address, isConnected } = useAccount();
  return { address, isConnected };
}

function SetupShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="meta-label text-base-blue">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function WalletRequired() {
  return (
    <div className={cardClass}>
      <h2 className="font-medium">Connect wallet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your wallet on the homepage, then return here to create user-scoped rules.
      </p>
    </div>
  );
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function AlertsPanel() {
  const { address, isConnected } = useWalletAddress();
  const [asset, setAsset] = useState('ETH');
  const [comparison, setComparison] = useState('>');
  const [threshold, setThreshold] = useState('5000');
  const [conditionType, setConditionType] = useState('price');
  const [notificationChannel, setNotificationChannel] = useState<AlertNotificationChannel>('push');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [pushSubscription, setPushSubscription] = useState<PushSubscriptionJson | null>(null);
  const [pushStatus, setPushStatus] = useState('Browser push is not enabled.');
  const [farcasterFid, setFarcasterFid] = useState('');
  const [farcasterStatus, setFarcasterStatus] = useState<
    'idle' | 'checking' | 'active' | 'missing' | 'error'
  >('idle');
  const [farcasterStatusText, setFarcasterStatusText] = useState('');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [status, setStatus] = useState<string>('Ready');
  const canUse = Boolean(isConnected && address);
  const farcasterFidIsValid = /^\d+$/.test(farcasterFid.trim());
  const canCreate =
    canUse &&
    (notificationChannel !== 'telegram' || telegramChatId.trim().length > 0) &&
    (notificationChannel !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress.trim())) &&
    (notificationChannel !== 'web-push' || Boolean(pushSubscription)) &&
    (notificationChannel !== 'farcaster' || farcasterStatus === 'active');

  const loadRules = useCallback(async () => {
    if (!address) return;
    const data = await readJson<{ alerts: AlertRule[] }>(await fetch(`/api/alerts/${address}`));
    setRules(data.alerts);
  }, [address]);

  useEffect(() => {
    void loadRules().catch((err) => setStatus(err instanceof Error ? err.message : String(err)));
  }, [loadRules]);

  useEffect(() => {
    if (notificationChannel !== 'farcaster') {
      setFarcasterStatus('idle');
      setFarcasterStatusText('');
      return;
    }
    if (!farcasterFid.trim()) {
      setFarcasterStatus('idle');
      setFarcasterStatusText('Enter your Farcaster FID to check Mini App notification readiness.');
      return;
    }
    if (!farcasterFidIsValid) {
      setFarcasterStatus('error');
      setFarcasterStatusText('FID must be numeric.');
      return;
    }

    const controller = new AbortController();
    setFarcasterStatus('checking');
    setFarcasterStatusText('Checking Mini App notification token...');
    fetch(`/api/farcaster/notifications/${farcasterFid.trim()}/status`, {
      signal: controller.signal,
    })
      .then((res) => readJson<FarcasterNotificationStatus>(res))
      .then((data) => {
        if (data.active) {
          setFarcasterStatus('active');
          setFarcasterStatusText(
            `Notifications active${data.client ? ` via ${data.client}` : ''}${data.urlHost ? ` (${data.urlHost})` : ''}.`,
          );
        } else {
          setFarcasterStatus('missing');
          setFarcasterStatusText(
            'No active token yet. Open the Sherpa Mini App in Farcaster and enable notifications first.',
          );
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFarcasterStatus('error');
        setFarcasterStatusText(err instanceof Error ? err.message : String(err));
      });

    return () => controller.abort();
  }, [farcasterFid, farcasterFidIsValid, notificationChannel]);

  async function enableBrowserPush() {
    setPushStatus('Preparing browser push...');
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setPushStatus('Browser push needs NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY.');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('This browser does not support Web Push.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setPushStatus('Notification permission was not granted.');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(publicKey),
        userVisibleOnly: true,
      }));
    const json = subscription.toJSON() as PushSubscriptionJson;
    if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
      setPushStatus('Browser returned an incomplete push subscription.');
      return;
    }
    setPushSubscription(json);
    setPushStatus('Browser push ready.');
  }

  async function createRule(event: FormEvent) {
    event.preventDefault();
    if (!address) return;
    setStatus('Saving alert...');
    try {
      await readJson<AlertRule>(
        await fetch('/api/alerts', {
          body: JSON.stringify({
            userAddress: address,
            conditionType,
            asset: asset.toUpperCase(),
            comparison,
            threshold: Number(threshold),
            notificationChannels: [notificationChannel],
            params: {
              ...(notificationChannel === 'telegram'
                ? { telegramChatId: telegramChatId.trim() }
                : {}),
              ...(notificationChannel === 'email'
                ? { email: emailAddress.trim() }
                : {}),
              ...(notificationChannel === 'web-push' && pushSubscription
                ? { pushSubscription }
                : {}),
              ...(notificationChannel === 'farcaster'
                ? { farcasterFid: Number(farcasterFid.trim()) }
                : {}),
            },
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      await loadRules();
      setStatus('Alert saved. The Railway worker will evaluate it from Postgres.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SetupShell
      description="Create process-backed alert rules for price, balance, and health-factor conditions. Rules are real API records; notification delivery depends on configured channels."
      eyebrow="Beta live"
      title="Alerts"
    >
      {!canUse ? <WalletRequired /> : null}
      <form className={cardClass} onSubmit={createRule}>
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            className={fieldClass}
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
          >
            <option value="price">Price</option>
            <option value="balance">Balance</option>
            <option value="health-factor">Health factor</option>
          </select>
          <input className={fieldClass} value={asset} onChange={(e) => setAsset(e.target.value)} />
          <select
            className={fieldClass}
            value={comparison}
            onChange={(e) => setComparison(e.target.value)}
          >
            <option value=">">{'>'}</option>
            <option value="<">{'<'}</option>
            <option value=">=">{'>='}</option>
            <option value="<=">{'<='}</option>
          </select>
          <input
            className={fieldClass}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
          <select
            className={fieldClass}
            value={notificationChannel}
            onChange={(e) =>
              setNotificationChannel(e.target.value as AlertNotificationChannel)
            }
          >
            <option value="push">In-app</option>
            <option value="web-push">Browser push</option>
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
            <option value="farcaster">Farcaster</option>
          </select>
          {notificationChannel === 'web-push' ? (
            <div className="space-y-1">
              <button
                className="rounded border border-border px-3 py-2 text-sm text-foreground hover:border-base-blue"
                onClick={() => void enableBrowserPush()}
                type="button"
              >
                Enable browser push
              </button>
              <p
                className={
                  pushSubscription ? 'text-xs text-green-400' : 'text-xs text-muted-foreground'
                }
              >
                {pushStatus}
              </p>
            </div>
          ) : null}
          {notificationChannel === 'email' ? (
            <input
              className={fieldClass}
              inputMode="email"
              placeholder="Email address"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
          ) : null}
          {notificationChannel === 'telegram' ? (
            <input
              className={fieldClass}
              inputMode="numeric"
              placeholder="Telegram chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
          ) : null}
          {notificationChannel === 'farcaster' ? (
            <div className="space-y-1">
              <input
                className={fieldClass}
                inputMode="numeric"
                placeholder="Farcaster FID"
                value={farcasterFid}
                onChange={(e) => setFarcasterFid(e.target.value)}
              />
              <p
                className={
                  farcasterStatus === 'active'
                    ? 'text-xs text-green-400'
                    : 'text-xs text-muted-foreground'
                }
              >
                {farcasterStatusText}
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{status}</p>
          <button className={buttonClass} disabled={!canCreate} type="submit">
            Create alert
          </button>
        </div>
      </form>
      <RuleList
        empty="No alerts yet."
        items={rules.map((rule) => ({
          id: rule.id,
          title: `${rule.conditionType} ${rule.asset?.symbol ?? ''} ${rule.comparison} ${rule.threshold}`,
          meta: `${rule.status} · triggered ${rule.triggerCount} times`,
        }))}
        onRefresh={loadRules}
      />
    </SetupShell>
  );
}

export function DCAPanel() {
  const { address, isConnected } = useWalletAddress();
  const [amount, setAmount] = useState('10');
  const [toAsset, setToAsset] = useState('ETH');
  const [frequency, setFrequency] = useState('weekly');
  const [schedules, setSchedules] = useState<DCASchedule[]>([]);
  const [status, setStatus] = useState<string>('Ready');
  const canUse = Boolean(isConnected && address);

  const loadSchedules = useCallback(async () => {
    if (!address) return;
    const data = await readJson<{ schedules: DCASchedule[] }>(await fetch(`/api/dca/${address}`));
    setSchedules(data.schedules);
  }, [address]);

  useEffect(() => {
    void loadSchedules().catch((err) =>
      setStatus(err instanceof Error ? err.message : String(err)),
    );
  }, [loadSchedules]);

  async function createSchedule(event: FormEvent) {
    event.preventDefault();
    if (!address) return;
    setStatus('Saving DCA schedule...');
    try {
      await readJson<DCASchedule>(
        await fetch('/api/dca', {
          body: JSON.stringify({
            userAddress: address,
            fromAsset: 'USDC',
            toAsset: toAsset.toUpperCase(),
            amountPerTick: amount,
            frequency,
            hourOfDay: 12,
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      await loadSchedules();
      setStatus('DCA schedule saved. Swap calldata is built via SherpaRouter; execution requires session-key signing to be configured for your wallet.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SetupShell
      description="Create and manage recurring buy schedules. The scheduler API and worker are built for durable storage; unattended swaps stay gated until session-key signing is configured."
      eyebrow="Beta live"
      title="DCA scheduler"
    >
      {!canUse ? <WalletRequired /> : null}
      <form className={cardClass} onSubmit={createSchedule}>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={fieldClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            className={fieldClass}
            value={toAsset}
            onChange={(e) => setToAsset(e.target.value)}
          />
          <select
            className={fieldClass}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{status}</p>
          <button className={buttonClass} disabled={!canUse} type="submit">
            Create schedule
          </button>
        </div>
      </form>
      <RuleList
        empty="No DCA schedules yet."
        items={schedules.map((schedule) => ({
          id: schedule.id,
          title: `${schedule.amountPerTick} USDC to ${schedule.toAsset.symbol ?? 'asset'} ${schedule.frequency}`,
          meta: `${schedule.status} · next ${schedule.nextExecutionAt ? new Date(schedule.nextExecutionAt).toLocaleString() : 'pending'}`,
        }))}
        onRefresh={loadSchedules}
      />
    </SetupShell>
  );
}

export function AutoRepayPanel() {
  const { address, isConnected } = useWalletAddress();
  const [triggerHF, setTriggerHF] = useState('1.3');
  const [targetHF, setTargetHF] = useState('1.6');
  const [maxRepay, setMaxRepay] = useState('100');
  const [rules, setRules] = useState<AutoRepayRule[]>([]);
  const [status, setStatus] = useState<string>('Ready');
  const canUse = Boolean(isConnected && address);

  const loadRules = useCallback(async () => {
    if (!address) return;
    const data = await readJson<{ rules: AutoRepayRule[] }>(
      await fetch(`/api/auto-repay/${address}`),
    );
    setRules(data.rules);
  }, [address]);

  useEffect(() => {
    void loadRules().catch((err) => setStatus(err instanceof Error ? err.message : String(err)));
  }, [loadRules]);

  async function createRule(event: FormEvent) {
    event.preventDefault();
    if (!address) return;
    setStatus('Saving auto-repay rule...');
    try {
      await readJson<AutoRepayRule>(
        await fetch('/api/auto-repay', {
          body: JSON.stringify({
            userAddress: address,
            triggerHF: Number(triggerHF),
            targetHF: Number(targetHF),
            maxRepayPerExecution: maxRepay,
            repaySource: ['usdc'],
            maxPerDay: 3,
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      await loadRules();
      setStatus('Rule saved. Repay calldata is built via SherpaRouter; execution requires session-key signing to be configured for your wallet.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SetupShell
      description="Configure liquidation-protection rules with explicit health-factor targets and daily caps. This is a real rule manager; autonomous repayment execution stays gated until signer setup is configured."
      eyebrow="Beta live"
      title="Auto-repay"
    >
      {!canUse ? <WalletRequired /> : null}
      <form className={cardClass} onSubmit={createRule}>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={fieldClass}
            value={triggerHF}
            onChange={(e) => setTriggerHF(e.target.value)}
          />
          <input
            className={fieldClass}
            value={targetHF}
            onChange={(e) => setTargetHF(e.target.value)}
          />
          <input
            className={fieldClass}
            value={maxRepay}
            onChange={(e) => setMaxRepay(e.target.value)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{status}</p>
          <button className={buttonClass} disabled={!canUse} type="submit">
            Create rule
          </button>
        </div>
      </form>
      <RuleList
        empty="No auto-repay rules yet."
        items={rules.map((rule) => ({
          id: rule.id,
          title: `HF ${rule.triggerHF} -> ${rule.targetHF}`,
          meta: `${rule.status} · max ${rule.maxRepayPerExecution} USDC · ${rule.maxPerDay}/day`,
        }))}
        onRefresh={loadRules}
      />
    </SetupShell>
  );
}

function RuleList({
  empty,
  items,
  onRefresh,
}: {
  empty: string;
  items: Array<{ id: string; title: string; meta: string }>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Saved records</h2>
        <button className={ghostButtonClass} onClick={() => void onRefresh()} type="button">
          Refresh
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              className="rounded-md border border-border bg-background p-3"
              key={item.id}
            >
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">{item.id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MultiChainPanel() {
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [status, setStatus] = useState('Loading chains...');

  useEffect(() => {
    void fetch('/api/chains')
      .then((res) => readJson<{ chains: ChainInfo[] }>(res))
      .then(
        (data) => {
          setChains(data.chains);
          setStatus('Read-only chain registry loaded.');
        },
        (err) => setStatus(err instanceof Error ? err.message : String(err)),
      );
  }, []);

  return (
    <SetupShell
      description="Sherpa can inspect supported chain metadata now. Bridge and cross-chain execution are deliberately disabled until adapters are fully audited."
      eyebrow="Read-only live"
      title="Multi-chain"
    >
      <div className={cardClass}>
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {chains.map((chain) => (
          <div className={cardClass} key={chain.chainId}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{chain.name}</h2>
              <div className="flex items-center gap-2">
                {chain.status === 'testnet' && (
                  <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">Testnet</span>
                )}
                {chain.status === 'experimental' && (
                  <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-500">Experimental</span>
                )}
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {chain.chainId}
                </span>
              </div>
            </div>
            {chain.note && (
              <p className="mt-2 text-xs text-yellow-400">{chain.note}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              DEX: {chain.dex?.name ?? 'not configured'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aave pool: {chain.aave?.poolAddress ?? 'none'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bridges: {chain.bridgeProtocols.length > 0 ? chain.bridgeProtocols.join(', ') : 'none'}
            </p>
            <a
              className="mt-3 inline-block text-sm text-base-blue hover:underline"
              href={chain.explorerUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Explorer
            </a>
          </div>
        ))}
      </div>
    </SetupShell>
  );
}

export function GovernancePanel() {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [status, setStatus] = useState('Loading proposals...');

  useEffect(() => {
    void fetch('/api/governance/proposals?source=snapshot')
      .then((res) =>
        readJson<{
          proposals: GovernanceProposal[];
          errors?: Array<{ source: string; error: string }>;
        }>(res),
      )
      .then(
        (data) => {
          setProposals(data.proposals.slice(0, 12));
          setStatus(
            data.errors && data.errors.length > 0
              ? `Loaded with ${data.errors.length} upstream warning(s).`
              : 'Snapshot proposal feed loaded.',
          );
        },
        (err) => setStatus(err instanceof Error ? err.message : String(err)),
      );
  }, []);

  return (
    <SetupShell
      description="Browse governance proposals and build delegation transactions for explicit wallet signing. Sherpa never auto-broadcasts governance writes."
      eyebrow="Builder live"
      title="Governance"
    >
      <div className={cardClass}>
        <p className="text-sm text-muted-foreground">{status}</p>
      </div>
      <GovernanceActionsPanel />
      <div className="space-y-3">
        {proposals.length === 0 ? (
          <div className={cardClass}>
            <p className="text-sm text-muted-foreground">
              No proposals loaded from the selected source.
            </p>
          </div>
        ) : (
          proposals.map((proposal) => (
            <div className={cardClass} key={`${proposal.source}-${proposal.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-medium">{proposal.title ?? proposal.id}</h2>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {proposal.source ?? 'governance'} ·{' '}
                  {proposal.state ?? proposal.status ?? 'unknown'}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{proposal.id}</p>
              {proposal.link ? (
                <a
                  className="mt-3 inline-block text-sm text-base-blue hover:underline"
                  href={proposal.link}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open proposal
                </a>
              ) : null}
            </div>
          ))
        )}
      </div>
    </SetupShell>
  );
}

export function TelegramPanel() {
  return (
    <SetupShell
      description="The Telegram bot is live on Railway and connected to the production Sherpa API. It parses chat commands and routes signing through the web confirmation flow."
      eyebrow="Live on Railway"
      title="Telegram bot"
    >
      <div className={cardClass}>
        <h2 className="font-medium">Bot is online</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Open <span className="font-mono text-foreground">@sherpaonbasebot</span> in Telegram to use
          Sherpa from chat. Transaction signing still happens through the web app, so wallet
          approval stays explicit.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The bot service runs from{' '}
          <span className="font-mono text-foreground">apps/telegram-bot</span> and points at
          <span className="font-mono text-foreground">
            {' '}
            https://sherpaapi-production.up.railway.app
          </span>
          . Keep bot token rotation and Railway monitoring on the operations checklist.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            className={ghostButtonClass}
            href="https://t.me/sherpaonbasebot"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Telegram bot
          </a>
          <a
            className={ghostButtonClass}
            href="https://sherpa-miniapp.vercel.app"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open Mini App
          </a>
          <a
            className={ghostButtonClass}
            href="https://farcaster.xyz/sherpaonbase"
            rel="noopener noreferrer"
            target="_blank"
          >
            Farcaster profile
          </a>
        </div>
      </div>
    </SetupShell>
  );
}
