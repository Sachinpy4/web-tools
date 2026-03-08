import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
// ScheduleModule is registered in AppModule - do not duplicate here
import { RedisStatusService } from './services/redis-status.service';
import { RedisRateLimitService } from './services/redis-rate-limit.service';
import { SettingsCacheService } from './services/settings-cache.service';
import { AdvancedSecurityGuard } from './guards/advanced-security.guard';
import { SystemSettings, SystemSettingsSchema } from '../modules/admin/schemas/system-settings.schema';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
  ],
  providers: [
    RedisStatusService,
    RedisRateLimitService,
    SettingsCacheService,
    // Register AdvancedSecurityGuard via DI so lifecycle hooks (onModuleDestroy) are called
    {
      provide: APP_GUARD,
      useClass: AdvancedSecurityGuard,
    },
  ],
  exports: [
    RedisStatusService,
    RedisRateLimitService,
    SettingsCacheService,
  ],
})
export class CommonModule {} 