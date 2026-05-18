import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { GlassAbout } from '../glass-about';

describe('GlassAbout', () => {
  it('renders the hero, real credibility block and honest links', () => {
    render(<GlassAbout />);
    expect(
      screen.getByRole('heading', { level: 1, name: /About Sherpa/i }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try it now' })).toHaveAttribute(
      'href',
      '/',
    );
    // Real project credibility (factual, not faked metrics).
    expect(screen.getByText('2 external rounds · 0 critical')).toBeTruthy();
    expect(screen.getByText('96.94%')).toBeTruthy();
    expect(screen.getByText('Solo built · open source · MIT')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Sherpa on GitHub' }),
    ).toHaveAttribute('href', 'https://github.com/gnanam1990/sherpa');
    expect(
      screen.getByRole('link', { name: 'Sherpa audit package' }),
    ).toBeInTheDocument();
  });
});
