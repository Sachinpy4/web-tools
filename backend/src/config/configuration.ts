export default () => ({
  // Server Configuration (from original env.example)
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database Configuration with connection pooling for high traffic
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/web-tools',
    // High-traffic connection pool settings
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 50,
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || 5,
    maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME_MS, 10) || 30000,
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS, 10) || 45000,
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 10000,
  },

  // Redis Configuration with memory management
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    // High-traffic Redis settings
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3,
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
    lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
    maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
  },

  // JWT Configuration (same as original)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-should-be-at-least-64-characters-long-and-random',
    expiresIn: process.env.JWT_EXPIRE || '4h',
  },

  // Worker Configuration optimized for high traffic
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY, 10) || 30, // Increased from 20
    maxLoadThreshold: parseFloat(process.env.MAX_LOAD_THRESHOLD) || 0.8, // More conservative
    maxMemoryUsagePercent: parseInt(process.env.MAX_MEMORY_USAGE_PERCENT, 10) || 85, // More conservative
    degradationCooldownMs: parseInt(process.env.DEGRADATION_COOLDOWN_MS, 10) || 10000, // Faster recovery
  },

  // Rate Limiting Configuration optimized for 10K+ daily
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 300000, // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // Increased capacity
    batchMaxRequests: parseInt(process.env.BATCH_LIMIT_MAX, 10) || 25, // Increased capacity
  },

  // File Upload Configuration with size limits for scale
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800, // 50MB
    maxFiles: parseInt(process.env.MAX_FILES, 10) || 10,
    dest: process.env.UPLOAD_DIR || 'uploads',
  },

  // Cleanup Configuration for high-traffic storage management
  cleanup: {
    processedFileRetentionHours: parseInt(process.env.PROCESSED_FILE_RETENTION_HOURS, 10) || 24, // Reduced from 48
    archiveFileRetentionHours: parseInt(process.env.ARCHIVE_FILE_RETENTION_HOURS, 10) || 12, // Reduced from 24
    tempFileRetentionHours: parseFloat(process.env.TEMP_FILE_RETENTION_HOURS) || 1, // Reduced from 2
    cleanupIntervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS, 10) || 3, // More frequent
  },

  // Performance monitoring for high traffic
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS, 10) || 7,
    alertThresholds: {
      errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.05, // 5%
      responseTime: parseInt(process.env.ALERT_RESPONSE_TIME, 10) || 5000, // 5s
      queueDepth: parseInt(process.env.ALERT_QUEUE_DEPTH, 10) || 100,
    },
  },

  // Cache Configuration for better performance
  cache: {
    settingsMaxAge: parseInt(process.env.SETTINGS_CACHE_MAX_AGE, 10) || 30000, // 30 seconds
    redisMaxMemory: process.env.REDIS_MAX_MEMORY || '512mb',
    enableCompression: process.env.ENABLE_CACHE_COMPRESSION !== 'false',
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