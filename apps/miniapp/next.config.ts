import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sherpa/ui', '@sherpa/core', '@sherpa/tools'],
};

export default nextConfig;
