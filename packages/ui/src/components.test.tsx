import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Shell } from './components.js';

describe('Shell', () => {
  it('renders children', () => {
    render(<Shell>hello</Shell>);

    expect(screen.getByText('hello')).toBeTruthy();
  });
});
