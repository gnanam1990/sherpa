import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    coverage: {
      include: [
        'app/_components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.test.{ts,tsx}'],
      thresholds: {
        statements: 60,
      },
    },
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
