/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sherpa/ui', '@sherpa/core', '@sherpa/safety'],
};

export default nextConfig;
