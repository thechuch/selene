import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  }
};

export default nextConfig;
