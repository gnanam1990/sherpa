'use client';

export type SerializedRiskIndicator =
  | string
  | { level?: 'info' | 'warning' | 'danger'; label: string; detail?: string };

export type SerializedStep = {
  kind: string;
  to: string;
  data: string;
  value: string;
  label: string;
};

export type SerializedSendCallsEnvelope = {
  version: '1.0';
  chainId: string;
  calls: Array<{ to: string; data: string; value: string }>;
  capabilities?: { paymasterService?: { url: string } };
};

export type SerializedConfirmationCardProps = {
  intent: string;
  primary_action_label: string;
  primary_amount_display: string;
  secondary_amount_display?: string;
  recipient_display?: string;
  recipient_metadata?: Record<string, unknown>;
  risk_indicators?: SerializedRiskIndicator[];
  steps: SerializedStep[];
  batch?: SerializedSendCallsEnvelope;
  redirect_url?: string;
  gas_display: string;
  warnings: string[];
  estimated_completion_ms: number;
};

type ConfirmationCardProps = {
  card: SerializedConfirmationCardProps;
  onConfirm?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
};

type ResultCardProps = {
  actionDescription: string;
  onSendAnother: () => void;
};

type FailureCardProps = ResultCardProps & {
  errorDetail: string;
  onTryAgain: () => void;
  onEditAndRetry: () => void;
};

type SuccessCardProps = ResultCardProps & {
  txHash?: string;
};

const BASESCAN_TX_PREFIX = 'https://sepolia.basescan.org/tx/';

const intentVerb: Record<string, string> = {
  SEND: 'Send',
  BUY: 'Buy',
  BET: 'Bet',
  BALANCE: 'Show balance',
  HISTORY: 'Show history',
  IDENTITY_LOOKUP: 'Lookup identity',
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function headlineFor(card: SerializedConfirmationCardProps): string {
  const action = intentVerb[card.intent] ?? card.primary_action_label;
  if (!card.primary_amount_display || card.primary_amount_display === '—') return action;
  if (card.primary_amount_display.toLowerCase().startsWith(action.toLowerCase())) {
    return card.primary_amount_display;
  }
  return `${action} ${card.primary_amount_display}`;
}

function metadataSource(metadata: Record<string, unknown> | undefined): string | undefined {
  const source = metadata?.['source'];
  return typeof source === 'string' ? source : undefined;
}

function metadataDetails(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return [];
  return Object.entries(metadata)
    .filter(([key]) => key !== 'source')
    .flatMap(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return [`${key}: ${String(value)}`];
      }
      return [];
    });
}

function formatEta(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `~${Math.round(ms / 1000)}s`;
}

function isSponsored(card: SerializedConfirmationCardProps): boolean {
  return /sponsored/i.test(card.gas_display) || !!card.batch?.capabilities?.paymasterService;
}

function normalizeRisk(indicator: SerializedRiskIndicator) {
  if (typeof indicator === 'string') return { level: 'warning' as const, label: indicator };
  return { level: indicator.level ?? 'warning', label: indicator.label, detail: indicator.detail };
}

export function RiskBadge({ indicator }: { indicator: SerializedRiskIndicator }) {
  const risk = normalizeRisk(indicator);
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
        risk.level === 'danger' && 'border-sherpa-danger/40 bg-sherpa-danger/10 text-sherpa-danger',
        risk.level === 'warning' &&
          'border-sherpa-warning/40 bg-sherpa-warning/10 text-sherpa-warning',
        risk.level === 'info' && 'border-sherpa-blue/40 bg-sherpa-blue/10 text-sherpa-blue',
      )}
      title={risk.detail}
    >
      {risk.label}
    </span>
  );
}

export function SponsoredBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-sherpa-success/40 bg-sherpa-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sherpa-success">
      Sponsored
    </span>
  );
}

export function ConfirmationCard({
  card,
  disabled = false,
  onCancel,
  onConfirm,
}: ConfirmationCardProps) {
  const source = metadataSource(card.recipient_metadata);
  const metadata = metadataDetails(card.recipient_metadata);
  const headline = headlineFor(card);
  const multiStep = card.steps.length > 1;

  return (
    <section
      className="w-full max-w-md rounded-2xl border border-sherpa-surface2 bg-sherpa-surface p-4 text-left text-sherpa-fg shadow-2xl shadow-black/20 sm:p-5"
      data-testid="confirmation-card"
      aria-label={`${card.intent} confirmation`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sherpa-surface2 bg-sherpa-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sherpa-muted">
              {card.intent}
            </span>
            {isSponsored(card) ? <SponsoredBadge /> : null}
            {multiStep ? (
              <span className="rounded-full border border-sherpa-blue/30 bg-sherpa-blue/10 px-2.5 py-1 text-[11px] font-semibold text-sherpa-blue">
                {card.steps.length}-step plan
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-3xl font-semibold leading-none tracking-[-0.04em] text-sherpa-fg">
            {headline}
          </h2>
          {card.secondary_amount_display ? (
            <p className="mt-2 text-sm text-sherpa-muted">{card.secondary_amount_display}</p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-3 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sherpa-muted">
            Gas
          </div>
          <div className="mt-1 text-xs font-semibold text-sherpa-fg">{card.gas_display}</div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-sherpa-surface2 py-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sherpa-muted">
            Estimate
          </dt>
          <dd className="mt-1 text-sherpa-fg">{formatEta(card.estimated_completion_ms)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sherpa-muted">
            Network
          </dt>
          <dd className="mt-1 text-sherpa-fg">Base Sepolia</dd>
        </div>
        {card.recipient_display ? (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sherpa-muted">
              Recipient
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2 text-sherpa-fg">
              <span className="break-all">{card.recipient_display}</span>
              {source ? (
                <span className="rounded-full bg-sherpa-bg px-2 py-0.5 text-[11px] text-sherpa-muted">
                  {source}
                </span>
              ) : null}
            </dd>
            {metadata.length ? (
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {metadata.map((item) => (
                  <span
                    className="rounded-full border border-sherpa-surface2 bg-sherpa-bg px-2 py-0.5 text-[11px] text-sherpa-muted"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </dd>
            ) : null}
          </div>
        ) : null}
      </dl>

      {card.risk_indicators?.length ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Risk indicators">
          {card.risk_indicators.map((indicator, index) => (
            <RiskBadge indicator={indicator} key={`${normalizeRisk(indicator).label}-${index}`} />
          ))}
        </div>
      ) : null}

      {card.steps.length ? (
        <ol className="mt-4 space-y-2">
          {card.steps.map((step, index) => (
            <li
              className="grid grid-cols-[1.75rem_1fr] gap-3 rounded-xl border border-sherpa-surface2 bg-sherpa-bg/70 p-3"
              data-testid="card-step"
              key={`${step.kind}-${index}`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sherpa-surface2 text-xs font-semibold text-sherpa-fg">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium text-sherpa-fg">{step.label}</span>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.12em] text-sherpa-muted">
                  {step.kind}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {card.warnings.length ? (
        <ul className="mt-4 space-y-1 rounded-xl border border-sherpa-warning/30 bg-sherpa-warning/10 p-3 text-sm text-sherpa-warning">
          {card.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {card.redirect_url && !disabled ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sherpa-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-sherpa-blue/90 focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
            data-testid="card-redirect"
            href={card.redirect_url}
            rel="noreferrer noopener"
            target="_blank"
          >
            Proceed
          </a>
        ) : (
          <button
            className="min-h-11 rounded-xl bg-sherpa-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-sherpa-blue/90 focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={onConfirm}
            type="button"
          >
            Proceed
          </button>
        )}
        <button
          className="min-h-11 rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-4 py-2 text-sm font-semibold text-sherpa-fg transition hover:border-sherpa-muted focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

export function ExecutionPendingCard({ message }: { message: string }) {
  return (
    <section className="w-full max-w-md rounded-2xl border border-sherpa-surface2 bg-sherpa-surface p-5 text-sherpa-fg shadow-2xl shadow-black/20">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-sherpa-blue border-t-transparent"
        />
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em]">{message}</h2>
          <p className="mt-1 text-sm text-sherpa-muted">Waiting for transaction confirmation.</p>
        </div>
      </div>
    </section>
  );
}

export function ExecutionSuccessCard({
  actionDescription,
  onSendAnother,
  txHash,
}: SuccessCardProps) {
  const txHref = txHash ? `${BASESCAN_TX_PREFIX}${txHash}` : undefined;
  return (
    <section className="w-full max-w-md rounded-2xl border border-sherpa-success/30 bg-sherpa-surface p-5 text-sherpa-fg shadow-2xl shadow-black/20">
      <span className="rounded-full border border-sherpa-success/40 bg-sherpa-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sherpa-success">
        Success
      </span>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Transaction confirmed</h2>
      <p className="mt-2 text-sm text-sherpa-muted">Completed: {actionDescription}</p>
      {txHash ? (
        <p className="mt-3 break-all font-mono text-xs text-sherpa-muted">{txHash}</p>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {txHref ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-4 py-2 text-sm font-semibold text-sherpa-fg transition hover:border-sherpa-muted"
            href={txHref}
            rel="noreferrer noopener"
            target="_blank"
          >
            View on Basescan
          </a>
        ) : null}
        <button
          className="min-h-11 rounded-xl bg-sherpa-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-sherpa-blue/90 focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
          onClick={onSendAnother}
          type="button"
        >
          Send another
        </button>
      </div>
    </section>
  );
}

export function formatExecutionError(errorDetail: string): string {
  if (errorDetail === 'INSUFFICIENT_FUNDS_FOR_GAS') return 'Not enough Sepolia ETH for gas';
  if (errorDetail === 'RECIPIENT_INVALID') return "Recipient address couldn't be resolved";
  if (errorDetail === 'SIMULATION_FAILED') {
    return 'Transaction would fail. Try a smaller amount or different recipient.';
  }
  if (errorDetail === 'TIMEOUT') {
    return 'Transaction took too long. Check basescan with the tx hash.';
  }
  return errorDetail;
}

export function ExecutionFailureCard({
  actionDescription,
  errorDetail,
  onEditAndRetry,
  onSendAnother,
  onTryAgain,
}: FailureCardProps) {
  return (
    <section className="w-full max-w-md rounded-2xl border border-sherpa-danger/30 bg-sherpa-surface p-5 text-sherpa-fg shadow-2xl shadow-black/20">
      <span className="rounded-full border border-sherpa-danger/40 bg-sherpa-danger/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sherpa-danger">
        Failed
      </span>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
        {formatExecutionError(errorDetail)}
      </h2>
      <p className="mt-2 text-sm text-sherpa-muted">We tried to: {actionDescription}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          className="min-h-11 rounded-xl bg-sherpa-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-sherpa-blue/90 focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
          onClick={onTryAgain}
          type="button"
        >
          Try again
        </button>
        <button
          className="min-h-11 rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-4 py-2 text-sm font-semibold text-sherpa-fg transition hover:border-sherpa-muted focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
          onClick={onEditAndRetry}
          type="button"
        >
          Edit and retry
        </button>
        <button
          className="min-h-11 rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-4 py-2 text-sm font-semibold text-sherpa-fg transition hover:border-sherpa-muted focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
          onClick={onSendAnother}
          type="button"
        >
          Send another
        </button>
      </div>
    </section>
  );
}
