/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'framer-motion',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select'
    ],
    cssChunking: 'strict',
    optimizeCss: true,
    scrollRestoration: true,
    esmExternals: 'loose', // Better handling of ES modules
  },
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

    // Production optimizations for better performance
    if (!dev) {
      // Optimize CSS bundling and reduce render blocking
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          maxAsyncRequests: 25,
          cacheGroups: {
            // AI/ML libraries - separate chunk (lazy load)
            aiLibs: {
              test: /[\\/]node_modules[\\/](@imgly\/background-removal|onnxruntime-web)/,
              name: 'ai-libs',
              chunks: 'async', // Only load when needed
              priority: 40,
              enforce: true,
            },
            // Rich text editor - separate chunk
            editor: {
              test: /[\\/]node_modules[\\/]@tiptap/,
              name: 'editor',
              chunks: 'async',
              priority: 35,
            },
            // UI components
            radixUI: {
              test: /[\\/]node_modules[\\/]@radix-ui/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 30,
            },
            // Animation library
            motion: {
              test: /[\\/]node_modules[\\/]framer-motion/,
              name: 'framer-motion',
              chunks: 'async',
              priority: 25,
            },
            // Core React libraries
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)/,
              name: 'react',
              chunks: 'all',
              priority: 20,
            },
            // Other vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Default and common chunks
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.externals = {
        ...config.externals,
        mongodb: 'mongodb',
        mongoose: 'mongoose',
        bcrypt: 'bcrypt',
      };
    }

    // Better tree shaking for large libraries
    config.resolve.alias = {
      ...config.resolve.alias,
      // Tree shake large libraries
      'lodash': 'lodash-es',
    };

    // Additional optimizations
    if (!dev) {
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Optimize module loading
      config.resolve.modules = ['node_modules'];
      config.resolve.symlinks = false;
    }

    return config;
  },
  
  // Add headers for cross-origin isolation (enables WASM multi-threading) and security
  async headers() {
    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-Content-Type-Options", 
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
             {
         key: "Permissions-Policy",
         value: "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), fullscreen=(self)",
       },
             {
         key: "Content-Security-Policy",
         value: (() => {
           const isDev = process.env.NODE_ENV === 'development';
           const backendUrl = process.env.NEXT_PUBLIC_API_URL || (isDev ? 'http://localhost:5000' : 'https://tools-backend.z4bapj.easypanel.host');
           const devUrls = isDev ? ' http://localhost:5000 http://localhost:3000' : '';
           return `default-src 'self'; img-src * data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://tagmanager.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://tagmanager.google.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' blob: ${backendUrl}${devUrls} https://tools-backend.z4bapj.easypanel.host https://staticimgly.com https://cdn.img.ly https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net; object-src 'none'; media-src 'self' blob: data:; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`;
         })(),
       },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'unsafe-none',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
}

module.exports = nextConfig 