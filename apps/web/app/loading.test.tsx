import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/feature-flags', () => ({ GLASS_AURORA_ENABLED: false }));

import Loading from './loading';

describe('Loading', () => {
  it('renders the legacy Sherpa header skeleton and is marked aria-busy', () => {
    render(<Loading />);
    const main = screen.getByRole('main', { name: 'Loading' });
    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Sherpa')).toBeInTheDocument();
    expect(main.className).toContain('bg-sherpa-bg');
  });
});
