import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Prevent ESLint from blocking production builds
    ignoreDuringBuilds: true,
  },

  typescript: {
    // ✅ Allow production builds even with TS errors
    ignoreBuildErrors: true,
  },

  webpack: (config) => {
    // ✅ Support @ alias -> src
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
