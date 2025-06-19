import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobTrackingDocument = JobTracking & Document;

@Schema({
  timestamps: true,
  collection: 'jobtrackings',
})
export class JobTracking {
  @Prop({
    required: true,
    enum: ['compress', 'resize', 'convert', 'crop'],
  })
  jobType: 'compress' | 'resize' | 'convert' | 'crop';

  @Prop({ required: true })
  processingTime: number; // Time taken in milliseconds

  @Prop({
    required: true,
    enum: ['completed', 'failed'],
  })
  status: 'completed' | 'failed';

  @Prop({ default: Date.now })
  createdAt: Date;

  // Additional fields for enhanced monitoring
  @Prop()
  fileSize?: number; // Original file size in bytes

  @Prop()
  outputSize?: number; // Output file size in bytes

  @Prop()
  compressionRatio?: number; // For compression jobs

  @Prop()
  errorMessage?: string; // For failed jobs

  @Prop()
  userAgent?: string; // Client information

  @Prop()
  ipAddress?: string; // Client IP (anonymized)
}

export const JobTrackingSchema = SchemaFactory.createForClass(JobTracking);

// Indexes for better query performance
JobTrackingSchema.index({ jobType: 1 });
JobTrackingSchema.index({ status: 1 });
JobTrackingSchema.index({ createdAt: -1 });
JobTrackingSchema.index({ jobType: 1, createdAt: -1 });
JobTrackingSchema.index({ jobType: 1, status: 1 }); 