'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAccount } from 'wagmi';

type Strategy = {
  id: string;
  name: string;
  description?: string;
  followers?: number;
  visibility?: string;
  tags?: string[];
  executionEnabled?: boolean;
  source?: string;
};

type SessionKey = {
  id: string;
  sessionKeyAddress: string;
  chainId: number;
  spendLimit: string;
  spentAmount: string;
  validUntil: string;
  status: string;
  executionCount: number;
};

type DelegationTx = {
  success: boolean;
  to: string;
  data: string;
  value: string;
  protocol: string;
  delegator: string;
  delegatee: string;
};

const cardClass = 'rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-4';
const fieldClass =
  'w-full rounded-md border border-sherpa-surface2 bg-sherpa-bg px-3 py-2 text-sm text-sherpa-fg outline-none transition focus:border-sherpa-blue';
const buttonClass =
  'rounded-md bg-sherpa-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50';
const ghostButtonClass =
  'rounded-md border border-sherpa-surface2 px-3 py-2 text-sm text-sherpa-muted transition hover:border-sherpa-muted hover:text-sherpa-fg disabled:cursor-not-allowed disabled:opacity-50';

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string; details?: string };
  if (!res.ok) throw new Error(body.error ?? body.details ?? `Request failed: ${res.status}`);
  return body;
}

function PanelShell({
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
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-sherpa-blue">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sherpa-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

function WalletHint() {
  return (
    <div className={cardClass}>
      <h2 className="font-medium">Connect wallet</h2>
      <p className="mt-1 text-sm text-sherpa-muted">
        Connect a wallet on the homepage to create user-scoped records.
      </p>
    </div>
  );
}

export function StrategyMarketplacePanel() {
  const { address, isConnected } = useAccount();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [status, setStatus] = useState('Loading strategies...');
  const canUse = Boolean(isConnected && address);

  const loadStrategies = useCallback(async () => {
    const data = await readJson<{ strategies: Strategy[] }>(await fetch('/api/strategies'));
    setStrategies(data.strategies);
    setStatus(`Loaded ${data.strategies.length} strategy templates.`);
  }, []);

  useEffect(() => {
    void loadStrategies().catch((err) => setStatus(err instanceof Error ? err.message : String(err)));
  }, [loadStrategies]);

  async function followStrategy(id: string) {
    if (!address) return;
    setStatus(`Following ${id}...`);
    try {
      await readJson(
        await fetch(`/api/strategies/${id}/follow`, {
          body: JSON.stringify({ userAddress: address }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      await loadStrategies();
      setStatus('Strategy followed. Execution remains explicit and disabled until a real executor is configured.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <PanelShell
      description="Browse reusable Sherpa strategy templates and follow them for tracking. Strategy execution is deliberately disabled until it emits reviewed transaction plans."
      eyebrow="Marketplace beta"
      title="Strategy marketplace"
    >
      {!canUse ? <WalletHint /> : null}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-sherpa-muted">{status}</p>
          <button className={ghostButtonClass} onClick={() => void loadStrategies()} type="button">
            Refresh
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {strategies.map((strategy) => (
          <div className={cardClass} key={strategy.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">{strategy.name}</h2>
              <span className="rounded-full border border-sherpa-surface2 px-2 py-0.5 text-xs text-sherpa-muted">
                {strategy.source ?? strategy.visibility ?? 'local'}
              </span>
            </div>
            <p className="mt-2 min-h-10 text-sm leading-5 text-sherpa-muted">
              {strategy.description ?? 'No description provided.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-sherpa-muted">
              <span>{strategy.followers ?? 0} followers</span>
              <span>{strategy.executionEnabled ? 'Execution enabled' : 'Execution disabled'}</span>
            </div>
            {strategy.tags && strategy.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {strategy.tags.slice(0, 4).map((tag) => (
                  <span className="rounded-full bg-sherpa-bg px-2 py-0.5 text-xs text-sherpa-muted" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              className={`${buttonClass} mt-4 w-full`}
              disabled={!canUse}
              onClick={() => void followStrategy(strategy.id)}
              type="button"
            >
              Follow strategy
            </button>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

export function SessionKeyPanel() {
  const { address, isConnected } = useAccount();
  const [sessionKeyAddress, setSessionKeyAddress] = useState('');
  const [target, setTarget] = useState('0x00bfef87DD352D48F8572BcfA52E57870B35DE8b');
  const [selector, setSelector] = useState('');
  const [spendLimit, setSpendLimit] = useState('100000000');
  const [maxValue, setMaxValue] = useState('100000000');
  const [validDuration, setValidDuration] = useState('86400');
  const [keys, setKeys] = useState<SessionKey[]>([]);
  const [status, setStatus] = useState('Ready');
  const canUse = Boolean(isConnected && address);
  const canCreate =
    canUse &&
    /^0x[a-fA-F0-9]{40}$/.test(sessionKeyAddress) &&
    /^0x[a-fA-F0-9]{40}$/.test(target) &&
    /^0x[a-fA-F0-9]{8}$/.test(selector) &&
    /^\d+$/.test(spendLimit) &&
    /^\d+$/.test(maxValue);

  const loadKeys = useCallback(async () => {
    if (!address) return;
    const data = await readJson<{ sessionKeys: SessionKey[] }>(
      await fetch(`/api/session-keys/${address}`),
    );
    setKeys(data.sessionKeys);
  }, [address]);

  useEffect(() => {
    void loadKeys().catch((err) => setStatus(err instanceof Error ? err.message : String(err)));
  }, [loadKeys]);

  async function createKey(event: FormEvent) {
    event.preventDefault();
    if (!address) return;
    setStatus('Saving session-key policy...');
    try {
      await readJson<SessionKey>(
        await fetch('/api/session-keys', {
          body: JSON.stringify({
            ownerAddress: address,
            sessionKeyAddress,
            chainId: 8453,
            spendLimit,
            validDuration: Number(validDuration),
            permissions: [{ target, selector, maxValue }],
            limits: {
              dailyTotal: spendLimit,
              perTxValue: maxValue,
              totalLimit: spendLimit,
            },
            maxExecutions: 100,
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      await loadKeys();
      setStatus('Session-key policy saved. Sherpa did not generate or custody a private key.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function revokeKey(id: string) {
    setStatus(`Revoking ${id}...`);
    try {
      await readJson(await fetch(`/api/session-keys/${id}`, { method: 'DELETE' }));
      await loadKeys();
      setStatus('Session-key policy revoked.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <PanelShell
      description="Configure scoped session-key policies for future unattended execution. Sherpa records permissions and limits only; key generation and signing remain outside this UI."
      eyebrow="Stage 5 guarded"
      title="Session keys"
    >
      {!canUse ? <WalletHint /> : null}
      <form className={cardClass} onSubmit={createKey}>
        <div className="grid gap-3">
          <input
            className={fieldClass}
            placeholder="Session key address"
            value={sessionKeyAddress}
            onChange={(event) => setSessionKeyAddress(event.target.value)}
          />
          <input
            className={fieldClass}
            placeholder="Allowed target contract"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className={fieldClass}
              placeholder="Function selector"
              value={selector}
              onChange={(event) => setSelector(event.target.value)}
            />
            <input
              className={fieldClass}
              placeholder="Total spend limit"
              value={spendLimit}
              onChange={(event) => setSpendLimit(event.target.value)}
            />
            <input
              className={fieldClass}
              placeholder="Max value per tx"
              value={maxValue}
              onChange={(event) => setMaxValue(event.target.value)}
            />
          </div>
          <input
            className={fieldClass}
            placeholder="Valid duration seconds"
            value={validDuration}
            onChange={(event) => setValidDuration(event.target.value)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-sherpa-muted">{status}</p>
          <button className={buttonClass} disabled={!canCreate} type="submit">
            Save policy
          </button>
        </div>
      </form>
      <div className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-medium">Saved policies</h2>
          <button className={ghostButtonClass} onClick={() => void loadKeys()} type="button">
            Refresh
          </button>
        </div>
        {keys.length === 0 ? (
          <p className="text-sm text-sherpa-muted">No session-key policies yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div className="rounded-md border border-sherpa-surface2 bg-sherpa-bg p-3" key={key.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-sherpa-muted">{key.sessionKeyAddress}</span>
                  <span className="rounded-full border border-sherpa-surface2 px-2 py-0.5 text-xs text-sherpa-muted">
                    {key.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-sherpa-muted">
                  Spend {key.spentAmount} / {key.spendLimit} · expires{' '}
                  {new Date(key.validUntil).toLocaleString()}
                </p>
                <button
                  className={`${ghostButtonClass} mt-3`}
                  onClick={() => void revokeKey(key.id)}
                  type="button"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

export function GovernanceActionsPanel() {
  const { address, isConnected } = useAccount();
  const [delegatee, setDelegatee] = useState('');
  const [protocol, setProtocol] = useState<'aave' | 'compound' | 'optimism'>('aave');
  const [tx, setTx] = useState<DelegationTx | null>(null);
  const [status, setStatus] = useState('Ready');
  const canBuild = Boolean(isConnected && address && /^0x[a-fA-F0-9]{40}$/.test(delegatee));

  async function buildDelegation(event: FormEvent) {
    event.preventDefault();
    if (!address) return;
    setStatus('Building delegation transaction...');
    setTx(null);
    try {
      const result = await readJson<DelegationTx>(
        await fetch('/api/governance/delegate', {
          body: JSON.stringify({
            delegateeAddress: delegatee,
            delegatorAddress: address,
            protocol,
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        }),
      );
      setTx(result);
      setStatus('Delegation transaction built. Review in your wallet before signing.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className={cardClass}>
      <h2 className="font-medium">Governance transaction builder</h2>
      <p className="mt-1 text-sm text-sherpa-muted">
        Build delegation calldata for explicit wallet signing. Sherpa does not broadcast this for you.
      </p>
      <form className="mt-3 grid gap-3" onSubmit={buildDelegation}>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <input
            className={fieldClass}
            placeholder="Delegatee address"
            value={delegatee}
            onChange={(event) => setDelegatee(event.target.value)}
          />
          <select
            className={fieldClass}
            value={protocol}
            onChange={(event) => setProtocol(event.target.value as typeof protocol)}
          >
            <option value="aave">Aave</option>
            <option value="compound">Compound</option>
            <option value="optimism">Optimism</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-sherpa-muted">{status}</p>
          <button className={buttonClass} disabled={!canBuild} type="submit">
            Build transaction
          </button>
        </div>
      </form>
      {tx ? (
        <div className="mt-4 rounded-md border border-sherpa-surface2 bg-sherpa-bg p-3">
          <p className="text-xs text-sherpa-muted">To</p>
          <p className="break-all font-mono text-xs">{tx.to}</p>
          <p className="mt-3 text-xs text-sherpa-muted">Data</p>
          <p className="max-h-24 overflow-auto break-all font-mono text-xs">{tx.data}</p>
        </div>
      ) : null}
    </div>
  );
}
