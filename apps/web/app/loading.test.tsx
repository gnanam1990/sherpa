import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from './loading';

describe('Loading', () => {
  it('renders the Sherpa header skeleton and is marked aria-busy', () => {
    render(<Loading />);
    const main = screen.getByRole('main', { name: 'Loading' });
    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Sherpa')).toBeInTheDocument();
  });
});
