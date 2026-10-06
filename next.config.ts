import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  serverExternalPackages: [],
  experimental: { cpus: 1 },
};
export default nextConfig;
