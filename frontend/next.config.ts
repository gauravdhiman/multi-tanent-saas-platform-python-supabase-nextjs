import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Optimize imports for production
    optimizePackageImports: ['@/components/ui'],
  },
};

export default nextConfig;
