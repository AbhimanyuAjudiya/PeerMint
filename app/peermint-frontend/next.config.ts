import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack is now the default in Next.js 16
  // The QR scanner worker file is served from the public directory
  turbopack: {},
};

export default nextConfig;
