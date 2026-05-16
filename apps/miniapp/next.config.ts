import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sherpa/ui', '@sherpa/core', '@sherpa/tools'],
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

export default nextConfig;
