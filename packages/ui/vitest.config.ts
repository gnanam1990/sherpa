import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'test/**'],
      thresholds: {
        statements: 70,
      },
    },
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
