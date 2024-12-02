/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizeCss: true
  },
  // Ensure proper handling of API routes
  rewrites: async () => {
    return [];
  },
}

module.exports = nextConfig;
