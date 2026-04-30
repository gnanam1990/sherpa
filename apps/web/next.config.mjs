/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sherpa/ui', '@sherpa/core', '@sherpa/safety'],
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
