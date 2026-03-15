import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.vietqr.io',
      },
    ],
  },

  allowedDevOrigins: [
    "192.168.1.27",
    "192.168.1.11",
    "localhost",
    "0.0.0.0",
  ],
};

export default nextConfig;
