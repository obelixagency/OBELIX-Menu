import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Set NEXT_BASE_PATH=/pilot only for the Hostinger submenu pilot; exports leave unset.
  basePath: process.env.NEXT_BASE_PATH || "",
};

export default nextConfig;
