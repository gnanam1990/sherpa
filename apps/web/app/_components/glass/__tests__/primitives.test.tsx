import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// next/navigation: controllable pathname so route-derived components can be
// exercised in both matched and unmatched states.
const nav = vi.hoisted(() => ({ pathname: '/' as string | null }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));

// next/link: render a plain anchor (no router context needed in jsdom).
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} />,
}));

import { matchRoute, useRoute, ROUTES } from '../route-context';
import { GlassPanel, GlassChip, MetaLabel, Pip, LensBorder } from '../primitives';
import { SherpaMark, Avatar, TokenIcon, ChainPill, shortHex } from '../brand';
import { ROUTE_ICONS, ArrowIcon, CheckIcon, InfoIcon, SettingsIcon } from '../icons';
import { UserBubble, SherpaBubble, SherpaAvatar, IntentChips } from '../chat-bubbles';
import { AuroraBackground } from '../background/aurora-background';
import { AppFrame } from '../app-frame';
import { IconRail } from '../icon-rail';
import { TopBar } from '../top-bar';
import { ComposerPill } from '../composer-pill';
import { HeroConfirmCard } from '../hero-confirm-card';

beforeEach(() => {
  nav.pathname = '/';
});

describe('route-context', () => {
  it('matches root, prefixes, nested, and unknown paths', () => {
    expect(matchRoute('/')).toBe('home');
    expect(matchRoute('/swap')).toBe('swap');
    expect(matchRoute('/swap/details')).toBe('swap');
    expect(matchRoute('/auto-repay')).toBe('auto-repay');
    expect(matchRoute('/base')).toBeNull();
    expect(matchRoute('/unknown')).toBeNull();
    expect(matchRoute(null)).toBeNull();
  });

  it('useRoute reflects the active pathname', () => {
    function Probe() {
      const { activeRoute, routeMeta, routes } = useRoute();
      return (
        <div>
          <span data-testid="active">{activeRoute ?? 'none'}</span>
          <span data-testid="label">{routeMeta?.label ?? 'none'}</span>
          <span data-testid="count">{routes.length}</span>
        </div>
      );
    }
    nav.pathname = '/positions';
    render(<Probe />);
    expect(screen.getByTestId('active').textContent).toBe('positions');
    expect(screen.getByTestId('label').textContent).toBe('Portfolio');
    expect(screen.getByTestId('count').textContent).toBe(String(ROUTES.length));
  });
});

describe('primitives render without throwing', () => {
  it('GlassPanel (default + deep)', () => {
    const { container } = render(
      <>
        <GlassPanel>panel</GlassPanel>
        <GlassPanel deep className="extra" style={{ minWidth: 10 }}>
          deep
        </GlassPanel>
      </>,
    );
    // Structural assertion (repo vitest has no working snapshot infra).
    const html = container.innerHTML;
    expect(html).toContain('rounded-3xl glass ');
    expect(html).toContain('rounded-3xl glass-deep extra');
    expect(html).toContain('min-width: 10px');
    expect(screen.getByText('panel')).toBeTruthy();
  });

  it('GlassChip (neutral + every tone)', () => {
    const { container } = render(
      <>
        <GlassChip>neutral</GlassChip>
        <GlassChip tone="success">ok</GlassChip>
        <GlassChip tone="warning">warn</GlassChip>
        <GlassChip tone="danger">bad</GlassChip>
        <GlassChip tone="info">info</GlassChip>
      </>,
    );
    const chips = Array.from(container.querySelectorAll('span.inline-flex'));
    expect(chips).toHaveLength(5);
    const [neutral, success, , danger] = chips;
    // Neutral chip uses glass-thin; toned chips use inline tone style.
    expect(neutral?.className).toContain('glass-thin');
    expect(success?.getAttribute('style')).toContain('rgba(124,255,203');
    expect(danger?.getAttribute('style')).toContain('rgba(255,90,95');
  });

  it('MetaLabel, Pip, LensBorder', () => {
    render(
      <>
        <MetaLabel className="x">From</MetaLabel>
        <Pip />
        <Pip filled={false} />
        <Pip color="#fff" />
        <LensBorder className="y">
          <div>child</div>
        </LensBorder>
      </>,
    );
    expect(screen.getByText('From')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });
});

describe('brand', () => {
  it('shortHex handles empty / short / long', () => {
    expect(shortHex(undefined)).toBe('');
    expect(shortHex(null)).toBe('');
    expect(shortHex('0xabc')).toBe('0xabc');
    expect(shortHex('0x036CbD53842c5426634e7929541eC2318f3dCF7e')).toBe('0x036C…CF7e');
  });

  it('renders mark, avatars, token icons, chain pills', () => {
    render(
      <>
        <SherpaMark />
        <SherpaMark size={40} />
        <Avatar seed={3} />
        <Avatar seed="0xabc" size={40} />
        <TokenIcon symbol="USDC" />
        <TokenIcon symbol="ZZZ" />
        <ChainPill />
        <ChainPill chain="Base Sepolia" tone="sepolia" />
        <ChainPill chain="OP" tone="optimism" />
        <ChainPill chain="Arb" tone="arbitrum" />
      </>,
    );
    expect(screen.getAllByLabelText('Sherpa').length).toBeGreaterThan(0);
  });
});

describe('icons', () => {
  it('renders every route icon in both states + utility glyphs', () => {
    const { container } = render(
      <>
        {Object.values(ROUTE_ICONS).map((Icon, i) => (
          <span key={i}>
            <Icon active />
            <Icon />
          </span>
        ))}
        <ArrowIcon />
        <ArrowIcon size={20} color="#fff" />
        <CheckIcon />
        <CheckIcon size={20} color="#000" />
        <InfoIcon active />
        <SettingsIcon active />
      </>,
    );
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(
      Object.keys(ROUTE_ICONS).length,
    );
  });
});

describe('chat bubbles', () => {
  it('renders user/sherpa bubbles and intent chips', () => {
    render(
      <>
        <UserBubble text="send 1 usdc" />
        <SherpaBubble>plain</SherpaBubble>
        <SherpaBubble thin>thin</SherpaBubble>
        <SherpaAvatar />
        <IntentChips
          action="SEND"
          confidence={0.97}
          slots={[
            { key: 'amount', value: '250 USDC' },
            { key: 'to', value: 'vitalik.base.eth' },
          ]}
        />
        <IntentChips action="SWAP" />
      </>,
    );
    expect(screen.getByText('send 1 usdc')).toBeTruthy();
    expect(screen.getByText(/SEND/)).toBeTruthy();
  });
});

describe('shell + nav', () => {
  it('AuroraBackground renders decorative tree', () => {
    const { container } = render(<AuroraBackground />);
    expect(container.querySelector('.aurora-root')).toBeTruthy();
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  it('AppFrame renders content (with and without rail)', () => {
    nav.pathname = '/swap';
    const { rerender } = render(
      <AppFrame>
        <div>content-a</div>
      </AppFrame>,
    );
    expect(screen.getByText('content-a')).toBeTruthy();
    rerender(
      <AppFrame hideRail railProps={{ showStageTags: true }}>
        <div>content-b</div>
      </AppFrame>,
    );
    expect(screen.getByText('content-b')).toBeTruthy();
  });

  it('IconRail renders default table, override, badges, footer', () => {
    nav.pathname = '/swap';
    const { rerender } = render(<IconRail />);
    expect(screen.getByLabelText('Swap').getAttribute('aria-current')).toBe('page');
    expect(screen.getByLabelText('Sherpa home').querySelector('img')?.getAttribute('src')).toBe(
      '/sherpa-icon-192.png',
    );
    expect(screen.getByLabelText('About').getAttribute('href')).toBe('/about');
    rerender(
      <IconRail
        items={ROUTES.slice(0, 2)}
        badges={{ alerts: 3 }}
        showStageTags
        footer={<span>footer-slot</span>}
      />,
    );
    expect(screen.getByText('footer-slot')).toBeTruthy();
  });

  it('TopBar: connected vs disconnected, account menu, chain, live, no breadcrumb', async () => {
    nav.pathname = '/swap';
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const onDisconnect = vi.fn();
    const { rerender } = render(
      <TopBar
        account={{
          ens: 'gnanam.base.eth',
          address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          balanceUsd: '$8,427.14',
        }}
        chain={{ label: 'Base', tone: 'mainnet' }}
        live
        onDisconnect={onDisconnect}
      />,
    );
    expect(screen.getByText('gnanam.base.eth')).toBeTruthy();
    expect(screen.getByText('Swap')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /gnanam.base.eth/i }));
    expect(screen.getByRole('menu', { name: /wallet account menu/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /view on basescan/i }).getAttribute('href')).toBe(
      'https://basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /copy address/i }));
    expect(writeText).toHaveBeenCalledWith('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(await screen.findByText('copied')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: /disconnect/i }));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    rerender(
      <TopBar
        account={null}
        showBreadcrumb={false}
        showCmdK={false}
        right={<button>Connect</button>}
      />,
    );
    expect(screen.getByText('Connect')).toBeTruthy();
  });
});

describe('composer pill', () => {
  it('changes value, shows action rail, submits trimmed', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ComposerPill
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
        statusLine="parser · safety v3"
      />,
    );
    expect(screen.getByRole('button', { name: 'Swap' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Intent'), {
      target: { value: 'swap 1 usdc' },
    });
    expect(onChange).toHaveBeenLastCalledWith('swap 1 usdc');

    rerender(<ComposerPill value="  swap 1 usdc  " onChange={onChange} onSubmit={onSubmit} />);
    const form = screen.getByLabelText('Intent').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledWith('swap 1 usdc');

    rerender(<ComposerPill value="x" onChange={onChange} onSubmit={onSubmit} busy />);
    expect((screen.getByText('Parsing…') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('HeroConfirmCard', () => {
  const base = {
    status: { label: 'awaiting your confirmation', tone: 'info' as const },
    chain: { label: 'Base Sepolia', tone: 'sepolia' as const },
    from: { label: 'gnanam.base.eth', sub: '0x036C…F7e', seed: '0x036C' },
    to: { label: 'vitalik.base.eth', sub: '0xd8dA…6045' },
    action: 'send',
    amount: { display: '250 USDC', token: 'USDC', secondary: '≈ $250.00' },
    meta: [
      { k: 'Gas', v: 'Sponsored', sub: 'paymaster', color: '#7CFFCB' },
      { k: 'Network', v: 'Base Sepolia' },
      { k: 'Plan', v: 'preview', sub: 'not yet executed', mono: true },
    ],
  };

  it('renders real risk indicators + warnings, no fake pips', () => {
    const onConfirm = vi.fn();
    const { container } = render(
      <HeroConfirmCard
        {...base}
        riskIndicators={[
          { level: 'info', label: 'Allowlisted recipient' },
          { level: 'warning', label: 'First transfer to this address' },
        ]}
        warnings={['Double-check the recipient address.']}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText(/Confirm in Smart Wallet/));
    expect(onConfirm).toHaveBeenCalled();
    const html = container.innerHTML;
    expect(html).toContain('lens-border');
    expect(html).toContain('glass-deep');
    expect(html).toContain('text-gradient-ice');
    expect(html).toContain('gradient-cerulean cerulean-glow-fx');
    // Real risk surface, not a fabricated pip cluster.
    expect(screen.getByText('Allowlisted recipient')).toBeTruthy();
    expect(screen.getByText('Double-check the recipient address.')).toBeTruthy();
    expect(container.querySelector('[aria-label^="Safety"]')).toBeNull();
  });

  it('renders without safety section, em-dash amount, busy disables actions', () => {
    render(
      <HeroConfirmCard
        {...base}
        amount={{ display: '—' }}
        status={{ label: 'ready', tone: 'info' }}
        busy
      />,
    );
    const btn = screen.getByText('Awaiting signature…').closest('button');
    expect(btn).not.toBeNull();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
