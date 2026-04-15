/** @type {import('next').NextConfig} */

// Add global polyfills for SSR to prevent "self is not defined" errors
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  global.self = global;
}

const nextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
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
  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {},
  // Optimize webpack for more stable builds
  webpack: (config, { dev, isServer }) => {
    // Skip aggressive chunk splitting in development to avoid module resolution issues
    if (!dev && !isServer) {
      // Only apply optimizations in production
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
        '@imgly/background-removal': require.resolve('./lib/empty-module.js'),
        'onnxruntime-web': require.resolve('./lib/empty-module.js'),
      };
    }

    // Add aliases for onnxruntime-web subpaths to avoid import errors
    // Note: Don't disable exportsFields globally as it breaks modern ESM packages
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

    // Minimal aliases - avoid overriding library defaults in development
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Only apply ONNX runtime aliases in production
        'onnxruntime-web$': 'onnxruntime-web/dist/ort.min.js',
      };
    }

    // Minimal interference with AI/ML packages in development
    if (!dev) {
      config.module.rules.push({
        test: /node_modules[\\/](@imgly[\\/]background-removal|onnxruntime-web)/,
        parser: {
          javascript: {
            dynamicImportMode: 'lazy',
          },
        },
        sideEffects: false, // Enable tree shaking for these packages
      });
    }

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
           return `default-src 'self'; img-src * data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://tagmanager.google.com https://huggingface.co https://cdn.huggingface.co https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://partner.googleadservices.com https://*.adtrafficquality.google https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://tagmanager.google.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' blob: ${backendUrl}${devUrls} https://tools-backend.z4bapj.easypanel.host https://staticimgly.com https://cdn.img.ly https://huggingface.co https://cdn.huggingface.co https://models.blob.core.windows.net https://cdn.jsdelivr.net https://unpkg.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.adtrafficquality.google https://fundingchoicesmessages.google.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.doubleclick.net; object-src 'none'; media-src 'self' blob: data:; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; worker-src 'self' blob:; child-src 'self' blob:; upgrade-insecure-requests;`;
         })(),
       },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'credentialless',
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