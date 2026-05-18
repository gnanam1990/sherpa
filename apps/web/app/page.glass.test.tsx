import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Sibling of page.legacy.test.tsx with the opposite static flag value —
// the only reliable way to cover both branches of a module-level const.
vi.mock('../lib/feature-flags', () => ({ GLASS_AURORA_ENABLED: true }));
vi.mock('./_components/HomeContent', () => ({
  HomeContent: () => <div data-testid="legacy-home" />,
}));
vi.mock('./_components/glass/glass-home', () => ({
  GlassHome: () => <div data-testid="glass-home" />,
}));

import HomePage from './page';

describe('HomePage feature flag (enabled)', () => {
  it('renders Glass Aurora and not the legacy home', () => {
    render(<HomePage />);
    expect(screen.getByTestId('glass-home')).toBeTruthy();
    expect(screen.queryByTestId('legacy-home')).toBeNull();
  });
});
