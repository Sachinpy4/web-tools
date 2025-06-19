import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Blog, BlogSchema } from '../blog/schemas/blog.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Blog.name, schema: BlogSchema },
    ]),
    AuthModule,
  ],
  controllers: [CommentController],
  providers: [
    CommentService,
    {
      provide: 'CommentService',
      useExisting: CommentService,
    },
  ],
  exports: [CommentService, 'CommentService'],
})
export class CommentModule {} 