import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack for compatibility with local packages
  turbopack: undefined,
  serverExternalPackages: ["compromise"],
};

export default nextConfig;
