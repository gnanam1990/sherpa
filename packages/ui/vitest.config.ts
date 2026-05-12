import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
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
