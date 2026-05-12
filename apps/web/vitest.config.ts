import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    coverage: {
      include: [
        'app/_components/**/*.{ts,tsx}',
        'app/about/**/*.{ts,tsx}',
        'app/not-found.tsx',
        'app/error.tsx',
        'app/loading.tsx',
        'hooks/**/*.{ts,tsx}',
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
