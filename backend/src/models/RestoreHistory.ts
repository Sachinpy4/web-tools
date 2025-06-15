import mongoose from 'mongoose';

export interface IRestoreHistory extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  
  // Restore metadata
  sourceBackupId?: mongoose.Types.ObjectId; // Reference to backup if restored from existing backup
  sourceBackupName?: string; // Backup filename for reference
  sourceType: 'existing_backup' | 'uploaded_file'; // How the restore was performed
  uploadedFileName?: string; // Original name of uploaded file
  
  // Restore details
  restoreType: 'full' | 'selective'; // Based on what was restored
  collectionsRestored: string[];
  collectionsSkipped: string[];
  
  // Operation details
  overwriteMode: boolean; // Whether it overwrote existing data
  safetyBackupId?: mongoose.Types.ObjectId; // Reference to safety backup created before restore
  totalDocumentsRestored: number;
  
  // Status and timing
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  
  // User and context
  restoredBy: string; // admin user email
  description?: string;
  errorMessage?: string;
  
  // Results summary
  details?: {
    backupType?: string;
    backupTimestamp?: string;
    estimatedSize?: string;
    errors?: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markCompleted(results: {
    collectionsRestored: string[];
    collectionsSkipped: string[];
    totalDocumentsRestored: number;
    details?: any;
  }): Promise<IRestoreHistory>;
  markFailed(errorMessage: string): Promise<IRestoreHistory>;
}

const RestoreHistorySchema = new mongoose.Schema<IRestoreHistory>({
  sourceBackupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BackupHistory'
  },
  sourceBackupName: {
    type: String,
    trim: true
  },
  sourceType: {
    type: String,
    enum: ['existing_backup', 'uploaded_file'],
    required: true
  },
  uploadedFileName: {
    type: String,
    trim: true
  },
  
  restoreType: {
    type: String,
    enum: ['full', 'selective'],
    required: true
  },
  collectionsRestored: [{
    type: String,
    required: true
  }],
  collectionsSkipped: [{
    type: String
  }],
  
  overwriteMode: {
    type: Boolean,
    required: true,
    default: false
  },
  safetyBackupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BackupHistory'
  },
  totalDocumentsRestored: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed', 'cancelled'],
    default: 'in_progress',
    required: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  
  restoredBy: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  errorMessage: {
    type: String,
    trim: true
  },
  
  details: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'restorehistory'
});

// Add indexes for better performance
RestoreHistorySchema.index({ createdAt: -1 });
RestoreHistorySchema.index({ status: 1 });
RestoreHistorySchema.index({ restoredBy: 1 });
RestoreHistorySchema.index({ sourceBackupId: 1 });

// Static method to get recent restores
RestoreHistorySchema.statics.getRecentRestores = async function(limit: number = 10): Promise<IRestoreHistory[]> {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sourceBackupId', 'filename originalName type')
    .populate('safetyBackupId', 'filename originalName')
    .lean();
};

// Static method to cleanup old restore records
RestoreHistorySchema.statics.cleanupOldRecords = async function(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'failed'] }
  });
  
  return result.deletedCount || 0;
};

// Instance method to mark as completed
RestoreHistorySchema.methods.markCompleted = function(results: {
  collectionsRestored: string[];
  collectionsSkipped: string[];
  totalDocumentsRestored: number;
  details?: any;
}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.collectionsRestored = results.collectionsRestored;
  this.collectionsSkipped = results.collectionsSkipped;
  this.totalDocumentsRestored = results.totalDocumentsRestored;
  this.details = results.details;
  return this.save();
};

// Instance method to mark as failed
RestoreHistorySchema.methods.markFailed = function(errorMessage: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  return this.save();
};

// Add interface for static methods
interface RestoreHistoryModel extends mongoose.Model<IRestoreHistory> {
  getRecentRestores(limit?: number): Promise<IRestoreHistory[]>;
  cleanupOldRecords(retentionDays?: number): Promise<number>;
}

const RestoreHistory = mongoose.model<IRestoreHistory, RestoreHistoryModel>('RestoreHistory', RestoreHistorySchema);

export default RestoreHistory; 