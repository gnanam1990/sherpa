/**
 * @sherpa/ui — shared design tokens / helpers (M2 ownership).
 *
 * Week-1 scope: tokens only. React components land in Week 2+ once `apps/web`
 * has its first flow wired.
 */

export const tokens = {
  color: {
    baseBlue: '#0052FF',
    bg: '#0B0D10',
    fg: '#F5F7FA',
  },
  font: {
    sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
  },
} as const;

export type Tokens = typeof tokens;
