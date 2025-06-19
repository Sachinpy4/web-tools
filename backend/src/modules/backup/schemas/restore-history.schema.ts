import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RestoreHistoryDocument = RestoreHistory & Document;

@Schema({
  timestamps: true,
  collection: 'restorehistory',
  suppressReservedKeysWarning: true,
})
export class RestoreHistory {
  @Prop({ type: Types.ObjectId, ref: 'BackupHistory' })
  sourceBackupId?: Types.ObjectId; // Reference to backup if restored from existing backup

  @Prop({ maxlength: 200 })
  sourceBackupName?: string; // Backup filename for reference

  @Prop({
    required: true,
    enum: ['existing_backup', 'uploaded_file'],
  })
  sourceType: 'existing_backup' | 'uploaded_file'; // How the restore was performed

  @Prop({ maxlength: 200 })
  uploadedFileName?: string; // Original name of uploaded file

  @Prop({
    required: true,
    enum: ['full', 'selective'],
  })
  restoreType: 'full' | 'selective'; // Based on what was restored

  @Prop({ type: [String], required: true })
  collectionsRestored: string[];

  @Prop({ type: [String], default: [] })
  collectionsSkipped: string[];

  @Prop({ required: true, default: false })
  overwriteMode: boolean; // Whether it overwrote existing data

  @Prop({ type: Types.ObjectId, ref: 'BackupHistory' })
  safetyBackupId?: Types.ObjectId; // Reference to safety backup created before restore

  @Prop({ required: true, min: 0, default: 0 })
  totalDocumentsRestored: number;

  @Prop({
    required: true,
    enum: ['in_progress', 'completed', 'failed', 'cancelled'],
    default: 'in_progress',
  })
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';

  @Prop({ required: true, default: Date.now })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ required: true, maxlength: 100 })
  restoredBy: string; // admin user email

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop({ maxlength: 2000 })
  errorMessage?: string;

  @Prop({
    type: {
      backupType: String,
      backupTimestamp: String,
      estimatedSize: String,
      errorMessages: [String],
    },
  })
  details?: {
    backupType?: string;
    backupTimestamp?: string;
    estimatedSize?: string;
    errorMessages?: string[];
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const RestoreHistorySchema = SchemaFactory.createForClass(RestoreHistory);

// Indexes for better query performance
RestoreHistorySchema.index({ createdAt: -1 });
RestoreHistorySchema.index({ status: 1 });
RestoreHistorySchema.index({ restoredBy: 1 });
RestoreHistorySchema.index({ sourceBackupId: 1 });

// Virtual for duration in human readable format
RestoreHistorySchema.virtual('duration').get(function() {
  if (this.completedAt && this.startedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return 0;
});

RestoreHistorySchema.virtual('durationFormatted').get(function() {
  const duration = this.completedAt && this.startedAt 
    ? this.completedAt.getTime() - this.startedAt.getTime() 
    : 0;
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  if (duration < 3600000) return `${(duration / 60000).toFixed(1)}m`;
  return `${(duration / 3600000).toFixed(1)}h`;
});

// Ensure virtuals are included in JSON output
RestoreHistorySchema.set('toJSON', { virtuals: true });
RestoreHistorySchema.set('toObject', { virtuals: true }); 