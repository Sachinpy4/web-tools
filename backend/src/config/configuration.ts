export default () => ({
  // Server Configuration (from original env.example)
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database Configuration (same as original)
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/web-tools',
  },

  // Redis Configuration (exactly as original)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // JWT Configuration (same as original)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-should-be-at-least-64-characters-long-and-random',
    expiresIn: process.env.JWT_EXPIRE || '4h',
  },

  // Worker Configuration (exactly as original)
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY, 10) || 20,
    maxLoadThreshold: parseFloat(process.env.MAX_LOAD_THRESHOLD) || 0.9,
    maxMemoryUsagePercent: parseInt(process.env.MAX_MEMORY_USAGE_PERCENT, 10) || 90,
    degradationCooldownMs: parseInt(process.env.DEGRADATION_COOLDOWN_MS, 10) || 15000,
  },

  // Rate Limiting Configuration (same as original)
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 300000, // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 50,
    batchMaxRequests: parseInt(process.env.BATCH_LIMIT_MAX, 10) || 15,
  },

  // File Upload Configuration (same as original)
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800, // 50MB
    maxFiles: parseInt(process.env.MAX_FILES, 10) || 10,
    dest: process.env.UPLOAD_DIR || 'uploads',
  },

  // CORS Configuration (same as original)
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Logging Configuration (same as original)
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Queue Settings (same as original)
  queue: {
    cleanupInterval: parseInt(process.env.QUEUE_CLEANUP_INTERVAL, 10) || 3600000, // 1 hour
    jobTimeout: parseInt(process.env.JOB_TIMEOUT, 10) || 180000, // 3 minutes
    jobAttempts: parseInt(process.env.JOB_ATTEMPTS, 10) || 3,
  },

  // Cache Control & Versioning (same as original)
  app: {
    version: process.env.APP_VERSION || '1.0.0',
    deploymentTime: process.env.DEPLOYMENT_TIME || Date.now().toString(),
  },

  // Performance Settings (same as original)
  performance: {
    nodeOptions: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
  },
}); 