'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MOBILE_ITEMS = [
  { href: '/', label: 'Send', glyph: 'S' },
  { href: '/positions', label: 'Positions', glyph: 'P' },
  { href: '/swap', label: 'Swap', glyph: 'X' },
  { href: '/dca', label: 'Auto', glyph: 'D' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-3 left-3 right-3 z-50 flex rounded-3xl border border-border bg-card/95 p-1.5 shadow-card-soft backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      {MOBILE_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium transition ${
              active ? 'bg-base-blue text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="font-mono text-xs" aria-hidden="true">
              {item.glyph}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
