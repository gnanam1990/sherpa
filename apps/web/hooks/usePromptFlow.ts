'use client';

import { useEffect, useRef, useState } from 'react';
import {
  formatExecutionError,
  type ActionStatus,
  type ActionSummary,
  type SerializedConfirmationCardProps,
  type SerializedSendCallsEnvelope,
} from '@sherpa/ui';
import { useSherpaCallsStatus, useSherpaSendCalls } from '../lib/wagmi';
import { useChatHistory } from './useChatHistory';
import { stage2ComingSoonText, type Stage2Feature } from '../app/_components/Stage2ComingSoon';

/**
 * usePromptFlow — the presentation-agnostic Sherpa command pipeline.
 *
 * This is a behaviour-preserving extraction of the orchestration that used
 * to live inside `Prompt.tsx`: parse → branch by intent → execute →
 * sponsored send → poll calls-status → audit-report → update the chat
 * thread. NOTHING about the parser / safety / signing behaviour changed;
 * `Prompt.test.tsx` is the contract that guards that.
 *
 * Both the legacy `Prompt` (renders via @sherpa/ui MessageThread) and the
 * Glass Aurora home render the SAME hook state, so there is one source of
 * truth for the logic and two presentations.
 */

type ParseResponse = {
  parsed?: { intent: string; confidence: number; slots?: Record<string, unknown> };
  card?: SerializedConfirmationCardProps;
  error?: string;
  stage2?: { status: string; reason: string };
};

type BalanceResponse = {
  address: string;
  chain: string;
  balances: { ETH: string; USDC: string };
};

type HistoryResponse = {
  address: string;
  chain: string;
  items: Array<{
    txHash: string;
    direction: 'in' | 'out' | 'self';
    asset: string;
    amountDisplay: string;
    counterparty: string;
    sherpaIntent?: string;
  }>;
};

type PositionsResponse = {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  fetchedAt: string;
};

type AlertRuleResponse = {
  id: string;
  conditionType: string;
  asset?: { symbol?: string } | null;
  comparison: string;
  threshold: number;
  status: string;
};

type AlertListResponse = {
  alerts: AlertRuleResponse[];
};

type DCAResponse = {
  id: string;
  fromAsset: { symbol?: string };
  toAsset: { symbol?: string };
  amountPerTick: string;
  frequency: string;
  status: string;
  nextExecutionAt?: string;
};

type DCAListResponse = {
  schedules: DCAResponse[];
};

type AutoRepayResponse = {
  id: string;
  triggerHF: number;
  targetHF: number;
  maxRepayPerExecution: string;
  status: string;
};

type GovernanceResponse = {
  proposals: Array<{ id: string; title?: string; state?: string; status?: string; source?: string }>;
  errors?: Array<{ source: string; error: string }>;
  status?: string;
};

type ChainListResponse = {
  chains: Array<{ chainId: number; name: string; dex?: { name: string }; bridgeProtocols: string[] }>;
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

const stage2FeatureByIntent: Record<string, Stage2Feature | undefined> = {
  SWAP: 'swap',
  LEND: 'lend',
  BORROW: 'borrow',
  REPAY: 'repay',
  WITHDRAW: 'withdraw',
};

/** Example intents surfaced as quick-fill chips. Shared by both renderers. */
export const EXAMPLE_PROMPTS = [
  'show my positions',
  'swap 1 usdc for eth',
  'lend 10 usdc to aave',
  'send 5 usdc to vitalik.eth',
];

/** The legacy default prompt. Load-bearing for Prompt.test.tsx. */
export const LEGACY_DEFAULT_INPUT =
  'send 5 usdc to 0x036CbD53842c5426634e7929541eC2318f3dCF7e';

type ConfirmingAction = PendingConfirmation & { auditLogId: number; messageId: string };

type CallsStatusReceipt = {
  transactionHash?: string;
};

type CallsStatusResult = {
  receipts?: CallsStatusReceipt[];
  status?: 'pending' | 'success' | 'failure';
};

export type UsePromptFlowOptions = {
  connectionEpoch?: number;
  isConnected: boolean;
  userAddress?: `0x${string}`;
  /**
   * Initial composer value. Legacy Prompt passes {@link LEGACY_DEFAULT_INPUT}
   * (its tests depend on it); the Glass home passes '' so it never shows a
   * pre-typed placeholder transaction.
   */
  initialInput?: string;
};

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

const actionVerb: Record<string, string> = {
  SEND: 'Send',
  BUY: 'Buy',
  BET: 'Bet',
  BALANCE: 'Show balance',
  HISTORY: 'Show history',
  IDENTITY_LOOKUP: 'Lookup identity',
};

export function actionDescription(
  card: SerializedConfirmationCardProps | undefined,
): string {
  if (!card) return 'complete this action';
  const verb = actionVerb[card.intent] ?? card.primary_action_label;
  if (!card.primary_amount_display || card.primary_amount_display === '—') return verb;
  if (card.primary_amount_display.toLowerCase().startsWith(verb.toLowerCase())) {
    return card.primary_amount_display;
  }
  return `${verb} ${card.primary_amount_display}`;
}

function errorDetailFrom(err: unknown): string {
  if (err instanceof Error) {
    const normalized = err.message.toLowerCase();
    if (
      err instanceof SyntaxError &&
      normalized.includes('unexpected token') &&
      normalized.includes('json')
    ) {
      return UNREADABLE_WALLET_RESPONSE_ERROR;
    }
    return err.message;
  }
  return String(err);
}

function isWalletCancellationError(errorDetail: string): boolean {
  const normalized = errorDetail.toLowerCase();
  return (
    normalized.includes('user rejected') ||
    normalized.includes('user cancelled') ||
    normalized.includes('user canceled') ||
    normalized.includes('request rejected') ||
    normalized.includes('rejected the request')
  );
}

function txHashFromCallsStatus(
  status: CallsStatusResult | undefined,
): `0x${string}` | undefined {
  const txHash = status?.receipts?.find((receipt) => receipt.transactionHash)?.transactionHash;
  if (typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return txHash as `0x${string}`;
  }
  return undefined;
}

async function reportExecutionResult(
  auditLogId: number,
  result: { error?: string; txHash?: `0x${string}` },
) {
  const payload = result.error ? { ...result, error: result.error.slice(0, 500) } : result;
  try {
    await fetch(`/api/execute/${auditLogId}/confirm`, {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  } catch {
    // Audit persistence should not make a wallet-confirmed action look failed.
  }
}

const successVerb: Record<string, string> = {
  SEND: 'Sent',
  BUY: 'Bought',
  BET: 'Placed bet',
  BALANCE: 'Checked balance',
  HISTORY: 'Loaded history',
  IDENTITY_LOOKUP: 'Resolved identity',
};

const pendingVerb: Record<string, string> = {
  SEND: 'Sending',
  BUY: 'Buying',
  BET: 'Placing bet',
  BALANCE: 'Checking balance',
  HISTORY: 'Loading history',
  IDENTITY_LOOKUP: 'Resolving identity',
};

const UNREADABLE_WALLET_RESPONSE_ERROR =
  'Wallet returned an unreadable response. The transaction was not confirmed. Please retry from the wallet popup.';

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: (T & { details?: string; error?: string; message?: string }) | undefined;

  if (text.trim()) {
    try {
      body = JSON.parse(text) as T & { details?: string; error?: string; message?: string };
    } catch {
      const preview = text.replace(/\s+/g, ' ').trim().slice(0, 500);
      throw new Error(
        res.ok
          ? `Sherpa API returned an unreadable response${preview ? `: ${preview}` : '.'}`
          : (preview || `Request failed with ${res.status}`),
      );
    }
  } else {
    body = {} as T & { details?: string; error?: string; message?: string };
  }

  if (!res.ok) {
    throw new Error(
      body.error ?? body.message ?? body.details ?? `Request failed with ${res.status}`,
    );
  }
  return body;
}

function displayChainName(chain: string): string {
  if (chain === 'base' || chain === 'base-mainnet') return 'Base mainnet';
  if (chain === 'base-sepolia') return 'Base Sepolia';
  return chain;
}

function balanceSummary(data: BalanceResponse): string {
  const chain = displayChainName(data.chain);
  return [
    `Balance on ${chain}`,
    `ETH: ${data.balances.ETH}`,
    `USDC: ${data.balances.USDC}`,
  ].join('\n');
}

function shortTxHash(txHash: string): string {
  if (txHash.length <= 20) return txHash;
  return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
}

function historySummary(data: HistoryResponse): string {
  const chain = displayChainName(data.chain);
  if (data.items.length === 0) return `No recent transactions on ${chain}.`;
  const rows = data.items.slice(0, 5).map((item) => {
    const relation = item.direction === 'in' ? 'from' : item.direction === 'self' ? 'with' : 'to';
    return [
      `${item.direction.toUpperCase()} ${item.amountDisplay} ${relation} ${item.counterparty}`,
      `Tx: ${shortTxHash(item.txHash)}`,
      item.sherpaIntent ? `Intent: ${item.sherpaIntent}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  });
  return [`Recent transactions on ${chain}`, ...rows].join('\n\n');
}

function formatBaseUsd(value: string): string {
  const raw = BigInt(value);
  const whole = raw / 100_000_000n;
  const cents = ((raw % 100_000_000n) / 1_000_000n).toString().padStart(2, '0');
  return `$${whole}.${cents}`;
}

function formatHealthFactorText(value: string): string {
  const hf = BigInt(value);
  if (hf === 2n ** 256n - 1n) return '∞ (no debt)';
  const whole = hf / 1_000_000_000_000_000_000n;
  const decimals = ((hf % 1_000_000_000_000_000_000n) / 10_000_000_000_000_000n)
    .toString()
    .padStart(2, '0');
  return `${whole}.${decimals}`;
}

function positionsSummary(data: PositionsResponse): string {
  if (!data.hasPosition) {
    return [
      'No Aave V3 positions on Base.',
      'Lend, borrow, withdraw, and repay through Sherpa are live on Base mainnet with guarded amount caps.',
    ].join('\n');
  }
  return [
    'Aave V3 positions on Base',
    `Health factor: ${formatHealthFactorText(data.healthFactor)}`,
    `Collateral: ${formatBaseUsd(data.totalCollateralBase)}`,
    `Debt: ${formatBaseUsd(data.totalDebtBase)}`,
    `Available to borrow: ${formatBaseUsd(data.availableBorrowsBase)}`,
    `Updated: ${new Date(data.fetchedAt).toLocaleTimeString()}`,
  ].join('\n');
}

function slotString(
  slots: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = slots?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function slotNumber(
  slots: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = slots?.[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function alertSummary(data: AlertRuleResponse): string {
  const asset = data.asset?.symbol ? ` ${data.asset.symbol}` : '';
  return [
    'Alert saved',
    `${data.conditionType}${asset} ${data.comparison} ${data.threshold}`,
    `Status: ${data.status}`,
    `ID: ${data.id}`,
    'Delivery is beta and depends on configured notification channels.',
  ].join('\n');
}

function alertListSummary(data: AlertListResponse): string {
  if (data.alerts.length === 0) return 'No alerts saved yet.';
  return [
    'Saved alerts',
    ...data.alerts.slice(0, 5).map((alert) => {
      const asset = alert.asset?.symbol ? ` ${alert.asset.symbol}` : '';
      return `${alert.conditionType}${asset} ${alert.comparison} ${alert.threshold} · ${alert.status}\nID: ${alert.id}`;
    }),
  ].join('\n\n');
}

function dcaSummary(data: DCAResponse): string {
  return [
    'DCA schedule saved',
    `${data.amountPerTick} ${data.fromAsset.symbol ?? 'USDC'} to ${data.toAsset.symbol ?? 'asset'} · ${data.frequency}`,
    `Status: ${data.status}`,
    data.nextExecutionAt ? `Next: ${new Date(data.nextExecutionAt).toLocaleString()}` : undefined,
    `ID: ${data.id}`,
    'Execution remains gated until session-key signing is configured.',
  ]
    .filter(Boolean)
    .join('\n');
}

function dcaListSummary(data: DCAListResponse): string {
  if (data.schedules.length === 0) return 'No DCA schedules saved yet.';
  return [
    'Saved DCA schedules',
    ...data.schedules.slice(0, 5).map((schedule) =>
      [
        `${schedule.amountPerTick} ${schedule.fromAsset.symbol ?? 'USDC'} to ${schedule.toAsset.symbol ?? 'asset'} · ${schedule.frequency}`,
        `Status: ${schedule.status}`,
        schedule.nextExecutionAt ? `Next: ${new Date(schedule.nextExecutionAt).toLocaleString()}` : undefined,
        `ID: ${schedule.id}`,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}

function autoRepaySummary(data: AutoRepayResponse): string {
  return [
    'Auto-repay rule saved',
    `Trigger HF: ${data.triggerHF}`,
    `Target HF: ${data.targetHF}`,
    `Max repay: ${data.maxRepayPerExecution} USDC`,
    `Status: ${data.status}`,
    `ID: ${data.id}`,
    'Autonomous repayment execution remains audit-gated.',
  ].join('\n');
}

function governanceSummary(data: GovernanceResponse): string {
  const warning = data.errors?.length ? `\n\nWarnings: ${data.errors.length} upstream source(s) failed.` : '';
  if (data.proposals.length === 0) return `No governance proposals loaded.${warning}`;
  return [
    'Governance proposals',
    ...data.proposals.slice(0, 5).map((proposal) =>
      [
        proposal.title ?? proposal.id,
        `${proposal.source ?? 'governance'} · ${proposal.state ?? proposal.status ?? 'unknown'}`,
        `ID: ${proposal.id}`,
      ].join('\n'),
    ),
  ].join('\n\n') + warning;
}

function chainSummary(data: ChainListResponse): string {
  return [
    'Supported chains (read-only)',
    ...data.chains.map((chain) =>
      `${chain.name} (${chain.chainId}) · DEX: ${chain.dex?.name ?? 'none'} · Bridges: ${chain.bridgeProtocols.join(', ')}`,
    ),
    'Cross-chain execution remains disabled until adapters are audited.',
  ].join('\n');
}

function identitySummary(card: SerializedConfirmationCardProps): string {
  const source = card.recipient_metadata?.source;
  const query = card.recipient_metadata?.query;
  return [
    `Resolved ${typeof query === 'string' ? query : card.primary_amount_display}`,
    `Address: ${card.recipient_display ?? card.secondary_amount_display ?? 'unknown'}`,
    typeof source === 'string' ? `Source: ${source}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

export function summaryFor(
  card: SerializedConfirmationCardProps,
  status: ActionStatus,
  txHash?: string,
  errorDetail?: string,
): ActionSummary {
  if (status === 'failed') {
    const cancelled = errorDetail ? isWalletCancellationError(errorDetail) : false;
    return {
      action: cancelled ? 'Transaction cancelled' : 'Transaction failed',
      error: errorDetail
        ? cancelled
          ? 'Wallet request was cancelled.'
          : formatExecutionError(errorDetail)
        : undefined,
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

export type UsePromptFlowResult = {
  input: string;
  setInput: (value: string) => void;
  busy: boolean;
  submitParse: () => Promise<void>;
  confirm: (messageId: string) => Promise<void>;
  cancel: (messageId: string) => void;
  chat: ReturnType<typeof useChatHistory>;
};

export function usePromptFlow({
  connectionEpoch = 0,
  isConnected,
  userAddress,
  initialInput = LEGACY_DEFAULT_INPUT,
}: UsePromptFlowOptions): UsePromptFlowResult {
  const [input, setInput] = useState(initialInput);
  const [parseBusy, setParseBusy] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>('idle');
  const [confirmingAction, setConfirmingAction] = useState<ConfirmingAction | null>(null);
  const [callsStatusId, setCallsStatusId] = useState<string | undefined>();
  const pendingConfirmations = useRef<Record<string, PendingConfirmation>>({});
  const { sendSponsoredCallsAsync } = useSherpaSendCalls();
  const callsStatus = useSherpaCallsStatus({
    id: callsStatusId,
    pollingInterval: 1000,
    query: { enabled: Boolean(callsStatusId && confirmingAction) },
    throwOnFailure: false,
    timeout: 60_000,
  });
  const chat = useChatHistory(userAddress);
  const walletState = useRef({ connectionEpoch, isConnected, userAddress });

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
    setPhase('parsing');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: prompt, userKey: userAddress }),
      });
      const body = await readJson<ParseResponse>(res);
      if (body.parsed?.intent === 'BALANCE') {
        const balance = await readJson<BalanceResponse>(await fetch(`/api/balance/${userAddress}`));
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: balanceSummary(balance) },
        });
        return;
      }
      if (body.parsed?.intent === 'HISTORY') {
        const rawLimit = body.parsed.slots?.limit;
        const limit = typeof rawLimit === 'number' ? rawLimit : 10;
        const history = await readJson<HistoryResponse>(
          await fetch(`/api/history/${userAddress}?limit=${Math.min(50, Math.max(1, limit))}`),
        );
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: historySummary(history) },
        });
        return;
      }
      if (body.parsed?.intent === 'POSITIONS') {
        const positions = await readJson<PositionsResponse>(
          await fetch(`/api/positions/${userAddress}`),
        );
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: positionsSummary(positions) },
        });
        return;
      }
      if (body.parsed?.intent === 'ALERT') {
        const slots = body.parsed.slots;
        const action = slotString(slots, 'alertAction');
        if (action === 'list') {
          const alerts = await readJson<AlertListResponse>(await fetch(`/api/alerts/${userAddress}`));
          chat.updateMessage(thinkingMessage.id, {
            content: { kind: 'text', text: alertListSummary(alerts) },
          });
          return;
        }
        if (action === 'cancel') {
          const target = slotString(slots, 'alertTarget');
          if (!target) throw new Error('Missing alert id to cancel');
          await readJson<{ status: string }>(await fetch(`/api/alerts/${target}`, { method: 'DELETE' }));
          chat.updateMessage(thinkingMessage.id, {
            content: { kind: 'text', text: `Alert cancelled\nID: ${target}` },
          });
          return;
        }
        const comparison = slotString(slots, 'comparison') === 'cross' ? 'cross-above' : slotString(slots, 'comparison') ?? '>';
        const alert = await readJson<AlertRuleResponse>(
          await fetch('/api/alerts', {
            body: JSON.stringify({
              userAddress,
              conditionType: slotString(slots, 'conditionType') ?? 'price',
              asset: slotString(slots, 'asset') ?? 'ETH',
              comparison,
              threshold: slotNumber(slots, 'threshold') ?? 0,
              notificationChannels: ['push'],
              triggeredIntent: prompt,
            }),
            headers: { 'content-type': 'application/json' },
            method: 'POST',
          }),
        );
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: alertSummary(alert) },
        });
        return;
      }
      if (body.parsed?.intent === 'DCA') {
        const slots = body.parsed.slots;
        const dca = await readJson<DCAResponse>(
          await fetch('/api/dca', {
            body: JSON.stringify({
              userAddress,
              fromAsset: 'USDC',
              toAsset: slotString(slots, 'dcaAsset') ?? 'ETH',
              amountPerTick: slotString(slots, 'dcaAmount') ?? '10',
              frequency: slotString(slots, 'frequency') ?? 'weekly',
              hourOfDay: 12,
            }),
            headers: { 'content-type': 'application/json' },
            method: 'POST',
          }),
        );
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: dcaSummary(dca) },
        });
        return;
      }
      if (body.parsed?.intent === 'DCA_MANAGE') {
        const schedules = await readJson<DCAListResponse>(await fetch(`/api/dca/${userAddress}`));
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: dcaListSummary(schedules) },
        });
        return;
      }
      if (body.parsed?.intent === 'AUTO_REPAY') {
        const slots = body.parsed.slots;
        const triggerHF = slotNumber(slots, 'triggerHF') ?? 1.3;
        const targetHF = Math.min(3, Math.max(triggerHF + 0.2, 1.5));
        const repayAsset = (slotString(slots, 'repayAsset') ?? 'USDC').toLowerCase();
        const rule = await readJson<AutoRepayResponse>(
          await fetch('/api/auto-repay', {
            body: JSON.stringify({
              userAddress,
              triggerHF,
              targetHF,
              maxRepayPerExecution: slotString(slots, 'maxRepay') ?? '100',
              repaySource: repayAsset === 'dai' ? ['dai'] : ['usdc'],
              maxPerDay: 3,
            }),
            headers: { 'content-type': 'application/json' },
            method: 'POST',
          }),
        );
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: autoRepaySummary(rule) },
        });
        return;
      }
      if (body.parsed?.intent === 'GOVERNANCE') {
        const proposals = await readJson<GovernanceResponse>(
          await fetch('/api/governance/proposals?source=snapshot'),
        );
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: governanceSummary(proposals) },
        });
        return;
      }
      if (body.parsed?.intent === 'CROSS_CHAIN') {
        const chains = await readJson<ChainListResponse>(await fetch('/api/chains'));
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: chainSummary(chains) },
        });
        return;
      }
      const stage2Feature = body.parsed?.intent
        ? stage2FeatureByIntent[body.parsed.intent]
        : undefined;
      if (stage2Feature && body.stage2?.status === 'coming_soon' && !body.card) {
        chat.updateMessage(thinkingMessage.id, {
          content: {
            kind: 'text',
            text: stage2ComingSoonText(stage2Feature, body.parsed),
          },
        });
        return;
      }
      if (body.parsed?.intent === 'IDENTITY_LOOKUP' && body.card) {
        chat.updateMessage(thinkingMessage.id, {
          content: { kind: 'text', text: identitySummary(body.card) },
        });
        return;
      }
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
    setCallsStatusId(undefined);
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
      const body = await readJson<ExecuteResponse>(res);
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
        try {
          const sendResult = await sendSponsoredCallsAsync(toSendCallsVariables(body.card.batch));
          if (!sendResult.id) throw new Error('Wallet did not return a call id');
          setConfirmingAction({ auditLogId: body.auditLogId, card, messageId, sourceInput });
          setCallsStatusId(sendResult.id);
          setPhase('confirming');
        } catch (err) {
          const errorDetail = errorDetailFrom(err);
          void reportExecutionResult(body.auditLogId, { error: errorDetail });
          chat.updateMessage(messageId, {
            content: {
              kind: 'action',
              summary: summaryFor(card, 'failed', undefined, errorDetail),
              card,
            },
          });
          setCallsStatusId(undefined);
          setConfirmingAction(null);
          setPhase('idle');
        }
        return;
      }
      if (!body.card.batch) {
        chat.updateMessage(messageId, {
          content: { kind: 'action', summary: summaryFor(card, 'success'), card },
        });
        setPhase('idle');
        return;
      }
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
    if (callsStatus.isError) {
      const errorDetail = errorDetailFrom(callsStatus.error);
      void reportExecutionResult(confirmingAction.auditLogId, { error: errorDetail });
      chat.updateMessage(confirmingAction.messageId, {
        content: {
          kind: 'action',
          summary: summaryFor(confirmingAction.card, 'failed', undefined, errorDetail),
          card: confirmingAction.card,
        },
      });
      setCallsStatusId(undefined);
      setConfirmingAction(null);
      setPhase('idle');
      return;
    }

    const status = callsStatus.data as CallsStatusResult | undefined;
    if (status?.status === 'success') {
      const txHash = txHashFromCallsStatus(status);
      void reportExecutionResult(confirmingAction.auditLogId, txHash ? { txHash } : {});
      chat.updateMessage(confirmingAction.messageId, {
        content: {
          kind: 'action',
          summary: summaryFor(confirmingAction.card, 'success', txHash),
          card: confirmingAction.card,
        },
      });
      setCallsStatusId(undefined);
      setConfirmingAction(null);
      setPhase('idle');
      return;
    }

    if (status?.status === 'failure') {
      const errorDetail = 'Wallet reported transaction failure';
      void reportExecutionResult(confirmingAction.auditLogId, { error: errorDetail });
      chat.updateMessage(confirmingAction.messageId, {
        content: {
          kind: 'action',
          summary: summaryFor(
            confirmingAction.card,
            'failed',
            txHashFromCallsStatus(status),
            errorDetail,
          ),
          card: confirmingAction.card,
        },
      });
      setCallsStatusId(undefined);
      setConfirmingAction(null);
      setPhase('idle');
    }
  }, [callsStatus.data, callsStatus.error, callsStatus.isError, chat, confirmingAction, phase]);

  const cancel = (messageId: string) => {
    const pending = pendingConfirmations.current[messageId];
    if (pending) {
      chat.updateMessage(messageId, {
        content: { kind: 'text', text: `Cancelled ${actionDescription(pending.card)}` },
      });
      delete pendingConfirmations.current[messageId];
    }
    setCallsStatusId(undefined);
    setPhase('idle');
  };

  return { input, setInput, busy, submitParse, confirm, cancel, chat };
}
