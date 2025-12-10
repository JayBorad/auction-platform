import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  useFileSystemPublicRoutes: true,
  // Explicitly define that we're not using the pages directory
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
  typescript: {
    // Allow production builds to successfully complete even if there are type errors
    ignoreBuildErrors: true,
  },
  // Provide empty turbopack config to avoid conflicts with webpack
  turbopack: {},
  webpack: (config) => {
    // Ensure proper path resolution for @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    return config;
  },
};

export default nextConfig;
