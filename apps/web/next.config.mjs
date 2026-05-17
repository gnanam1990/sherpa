import { withSentryConfig } from '@sentry/nextjs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sherpa/ui', '@sherpa/core', '@sherpa/safety'],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@rainbow-me/rainbowkit$': require.resolve('@rainbow-me/rainbowkit'),
      'react$': require.resolve('react'),
      'react-dom$': require.resolve('react-dom'),
      'wagmi$': require.resolve('wagmi'),
      'wagmi/connectors$': require.resolve('wagmi/connectors'),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
  async rewrites() {
    const apiBase = process.env.SHERPA_API_BASE ?? 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
