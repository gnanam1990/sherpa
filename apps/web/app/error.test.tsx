import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import GlobalError from './error';

describe('GlobalError', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
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

  it('logs the error to console on mount', () => {
    const err = new Error('explode');
    render(<GlobalError error={err} />);
    expect(errSpy).toHaveBeenCalledWith('[sherpa:error-boundary]', err);
  });
});
