import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AboutPage from './page';

describe('AboutPage', () => {
  it('renders the hero headline and primary CTA', () => {
    render(<AboutPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Type anything\./);
    expect(heading).toHaveTextContent(/Sherpa does it\./);
    expect(screen.getByRole('link', { name: 'Try it now' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders all four feature cards', () => {
    render(<AboutPage />);
    const features = screen.getByRole('heading', { name: 'What it does' })
      .parentElement!;
    const items = within(features).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(features).getByText('Natural language')).toBeInTheDocument();
    expect(within(features).getByText('Smart Wallet')).toBeInTheDocument();
    expect(within(features).getByText('Sponsored gas')).toBeInTheDocument();
    expect(within(features).getByText('30+ intents')).toBeInTheDocument();
  });

  it('renders the three numbered "How it works" steps in order', () => {
    render(<AboutPage />);
    const how = screen.getByRole('heading', { name: 'How it works' }).parentElement!;
    const steps = within(how).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(within(steps[0]!).getByText('Connect')).toBeInTheDocument();
    expect(within(steps[1]!).getByText('Type')).toBeInTheDocument();
    expect(within(steps[2]!).getByText('Confirm')).toBeInTheDocument();
  });

  it('renders 5+ FAQ items including the brief-required topics', () => {
    render(<AboutPage />);
    const faq = screen.getByRole('heading', { name: 'Questions' }).parentElement!;
    const items = within(faq).getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(within(faq).getByText(/Smart Wallet\?/)).toBeInTheDocument();
    expect(within(faq).getByText(/Is this safe\?/)).toBeInTheDocument();
    expect(within(faq).getByText(/What networks/)).toBeInTheDocument();
    expect(within(faq).getByText(/mainnet ship\?/i)).toBeInTheDocument();
    expect(within(faq).getByText(/make money\?/)).toBeInTheDocument();
  });

  it('tabs through interactive elements in logical reading order', async () => {
    render(<AboutPage />);
    const user = userEvent.setup();
    // First tab lands on the first focusable: header "Sherpa" home link.
    await user.tab();
    expect(screen.getByRole('link', { name: 'Sherpa home' })).toHaveFocus();
    // Then "Open app", then "Try it now" (hero CTA).
    await user.tab();
    expect(screen.getByRole('link', { name: 'Open app' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Try it now' })).toHaveFocus();
  });

  it('renders footer links to GitHub, Farcaster, and X with accessible labels', () => {
    render(<AboutPage />);
    expect(screen.getByRole('link', { name: 'Sherpa on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/gnanam1990/sherpa',
    );
    expect(screen.getByRole('link', { name: 'Sherpa on Farcaster' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sherpa on X' })).toBeInTheDocument();
  });
});
