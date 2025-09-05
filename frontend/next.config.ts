import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Turbopack root to this package to avoid multi-lockfile inference warnings
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - `turbopack` may not be in the NextConfig type yet
  turbopack: {
    // Use the current directory (frontend) as the workspace root for Turbopack
    root: __dirname,
  },
  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
