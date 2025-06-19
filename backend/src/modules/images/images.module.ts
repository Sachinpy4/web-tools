import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ImagesController } from './controllers/images.controller';
import { ImageService } from './services/image.service';
import { QueueService } from './services/queue.service';
import { SystemSettings, SystemSettingsSchema } from '../admin/schemas/system-settings.schema';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
    MonitoringModule,
    CommonModule,
  ],
  controllers: [ImagesController],
  providers: [ImageService, QueueService],
  exports: [ImageService, QueueService],
})
export class ImagesModule {} 