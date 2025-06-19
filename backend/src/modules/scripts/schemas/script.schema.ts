import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScriptDocument = Script & Document;

@Schema({ timestamps: true })
export class Script {
  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: String,
    required: true,
    validate: {
      validator: function(content: string) {
        // Basic validation to ensure it contains script tags or valid JavaScript
        return content.includes('<script') || content.trim().length > 0;
      },
      message: 'Script content must be valid JavaScript or HTML script tags',
    },
  })
  content: string;

  @Prop({
    type: String,
    required: true,
    enum: ['head', 'body', 'footer'],
    default: 'head',
  })
  placement: 'head' | 'body' | 'footer';

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: String,
    required: true,
    enum: [
      'Google Analytics',
      'Google Tag Manager',
      'Facebook Pixel',
      'Google Ads',
      'LinkedIn Insight',
      'Twitter Pixel',
      'TikTok Pixel',
      'Hotjar',
      'Mixpanel',
      'Custom',
    ],
    default: 'Custom',
  })
  platform: string;

  @Prop({
    type: Number,
    default: 100,
    min: 1,
    max: 1000,
  })
  priority: number;

  @Prop({
    type: [String],
    default: [], // Empty array means all public pages
  })
  targetPages: string[];

  @Prop({
    type: [String],
    default: ['/admin', '/dashboard'], // Always exclude admin by default
  })
  excludePages: string[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy?: Types.ObjectId;
}

export const ScriptSchema = SchemaFactory.createForClass(Script);

// Indexes for better query performance
ScriptSchema.index({ isActive: 1, placement: 1, priority: 1 });
ScriptSchema.index({ platform: 1 });
ScriptSchema.index({ createdBy: 1 }); 