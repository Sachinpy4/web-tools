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

// Import worker setup (same pattern as original backend)
import { startImageWorkers } from './worker';

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
    crossOriginResourcePolicy: false, // Allow cross-origin resource sharing for images
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