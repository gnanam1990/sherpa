type NetWorthCardProps = {
  value: string | null;
  changeToday?: string | null;
  changePercent?: string | null;
  healthFactor?: string | null;
  network?: string;
};

export function NetWorthCard({
  value,
  changeToday = null,
  changePercent = null,
  healthFactor = null,
  network = 'Base mainnet',
}: NetWorthCardProps) {
  const hasValue = Boolean(value);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-base-gradient p-6 text-white shadow-glow-blue sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(0,225,255,0.36)_0%,transparent_68%)]"
      />
      <div className="relative">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
          Net worth
        </div>
        <div className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {hasValue ? value : <span className="text-white/55">--</span>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/82">
          {hasValue && changeToday ? (
            <span className="font-medium text-base-green">
              {changeToday}
              {changePercent ? <span className="ml-2 text-white/70">{changePercent}</span> : null}
            </span>
          ) : (
            <span>Connect a wallet to calculate portfolio context.</span>
          )}
          {healthFactor ? (
            <span className="rounded-full bg-white/12 px-2.5 py-1 font-mono text-xs">
              HF {healthFactor}
            </span>
          ) : null}
          <span className="ml-auto font-mono text-xs text-white/68">{network}</span>
        </div>
      </div>
    </section>
  );
}
