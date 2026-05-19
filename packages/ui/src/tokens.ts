/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export const tokens = {
  color: {
    baseBlue: '#0052FF',
    bg: '#0B0D10',
    surface: '#14171C',
    surface2: '#1B1F26',
    fg: '#F5F7FA',
    muted: '#8A94A6',
    danger: '#FF5A5F',
    success: '#3CCB7F',
    warning: '#F5A623',
  },
  font: {
    sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
} as const;

export type Tokens = typeof tokens;
