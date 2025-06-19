import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisStatusService } from './services/redis-status.service';
import { RedisRateLimitService } from './services/redis-rate-limit.service';
import { SettingsCacheService } from './services/settings-cache.service';
import { DynamicThrottlerGuard } from './guards/dynamic-throttler.guard';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { SystemSettings, SystemSettingsSchema } from '../modules/admin/schemas/system-settings.schema';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
  ],
  providers: [
    RedisStatusService,
    RedisRateLimitService,
    SettingsCacheService,
    DynamicThrottlerGuard,
    AllExceptionsFilter,
    LoggingInterceptor,
  ],
  exports: [
    RedisStatusService,
    RedisRateLimitService,
    SettingsCacheService,
    DynamicThrottlerGuard,
    AllExceptionsFilter,
    LoggingInterceptor,
  ],
})
export class CommonModule {} 