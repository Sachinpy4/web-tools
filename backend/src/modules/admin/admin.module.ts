import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { SchedulerService } from './services/scheduler.service';
import { CleanupService } from './services/cleanup.service';
import { SystemSettings, SystemSettingsSchema } from './schemas/system-settings.schema';
import { SchedulerConfig, SchedulerConfigSchema } from './schemas/scheduler-config.schema';
import { Blog, BlogSchema } from '../blog/schemas/blog.schema';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';
import { Media, MediaSchema } from '../media/schemas/media.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { CommonModule } from '../../common/common.module';
import { ImagesModule } from '../images/images.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    CommonModule,
    MonitoringModule,
    forwardRef(() => ImagesModule),
    MongooseModule.forFeature([
      { name: SystemSettings.name, schema: SystemSettingsSchema },
      { name: SchedulerConfig.name, schema: SchedulerConfigSchema },
      { name: Blog.name, schema: BlogSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Media.name, schema: MediaSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, SchedulerService, CleanupService],
  exports: [AdminService, SchedulerService, CleanupService],
})
export class AdminModule {} 