import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({
    type: Types.ObjectId,
    ref: 'Blog',
    required: [true, 'Blog post reference is required'],
    index: true,
  })
  blog: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  user?: Types.ObjectId;

  @Prop({
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  })
  name: string;

  @Prop({
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  })
  email: string;

  @Prop({
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot be more than 1000 characters'],
  })
  text: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  approved: boolean;

  @Prop({
    required: true,
  })
  ipAddress: string;

  @Prop([{
    type: Types.ObjectId,
    ref: 'Comment',
  }])
  replies?: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'Comment',
    default: null,
  })
  parent?: Types.ObjectId;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Create compound index for IP address + blog post for limiting comments per IP
CommentSchema.index({ ipAddress: 1, blog: 1 });
CommentSchema.index({ blog: 1, approved: 1 });
CommentSchema.index({ parent: 1 });
CommentSchema.index({ createdAt: -1 }); 