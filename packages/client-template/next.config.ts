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
  async headers() {
    return [
      {
        source: "/dashboard/login",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, max-age=0, must-revalidate",
          },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
          { key: "Surrogate-Control", value: "no-store" },
          { key: "Pragma", value: "no-cache" },
          { key: "Vary", value: "Cookie" },
        ],
      },
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, max-age=0, must-revalidate",
          },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
