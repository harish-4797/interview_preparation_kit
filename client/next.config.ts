import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://interview-prep-api1.vercel.app/api/:path*',
      },
    ];
  },
};

export default nextConfig;
