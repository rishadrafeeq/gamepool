import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gamepool/database", "@gamepool/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
