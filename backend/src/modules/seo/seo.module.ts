import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeoController } from './controllers/seo.controller';
import { SeoService } from './services/seo.service';
import { PageSeo, PageSeoSchema } from './schemas/page-seo.schema';
import { Blog, BlogSchema } from '../blog/schemas/blog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageSeo.name, schema: PageSeoSchema },
      { name: Blog.name, schema: BlogSchema },
    ]),
  ],
  controllers: [SeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {} 