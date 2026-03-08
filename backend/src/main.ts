import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger } from '@nestjs/common';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import { Reflector } from '@nestjs/core';

// CRITICAL PERFORMANCE OPTIMIZATION: Configure Sharp for optimal performance
import Sharp from 'sharp';

// Import worker setup (same pattern as original backend)
import { startImageWorkers } from './worker';
import * as os from 'os';

// CRITICAL PERFORMANCE FIX: Configure Sharp for high-performance concurrent processing
const configureSharpPerformance = () => {
  try {
    // Set Sharp concurrency to utilize all CPU cores efficiently
    const cpuCount = os.cpus().length;
    const optimalConcurrency = Math.max(1, Math.floor(cpuCount * 0.8)); // Use 80% of CPU cores
    
    Sharp.concurrency(optimalConcurrency);
    console.log(`🚀 Sharp configured for optimal performance: ${optimalConcurrency} concurrent operations (${cpuCount} CPU cores available)`);
    
    // Configure Sharp cache for better memory management
    Sharp.cache({ 
      memory: 100, // Cache 100 images in memory (adjust based on RAM)
      files: 20,   // Cache 20 processed files on disk
      items: 200   // Cache 200 metadata items
    });
    
    console.log('Sharp performance optimizations applied');
  } catch (error) {
    console.warn('⚠️ Failed to configure Sharp performance optimizations:', error.message);
  }
};

// NOTE: UV_THREADPOOL_SIZE must be set before Node starts (via env or npm script).
// Setting it here has no effect — libuv reads it at process startup only.

// NOTE: Node.js flags like --max-old-space-size, --expose-gc, --incremental-marking
// must be set via CLI args or NODE_OPTIONS BEFORE process startup (in package.json scripts).

// Apply Sharp performance optimizations before app initialization
configureSharpPerformance();

// Handle Bull.js Redis connection errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message;
    
    // Handle various Redis connection error messages
    if (
      message.includes('Redis is already connecting/connected') ||
      message.includes('Connection is closed') ||
      message.includes('Redis connection') ||
      message.includes('ECONNREFUSED') ||
      message.includes('Socket closed unexpectedly') ||
      message.includes('Redis client closed') ||
      message.includes('Connection lost')
    ) {
      console.warn('⚠️ Bull.js Redis connection error handled gracefully:', message);
      return; // Don't crash the process
    }
  }
  
  // Log other unhandled rejections but don't crash in development
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Only crash in production for truly unexpected errors
  if (process.env.NODE_ENV === 'production') {
    console.error('Exiting due to unhandled promise rejection in production');
    process.exit(1);
  }
});

// Uncaught exceptions should crash the process — continuing is unsafe
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Get port from config (same as Express version)
  const port = configService.get<number>('port') || 5000;

  // CORS configuration (same as Express version)
  app.enableCors({
    origin: configService.get<string>('frontendUrl') || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Security middleware (same as Express version)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
                 connectSrc: ["'self'", configService.get<string>('frontendUrl') || 'http://localhost:3000', 'https://toolscandy.com', 'https://*.toolscandy.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource sharing for images
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false, // Disable to prevent WASM issues
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));

  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Global sanitization pipe (applied first, with smart filtering)
  // Pass Reflector so @SkipSanitization decorator works
  app.useGlobalPipes(new SanitizationPipe(app.get(Reflector)));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Advanced security guard is registered via APP_GUARD in CommonModule
  // This ensures lifecycle hooks (onModuleDestroy) are called properly

  // API prefix (same as Express version)
  app.setGlobalPrefix('api');

  // Swagger documentation (disabled in production to avoid exposing API schema)
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Web Tools API')
      .setDescription('Image processing and web tools API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  await app.listen(port);
  
  logger.log(`🚀 Server running on port ${port}`);
  logger.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);

  // Start image workers automatically (same as original backend)
  try {
    await startImageWorkers(app);
    logger.log('✅ Image workers started successfully');
  } catch (error) {
    logger.error('❌ Failed to start image workers:', error);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
}); 