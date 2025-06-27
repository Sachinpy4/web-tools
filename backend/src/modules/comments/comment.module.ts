import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Blog, BlogSchema } from '../blog/schemas/blog.schema';
import { AuthModule } from '../auth/auth.module';
import { BlogCacheService } from '../blog/services/blog-cache.service';
import { RedisStatusService } from '../../common/services/redis-status.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Blog.name, schema: BlogSchema },
    ]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [CommentController],
  providers: [
    CommentService,
    BlogCacheService,
    RedisStatusService,
    {
      provide: 'CommentService',
      useExisting: CommentService,
    },
    {
      provide: 'BlogCacheService',
      useExisting: BlogCacheService,
    },
  ],
  exports: [CommentService, 'CommentService'],
})
export class CommentModule {} 