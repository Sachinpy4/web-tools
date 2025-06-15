/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Improve hot module replacement stability
  onDemandEntries: {
    // Keep pages in memory longer (in ms)
    maxInactiveAge: 120 * 1000,
    // Increase pages buffer length
    pagesBufferLength: 8,
  },
  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Set production API URL if not already set
  serverRuntimeConfig: {
    // Will only be available on the server side
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  },
  // Optimize webpack for more stable builds
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Improve caching behavior in development
      config.optimization.runtimeChunk = 'single';
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig 