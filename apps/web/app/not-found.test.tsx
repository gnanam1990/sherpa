import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFound from './not-found';

describe('NotFound', () => {
  it('renders the heading and friendly copy', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Page not found',
    );
    expect(screen.getByText(/wandered off the trail/i)).toBeInTheDocument();
  });

  it('renders a Back to home link pointing at /', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
