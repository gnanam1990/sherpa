/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

type KpiTileProps = {
  label: string;
  value: string | null;
  meta?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

const TONE_CLASS: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default: 'text-muted-foreground',
  success: 'text-base-green',
  warning: 'text-base-yellow',
  danger: 'text-base-red',
};

export function KpiTile({ label, value, meta, tone = 'default' }: KpiTileProps) {
  return (
    <section className="base-card-soft p-4">
      <div className="meta-label mb-2">{label}</div>
      <div className="stat-value">{value ?? <span className="text-muted-foreground/60">--</span>}</div>
      {meta ? <div className={`mt-1 font-mono text-xs ${TONE_CLASS[tone]}`}>{meta}</div> : null}
    </section>
  );
}
