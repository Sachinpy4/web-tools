import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BackupHistoryDocument = BackupHistory & Document;

@Schema({
  timestamps: true,
  collection: 'backuphistories',
})
export class BackupHistory {
  @Prop({ required: true, maxlength: 200 })
  filename: string;

  @Prop({ required: true, maxlength: 500 })
  filepath: string;

  @Prop({ required: true })
  size: number; // File size in bytes

  @Prop({
    required: true,
    enum: ['full', 'incremental', 'selective'],
    default: 'full',
  })
  type: 'full' | 'incremental' | 'selective';

  @Prop({
    required: true,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'in-progress' | 'completed' | 'failed';

  @Prop({ maxlength: 1000 })
  description?: string;

  @Prop({ maxlength: 2000 })
  errorMessage?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  duration: number; // Duration in milliseconds

  @Prop({
    type: {
      collections: [String],
      totalDocuments: Number,
      totalSize: Number,
      compression: String,
    },
  })
  metadata?: {
    collections: string[];
    totalDocuments: number;
    totalSize: number;
    compression: string;
  };

  @Prop({ default: false })
  isRestored: boolean;

  @Prop()
  restoredAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  restoredBy?: Types.ObjectId;

  @Prop({ maxlength: 1000 })
  restoreNotes?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const BackupHistorySchema = SchemaFactory.createForClass(BackupHistory);

// Indexes for better query performance
BackupHistorySchema.index({ status: 1 });
BackupHistorySchema.index({ type: 1 });
BackupHistorySchema.index({ createdAt: -1 });
BackupHistorySchema.index({ createdBy: 1 });
BackupHistorySchema.index({ isDeleted: 1 });

// Virtual for file size in human readable format
BackupHistorySchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for duration in human readable format
BackupHistorySchema.virtual('durationFormatted').get(function() {
  const ms = this.duration;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
});

// Ensure virtuals are included in JSON output
BackupHistorySchema.set('toJSON', { virtuals: true });
BackupHistorySchema.set('toObject', { virtuals: true }); 