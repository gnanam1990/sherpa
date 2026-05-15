import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const captureException = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException }));

import GlobalError from './error';

describe('GlobalError', () => {
  beforeEach(() => {
    captureException.mockReset();
  });

  it('renders heading, friendly copy, and both CTAs', () => {
    render(<GlobalError error={new Error('boom')} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.getByText(/We've been notified/)).toBeInTheDocument();
    const refresh = screen.getByRole('button', { name: 'Refresh' });
    expect(refresh).toBeInTheDocument();
    expect(refresh).toHaveAttribute('type', 'button');
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('captures the error to Sentry on mount', () => {
    const err = new Error('explode');
    render(<GlobalError error={err} />);
    expect(captureException).toHaveBeenCalledWith(err);
  });
});
