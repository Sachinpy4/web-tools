import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @Prop({
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  })
  title: string;

  @Prop({
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  })
  slug: string;

  @Prop({
    required: [true, 'Excerpt is required'],
    maxlength: [300, 'Excerpt cannot be more than 300 characters'],
  })
  excerpt: string;

  @Prop({
    required: [true, 'Content is required'],
  })
  content: string;

  @Prop({
    type: Date,
    default: Date.now,
  })
  date: Date;

  @Prop({
    type: String,
    enum: ['published', 'draft', 'scheduled'],
    default: 'draft',
  })
  status: string;

  @Prop({ type: Date })
  scheduledPublishDate?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required'],
  })
  author: Types.ObjectId;

  @Prop({
    required: [true, 'Category is required'],
  })
  category: string;

  @Prop([String])
  tags: string[];

  @Prop()
  featuredImage?: string;

  @Prop({
    type: Number,
    default: 0,
  })
  views: number;

  @Prop({
    type: Number,
    default: 0,
  })
  likes: number;

  @Prop({
    type: [String],
    default: [],
  })
  likedByIPs: string[];

  @Prop()
  readingTime?: string;

  // SEO metadata fields
  @Prop({
    maxlength: [70, 'Meta title cannot be more than 70 characters'],
  })
  metaTitle?: string;

  @Prop({
    maxlength: [160, 'Meta description cannot be more than 160 characters'],
  })
  metaDescription?: string;

  @Prop([String])
  metaKeywords?: string[];

  @Prop()
  canonicalUrl?: string;

  @Prop()
  ogImage?: string;

  // Analytics fields
  @Prop([Number])
  pageViews?: number[];

  @Prop({
    type: Number,
    default: 0,
  })
  uniqueVisitors?: number;

  @Prop([String])
  visitorIPs?: string[];

  @Prop({
    type: Number,
    default: 0,
  })
  averageTimeOnPage?: number;

  @Prop({
    type: Number,
    default: 0,
  })
  bounceRate?: number;

  // Comment settings
  @Prop({
    type: Boolean,
    default: true,
  })
  commentsEnabled: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  requireCommentApproval: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  limitCommentsPerIp: boolean;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);

// Create slug from title
BlogSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
    
    this.slug = baseSlug;
  }
  
  // Calculate reading time
  if (this.content) {
    const words = this.content.trim().split(/\s+/).length;
    const wordsPerMinute = 200;
    const minutes = Math.ceil(words / wordsPerMinute);
    this.readingTime = `${minutes} min read`;
  }
  
  // Set SEO defaults
  if (this.title && !this.metaTitle) {
    this.metaTitle = this.title;
  }
  
  if (this.excerpt && !this.metaDescription) {
    this.metaDescription = this.excerpt;
  }
  
  next();
});

// Handle slug collisions
BlogSchema.pre('save', async function (next) {
  if (this.isModified('slug')) {
    const baseSlug = this.slug;
    let slugToCheck = baseSlug;
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique) {
      const existingDoc = await (this.constructor as any).findOne({
        slug: slugToCheck,
        _id: { $ne: this._id }
      });
      
      if (!existingDoc) {
        isUnique = true;
      } else {
        slugToCheck = `${baseSlug}-${counter}`;
        counter++;
      }
      
      if (counter > 100) {
        slugToCheck = `${baseSlug}-${Date.now().toString().slice(-6)}`;
        isUnique = true;
      }
    }
    
    this.slug = slugToCheck;
  }
  
  next();
});

// Database indexes
BlogSchema.index({ status: 1 });
BlogSchema.index({ date: -1 });
BlogSchema.index({ views: -1 });
BlogSchema.index({ category: 1 });
BlogSchema.index({ author: 1 });
BlogSchema.index({ status: 1, date: -1 });
BlogSchema.index({ 
  title: 'text', 
  excerpt: 'text', 
  content: 'text',
  tags: 'text'
}, {
  weights: { title: 10, excerpt: 5, tags: 3, content: 1 }
}); 