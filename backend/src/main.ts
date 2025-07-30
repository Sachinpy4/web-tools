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
import { AdvancedSecurityGuard } from './common/guards/advanced-security.guard';
import { Reflector } from '@nestjs/core';

// CRITICAL PERFORMANCE OPTIMIZATION: Configure Sharp for optimal performance
import Sharp from 'sharp';

// Import worker setup (same pattern as original backend)
import { startImageWorkers } from './worker';

// CRITICAL PERFORMANCE FIX: Configure Sharp for high-performance concurrent processing
const configureSharpPerformance = () => {
  try {
    // Set Sharp concurrency to utilize all CPU cores efficiently
    const cpuCount = require('os').cpus().length;
    const optimalConcurrency = Math.max(1, Math.floor(cpuCount * 0.8)); // Use 80% of CPU cores
    
    Sharp.concurrency(optimalConcurrency);
    console.log(`🚀 Sharp configured for optimal performance: ${optimalConcurrency} concurrent operations (${cpuCount} CPU cores available)`);
    
    // Configure Sharp cache for better memory management
    Sharp.cache({ 
      memory: 100, // Cache 100 images in memory (adjust based on RAM)
      files: 20,   // Cache 20 processed files on disk
      items: 200   // Cache 200 metadata items
    });
    
    // Disable Sharp's internal queue to let BullMQ handle queuing
    Sharp.queue.on('change', (queueLength) => {
      if (queueLength > 50) {
        console.warn(`⚠️ Sharp internal queue growing: ${queueLength} operations pending`);
      }
    });
    
    console.log('✅ Sharp performance optimizations applied');
  } catch (error) {
    console.warn('⚠️ Failed to configure Sharp performance optimizations:', error.message);
  }
};

// CRITICAL PERFORMANCE FIX: Set Node.js performance optimizations
const configureNodePerformance = () => {
  try {
    // Set optimal garbage collection for image processing workloads
    if (process.env.NODE_ENV === 'production') {
      // Enable incremental GC for better performance with large files
      process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --incremental-marking --max-old-space-size=8192 --expose-gc';
    } else {
      // Enable GC in development for better file cleanup
      process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --expose-gc';
    }
    
    // Set optimal UV thread pool size for file operations
    process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';
    
    console.log('✅ Node.js performance optimizations applied');
  } catch (error) {
    console.warn('⚠️ Failed to configure Node.js performance optimizations:', error.message);
  }
};

// Apply performance optimizations before app initialization
configureSharpPerformance();
configureNodePerformance();

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

// Handle uncaught exceptions as well
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Don't crash for Redis-related errors
  if (error.message && (
    error.message.includes('Redis') ||
    error.message.includes('Connection is closed') ||
    error.message.includes('ECONNREFUSED')
  )) {
    console.warn('⚠️ Redis-related uncaught exception handled gracefully');
    return;
  }
  
  // Exit for other uncaught exceptions
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
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", '*', 'data:', 'blob:'],
        connectSrc: ["'self'", configService.get<string>('frontendUrl') || 'http://localhost:3000'],
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

  // Logging middleware (same as Express version)
  app.use(morgan('dev'));

  // Global sanitization pipe (applied first, with smart filtering)
  app.useGlobalPipes(new SanitizationPipe());

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

  // Advanced security guard (only for high-risk endpoints)
  app.useGlobalGuards(new AdvancedSecurityGuard(app.get(Reflector)));

  // API prefix (same as Express version)
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Web Tools API')
    .setDescription('Image processing and web tools API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  
  logger.log(`🚀 Server running on port ${port}`);
  logger.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);

  // Start image workers automatically (same as original backend)
  try {
    logger.log('🔍 DEBUG - About to start image workers...');
    const workerResult = await startImageWorkers(app);
    logger.log('✅ Image workers started successfully');
    logger.log('🔍 DEBUG - Worker result:', workerResult ? 'Worker instance created' : 'No worker instance');
  } catch (error) {
    logger.error('❌ Failed to start image workers:', error);
    logger.error('🔍 DEBUG - Worker startup error stack:', error.stack);
    // Don't exit - server can run without workers for direct processing
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
}); 