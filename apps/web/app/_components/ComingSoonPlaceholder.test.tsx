import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComingSoonPlaceholder } from './ComingSoonPlaceholder';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('ComingSoonPlaceholder', () => {
  it('renders the feature name in the heading', () => {
    render(<ComingSoonPlaceholder feature="Swap" />);
    expect(screen.getByText(/Swap — Coming Soon/)).toBeTruthy();
  });

  it('renders environment availability message', () => {
    render(<ComingSoonPlaceholder feature="Lend" />);
    expect(screen.getByText(/not enabled in this environment/)).toBeTruthy();
  });

  it('renders a link back to home', () => {
    render(<ComingSoonPlaceholder feature="Borrow" />);
    const link = screen.getByRole('link', { name: /back to home/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
  });

  it('renders with different feature names', () => {
    const { rerender } = render(<ComingSoonPlaceholder feature="Withdraw" />);
    expect(screen.getByText(/Withdraw — Coming Soon/)).toBeTruthy();
    rerender(<ComingSoonPlaceholder feature="Repay" />);
    expect(screen.getByText(/Repay — Coming Soon/)).toBeTruthy();
  });

  it('renders stage 2 availability note', () => {
    render(<ComingSoonPlaceholder feature="Positions" />);
    expect(screen.getByText(/production flags are enabled/)).toBeTruthy();
  });
});
