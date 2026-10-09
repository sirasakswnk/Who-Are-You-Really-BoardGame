import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['firebase-admin'],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
