import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CommentModule } from '../comments/comment.module';
import { BlogController } from './controllers/blog.controller';
import { BlogService } from './services/blog.service';
import { BlogCacheService } from './services/blog-cache.service';
import { Blog, BlogSchema } from './schemas/blog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }]),
    AuthModule,
    forwardRef(() => CommentModule),
  ],
  controllers: [BlogController],
  providers: [BlogService, BlogCacheService],
  exports: [BlogService, BlogCacheService],
})
export class BlogModule {} 