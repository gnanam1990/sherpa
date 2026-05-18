import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlassActionCard, GlassDeviceFrame, GlassPill, SherpaGlassMark } from './GlassAurora';

describe('GlassAurora primitives', () => {
  it('renders a branded app frame without requiring browser globals', () => {
    render(
      <GlassDeviceFrame>
        <GlassPill>Base App</GlassPill>
        <GlassActionCard href="/base" label="Ask Sherpa" meta="Intent" />
        <SherpaGlassMark className="h-8 w-8" />
      </GlassDeviceFrame>,
    );

    expect(screen.getByText('Base App')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ask Sherpa/ })).toHaveAttribute('href', '/base');
  });
});
