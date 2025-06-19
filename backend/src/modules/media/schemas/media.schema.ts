import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ timestamps: true })
export class Media {
  @Prop({
    required: [true, 'Filename is required'],
    trim: true,
  })
  filename: string;

  @Prop({
    required: [true, 'Original name is required'],
    trim: true,
  })
  originalname: string;

  @Prop({
    required: [true, 'File path is required'],
  })
  path: string;

  @Prop({
    required: [true, 'URL is required'],
  })
  url: string;

  @Prop({
    required: [true, 'File size is required'],
  })
  size: number;

  @Prop({
    required: [true, 'MIME type is required'],
  })
  mimetype: string;

  @Prop({
    trim: true,
  })
  alt?: string;

  @Prop({
    trim: true,
  })
  title?: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop([String])
  tags?: string[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader information is required'],
  })
  uploadedBy: Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
  })
  uses: number;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

// Add text indexes for search
MediaSchema.index({ 
  originalname: 'text', 
  alt: 'text', 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

// Add indexes for filtering
MediaSchema.index({ mimetype: 1 });
MediaSchema.index({ uploadedBy: 1 });
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ uses: -1 }); 