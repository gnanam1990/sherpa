'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useAccount,
  useAccountEffect,
  useBalance,
  useChainId,
  useDisconnect,
  useEnsName,
} from 'wagmi';
import { ConnectButton, type SerializedConfirmationCardProps } from '@sherpa/ui';
import type { ChatMessage } from '@sherpa/ui';
import { usePromptFlow } from '../../../hooks/usePromptFlow';
import { AppFrame } from './app-frame';
import { TopBar } from './top-bar';
import { ComposerPill } from './composer-pill';
import { HeroConfirmCard } from './hero-confirm-card';
import type { ConfirmRiskIndicator } from './hero-confirm-card';
import { IntentChips, SherpaAvatar, SherpaBubble, UserBubble } from './chat-bubbles';
import { shortHex } from './brand';
import type { ChainTone } from './brand';

/**
 * Glass Aurora home / chat surface.
 *
 * Same data and logic as the legacy home (it renders {@link usePromptFlow}
 * — the exact parser/safety/signing pipeline) with the Glass presentation.
 * Wallet/ENS/balance are real wagmi reads; nothing is mocked or hardcoded.
 * Honest limitations are surfaced (disconnected → disabled composer +
 * Connect button; parse/safety/sign failures render the real messages).
 */

function chainMeta(chainIdHex: string | undefined): {
  label: string;
  tone: ChainTone;
} {
  if (!chainIdHex) return { label: 'Base', tone: 'mainnet' };
  const id = chainIdHex.startsWith('0x') ? Number.parseInt(chainIdHex, 16) : Number(chainIdHex);
  if (id === 84532) return { label: 'Base Sepolia', tone: 'sepolia' };
  return { label: 'Base', tone: 'mainnet' };
}

function explorerTxUrl(txHash: string, chainIdHex: string | undefined): string {
  const id = chainIdHex
    ? chainIdHex.startsWith('0x')
      ? Number.parseInt(chainIdHex, 16)
      : Number(chainIdHex)
    : 8453;
  const base = id === 84532 ? 'https://sepolia.basescan.org' : 'https://basescan.org';
  return `${base}/tx/${txHash}`;
}

function normalizeRisk(card: SerializedConfirmationCardProps): ConfirmRiskIndicator[] {
  const raw = card.risk_indicators ?? [];
  return raw.map((r) =>
    typeof r === 'string'
      ? { level: 'info' as const, label: r }
      : { level: r.level, label: r.label, detail: r.detail },
  );
}

function amountToken(display: string): string | undefined {
  const m = display.match(/([A-Za-z]{2,6})\s*$/);
  return m ? m[1] : undefined;
}

function looksLikeAddress(value: string | undefined): boolean {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

/** Renders one chat message with the Glass presentation. */
function MessageRow({
  message,
  account,
  chainIdHex,
  onConfirm,
  onCancel,
  busy,
}: {
  message: ChatMessage;
  account: { ens: string | null; address?: string };
  chainIdHex: string | undefined;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  busy: boolean;
}) {
  const { content } = message;

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <UserBubble text={content.kind === 'text' ? content.text : ''} />
      </div>
    );
  }

  if (content.kind === 'thinking') {
    return (
      <div className="flex items-start gap-2">
        <SherpaAvatar />
        <div
          className="rounded-2xl rounded-tl-md px-3.5 py-2 text-[12px] glass-thin"
          aria-label="Sherpa is thinking"
        >
          <span className="inline-flex gap-1">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-base-cerulean text-base-cerulean" />
            <span className="opacity-70">Thinking…</span>
          </span>
        </div>
      </div>
    );
  }

  if (content.kind === 'text') {
    return (
      <div className="flex items-start gap-2">
        <SherpaAvatar />
        <SherpaBubble>
          <span className="whitespace-pre-line">{content.text}</span>
        </SherpaBubble>
      </div>
    );
  }

  if (content.kind === 'action') {
    const { summary } = content;
    const toneClass =
      summary.status === 'success'
        ? 'chip-success'
        : summary.status === 'failed'
          ? 'chip-danger'
          : 'chip-info';
    return (
      <div className="flex items-start gap-2">
        <SherpaAvatar />
        <SherpaBubble>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={toneClass}>{summary.status}</span>
              <span className="font-semibold">{summary.action}</span>
              {summary.subject && <span className="opacity-70">{summary.subject}</span>}
            </div>
            {summary.error && (
              <span className="font-mono text-[10.5px] text-amber-200/90">{summary.error}</span>
            )}
            {summary.txHash && (
              <a
                href={explorerTxUrl(String(summary.txHash), chainIdHex)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10.5px] text-base-cerulean underline"
              >
                View on Basescan
              </a>
            )}
          </div>
        </SherpaBubble>
      </div>
    );
  }

  // kind === 'confirmation'
  const card = content.card;
  const chain = chainMeta(card.batch?.chainId);
  const token = amountToken(card.primary_amount_display);
  const recipient = card.recipient_display;
  return (
    <div className="flex items-start gap-2">
      <SherpaAvatar />
      <div className="min-w-0 flex-1">
        <IntentChips
          action={card.intent}
          slots={[
            { key: 'amount', value: card.primary_amount_display },
            ...(recipient ? [{ key: 'to', value: recipient }] : []),
            { key: 'chain', value: chain.label },
          ]}
        />
        <div className="mt-3">
          <HeroConfirmCard
            status={{ label: 'awaiting your confirmation', tone: 'info' }}
            chain={chain}
            from={{
              label: account.ens ?? shortHex(account.address) ?? 'Your wallet',
              sub: account.address ? shortHex(account.address) : undefined,
              seed: account.address,
            }}
            to={{
              label: recipient ?? '—',
              sub: looksLikeAddress(recipient) ? shortHex(recipient) : undefined,
              seed: recipient,
            }}
            action={card.intent.toLowerCase()}
            amount={{
              display: card.primary_amount_display,
              token,
              secondary: card.secondary_amount_display,
            }}
            meta={[
              { k: 'Gas', v: card.gas_display },
              { k: 'Network', v: chain.label },
              { k: 'Plan', v: 'preview', sub: 'signs in your wallet' },
            ]}
            riskIndicators={normalizeRisk(card)}
            warnings={card.warnings}
            busy={busy}
            onConfirm={() => onConfirm(message.id)}
            onCancel={() => onCancel(message.id)}
          />
        </div>
      </div>
    </div>
  );
}

function GlassThread({
  connectionEpoch,
  isConnected,
  address,
  ens,
  balanceLabel,
  chainIdHex,
  onDisconnect,
}: {
  connectionEpoch: number;
  isConnected: boolean;
  address?: `0x${string}`;
  ens: string | null;
  balanceLabel?: string;
  chainIdHex: string | undefined;
  onDisconnect: () => void;
}) {
  const { input, setInput, busy, submitParse, confirm, cancel, chat } = usePromptFlow({
    connectionEpoch,
    isConnected,
    userAddress: address,
    initialInput: '',
  });

  return (
    <>
      <TopBar
        account={isConnected && address ? { ens, address, balanceUsd: balanceLabel } : null}
        chain={chainMeta(chainIdHex)}
        live={isConnected}
        onDisconnect={onDisconnect}
        right={!isConnected ? <ConnectButton variant="compact" /> : undefined}
      />

      <div className="relative flex min-h-0 flex-1 items-stretch px-4 py-6 sm:px-7">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 overflow-y-auto pr-1">
          {chat.messages.length === 0 && isConnected && (
            <div className="mt-10 text-center font-mono text-[12px] opacity-55">
              Type an intent below to begin.
            </div>
          )}
          {chat.messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              account={{ ens, address }}
              chainIdHex={chainIdHex}
              onConfirm={(id) => void confirm(id)}
              onCancel={cancel}
              busy={busy}
            />
          ))}
        </div>
      </div>

      <ComposerPill
        value={input}
        onChange={setInput}
        onSubmit={() => void submitParse()}
        busy={busy || !isConnected}
        statusLine={isConnected ? undefined : 'Connect your wallet to start.'}
      />
    </>
  );
}

export function GlassHome() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: ensName } = useEnsName({ address, chainId: 1 });
  const { data: balance } = useBalance({ address });
  const previousAddress = useRef<`0x${string}` | undefined>(address);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (
      previousAddress.current &&
      previousAddress.current.toLowerCase() !== address.toLowerCase()
    ) {
      setConnectionEpoch((epoch) => epoch + 1);
      setSessionKey((key) => key + 1);
    }
    previousAddress.current = address;
  }, [address, isConnected]);

  useAccountEffect({
    onDisconnect() {
      setConnectionEpoch((epoch) => epoch + 1);
    },
  });

  const balanceLabel = balance
    ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`
    : undefined;
  const chainIdHex = `0x${chainId.toString(16)}`;

  return (
    <AppFrame>
      <GlassThread
        key={sessionKey}
        connectionEpoch={connectionEpoch}
        isConnected={isConnected}
        address={address}
        ens={ensName ?? null}
        balanceLabel={balanceLabel}
        chainIdHex={chainIdHex}
        onDisconnect={disconnect}
      />
    </AppFrame>
  );
}
