import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// GLASS_AURORA_ENABLED is a module-level constant evaluated once at import
// time, so each branch needs its own file with a static mock (see also
// page.glass.test.tsx). Heavy children are mocked — this verifies the
// flag wiring only.
vi.mock('../lib/feature-flags', () => ({ GLASS_AURORA_ENABLED: false }));
vi.mock('./_components/HomeContent', () => ({
  HomeContent: () => <div data-testid="legacy-home" />,
}));
vi.mock('./_components/glass/glass-home', () => ({
  GlassHome: () => <div data-testid="glass-home" />,
}));

import HomePage from './page';

describe('HomePage feature flag (disabled)', () => {
  it('renders the legacy home and not Glass Aurora', () => {
    render(<HomePage />);
    expect(screen.getByTestId('legacy-home')).toBeTruthy();
    expect(screen.queryByTestId('glass-home')).toBeNull();
  });
});
