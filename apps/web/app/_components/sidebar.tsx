'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  glyph: string;
  badge?: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Intents',
    items: [
      { href: '/', label: 'Send', glyph: 'S' },
      { href: '/swap', label: 'Swap', glyph: 'X' },
      { href: '/lend', label: 'Lend', glyph: 'L' },
      { href: '/borrow', label: 'Borrow', glyph: 'B' },
      { href: '/repay', label: 'Repay', glyph: 'R' },
      { href: '/withdraw', label: 'Withdraw', glyph: 'W' },
    ],
  },
  {
    label: 'Automation',
    items: [
      { href: '/dca', label: 'DCA', glyph: 'D', badge: 'beta' },
      { href: '/alerts', label: 'Alerts', glyph: 'A', badge: 'beta' },
      { href: '/auto-repay', label: 'Auto-repay', glyph: 'H', badge: 'beta' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/positions', label: 'Positions', glyph: 'P' },
      { href: '/session-keys', label: 'Session keys', glyph: 'K', badge: 'beta' },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen flex-col border-r border-border bg-card px-4 py-5 md:flex">
      <Link
        href="/"
        className="mb-7 flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-muted"
        aria-label="Sherpa home"
      >
        <Image
          src="/sherpa-icon-192.svg"
          alt=""
          width={32}
          height={32}
          className="rounded-lg"
          priority
        />
        <div>
          <div className="font-bold leading-tight tracking-tight">Sherpa</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Base Pro
          </div>
        </div>
      </Link>

      <div className="space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="meta-label mb-2 px-3">{section.label}</div>
            <nav className="space-y-1" aria-label={section.label}>
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-base-blue text-white shadow-glow-blue'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] ${
                        active ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                      aria-hidden="true"
                    >
                      {item.glyph}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                          active ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
