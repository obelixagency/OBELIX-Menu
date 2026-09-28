import type { NextConfig } from "next";

// Set NEXT_BASE_PATH=/pilot only for the Hostinger submenu pilot; exports leave unset.
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  env: {
    // Expose to client so fetch()/SW registration honor basePath (Next does not auto-prefix fetch).
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
