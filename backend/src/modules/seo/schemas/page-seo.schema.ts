import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PageSeoDocument = PageSeo & Document;

@Schema({ timestamps: true })
export class PageSeo {
  @Prop({
    type: String,
    required: [true, 'Page path is required'],
    unique: true,
    trim: true,
  })
  pagePath: string;

  @Prop({
    type: String,
    enum: ['homepage', 'blog-listing', 'tool', 'about', 'custom'],
    required: [true, 'Page type is required'],
  })
  pageType: 'homepage' | 'blog-listing' | 'tool' | 'about' | 'custom';

  @Prop({
    type: String,
    required: [true, 'Page name is required'],
    trim: true,
  })
  pageName: string;

  @Prop({
    type: String,
    required: [true, 'Meta title is required'],
    maxlength: [70, 'Meta title cannot be more than 70 characters'],
  })
  metaTitle: string;

  @Prop({
    type: String,
    required: [true, 'Meta description is required'],
    maxlength: [160, 'Meta description cannot be more than 160 characters'],
  })
  metaDescription: string;

  @Prop({
    type: [String],
    default: [],
  })
  metaKeywords: string[];

  @Prop({
    type: String,
    trim: true,
  })
  canonicalUrl?: string;

  @Prop({
    type: String,
    trim: true,
  })
  ogImage?: string;

  @Prop({
    type: String,
    default: 'website',
    enum: ['website', 'article', 'product', 'profile'],
  })
  ogType: string;

  @Prop({
    type: String,
    default: 'summary_large_image',
    enum: ['summary', 'summary_large_image', 'app', 'player'],
  })
  twitterCard: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  priority: number;
}

export const PageSeoSchema = SchemaFactory.createForClass(PageSeo);

// Create indexes for better query performance
PageSeoSchema.index({ pageType: 1 });
PageSeoSchema.index({ isActive: 1 });
PageSeoSchema.index({ pagePath: 1, isActive: 1 }); 