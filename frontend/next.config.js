/** @type {import('next').NextConfig} */

// Add global polyfills for SSR to prevent "self is not defined" errors
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  global.self = global;
}

const nextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // Minimal experimental features to avoid SSR issues
    optimizeCss: true, // Re-enabled with critters package
    scrollRestoration: true,
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

    // Prevent server-side execution of client-only packages
    if (isServer) {
      const originalFallback = config.resolve.fallback || {};
      config.resolve.fallback = {
        ...originalFallback,
        '@imgly/background-removal': false,
        'onnxruntime-web': false,
      };
    }

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

    // Ensure AI/ML packages are client-side only
    config.module.rules.push({
      test: /node_modules[\\/](@imgly[\\/]background-removal|onnxruntime-web)/,
      parser: {
        javascript: {
          dynamicImportMode: 'lazy',
        },
      },
      sideEffects: false, // Enable tree shaking for these packages
    });

    // Minimal production optimizations only
    if (!dev) {
      // Keep minimal safe optimizations
      config.optimization.usedExports = true;
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