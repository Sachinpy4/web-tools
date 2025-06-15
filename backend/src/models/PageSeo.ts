import mongoose from 'mongoose';

export interface IPageSeo extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  pagePath: string; // e.g., '/', '/blog', '/image/compress', etc.
  pageType: 'homepage' | 'blog-listing' | 'tool' | 'about' | 'custom';
  pageName: string; // Human readable name for admin
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType: string;
  twitterCard: string;
  isActive: boolean;
  priority: number; // For ordering in admin
  createdAt: Date;
  updatedAt: Date;
}

const PageSeoSchema = new mongoose.Schema<IPageSeo>(
  {
    pagePath: {
      type: String,
      required: [true, 'Page path is required'],
      unique: true,
      trim: true,
    },
    pageType: {
      type: String,
      enum: ['homepage', 'blog-listing', 'tool', 'about', 'custom'],
      required: [true, 'Page type is required'],
    },
    pageName: {
      type: String,
      required: [true, 'Page name is required'],
      trim: true,
    },
    metaTitle: {
      type: String,
      required: [true, 'Meta title is required'],
      maxlength: [70, 'Meta title cannot be more than 70 characters'],
    },
    metaDescription: {
      type: String,
      required: [true, 'Meta description is required'],
      maxlength: [160, 'Meta description cannot be more than 160 characters'],
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    canonicalUrl: {
      type: String,
      trim: true,
    },
    ogImage: {
      type: String,
      trim: true,
    },
    ogType: {
      type: String,
      default: 'website',
      enum: ['website', 'article', 'product', 'profile'],
    },
    twitterCard: {
      type: String,
      default: 'summary_large_image',
      enum: ['summary', 'summary_large_image', 'app', 'player'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for faster queries
// Note: pagePath index is already defined as unique in schema, so we don't need to duplicate it here
PageSeoSchema.index({ pageType: 1 });
PageSeoSchema.index({ isActive: 1 });

export default mongoose.model<IPageSeo>('PageSeo', PageSeoSchema); 