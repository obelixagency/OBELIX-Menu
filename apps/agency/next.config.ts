import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Allow packaging large zip downloads from generated/
  },
};

export default nextConfig;
