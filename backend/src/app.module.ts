import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import configuration from './config/configuration';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { DynamicThrottlerGuard } from './common/guards/dynamic-throttler.guard';
import { SystemSettings, SystemSettingsSchema } from './modules/admin/schemas/system-settings.schema';
import { ImagesModule } from './modules/images/images.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { CommentModule } from './modules/comments/comment.module';
import { MediaModule } from './modules/media/media.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeoModule } from './modules/seo/seo.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { BackupModule } from './modules/backup/backup.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

@Module({
  imports: [
    // Configuration (same as original env setup)
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database (same MongoDB setup as original)
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),

    // SystemSettings model for DynamicThrottlerGuard
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),

    // Redis/BullMQ Queue setup (migrated from Bull)
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          username: configService.get<string>('redis.username'),
          db: configService.get<number>('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting (same as original)
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get<number>('rateLimiting.windowMs') / 1000, // Convert to seconds
        limit: configService.get<number>('rateLimiting.maxRequests'),
      }]),
      inject: [ConfigService],
    }),

    // Static file serving (same as original)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Task scheduling (for cleanup jobs like original)
    ScheduleModule.forRoot(),

    // Common module (provides Redis status service globally)
    CommonModule,

    // Feature modules
    AuthModule,
    BlogModule,
    CommentModule,
    MediaModule,
    ImagesModule,
    AdminModule,
    SeoModule,
    ScriptsModule,
    BackupModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    DynamicThrottlerGuard,
  ],
})
export class AppModule {} 