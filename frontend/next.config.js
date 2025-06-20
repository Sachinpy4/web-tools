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

    // Add WebAssembly support for background removal
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fix module resolution for ONNX Runtime and background removal
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      os: false,
      url: false,
      assert: false,
    };

    // Disable strict exports field enforcement for onnxruntime-web
    config.resolve.exportsFields = [];
    
    // Add aliases to our empty module to avoid import errors
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-web/webgpu': require.resolve('./lib/empty-module.js'),
      'onnxruntime-web/wasm': require.resolve('./lib/empty-module.js'),
    };

    // Ignore WASM files that can't be resolved
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Suppress webpack warnings for ONNX Runtime dynamic requires
    config.ignoreWarnings = [
      // Ignore critical dependency warnings from onnxruntime-web
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      // Ignore other ONNX-related warnings
      /node_modules\/@imgly\/background-removal\/node_modules\/onnxruntime-web/,
      /node_modules\/onnxruntime-web/,
    ];

    // Additional webpack optimization for ONNX runtime
    config.resolve.alias = {
      ...config.resolve.alias,
      // Provide proper aliases for ONNX runtime to prevent resolution issues
      'onnxruntime-web$': 'onnxruntime-web/dist/ort.min.js',
    };

    // Handle dynamic imports more gracefully
    config.module.rules.push({
      test: /node_modules\/@imgly\/background-removal/,
      parser: {
        javascript: {
          // Allow dynamic imports in background removal library
          dynamicImportMode: 'lazy',
        },
      },
    });

    return config;
  },
  
  // Add headers for cross-origin isolation (enables WASM multi-threading)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 