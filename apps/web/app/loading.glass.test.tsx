import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/feature-flags', () => ({ GLASS_AURORA_ENABLED: true }));

import Loading from './loading';

describe('Loading feature flag (Glass Aurora enabled)', () => {
  it('renders the Glass Aurora skeleton instead of the legacy background', () => {
    render(<Loading />);
    const main = screen.getByRole('main', { name: 'Loading' });
    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('sherpa')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(main.className).not.toContain('bg-sherpa-bg');
  });
});
