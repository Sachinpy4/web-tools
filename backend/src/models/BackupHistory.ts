import mongoose from 'mongoose';

export interface IBackupHistory extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  
  // Backup metadata
  filename: string;
  filePath: string;
  originalName: string;
  
  // Backup details
  type: 'full' | 'incremental' | 'selective';
  collections: string[];
  size: number; // in bytes
  
  // Status and timing
  status: 'creating' | 'completed' | 'failed' | 'deleted';
  startedAt: Date;
  completedAt?: Date;
  
  // Additional info
  createdBy: string; // admin user email
  description?: string;
  errorMessage?: string;
  deletedAt?: Date; // When the backup was deleted
  
  // File info
  compression: boolean;
  encryption: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markCompleted(size: number): Promise<IBackupHistory>;
  markFailed(errorMessage: string): Promise<IBackupHistory>;
}

const BackupHistorySchema = new mongoose.Schema<IBackupHistory>({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  filePath: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  
  type: {
    type: String,
    enum: ['full', 'incremental', 'selective'],
    default: 'full',
    required: true
  },
  collections: [{
    type: String,
    required: true
  }],
  size: {
    type: Number,
    required: true,
    min: 0
  },
  
  status: {
    type: String,
    enum: ['creating', 'completed', 'failed', 'deleted'],
    default: 'creating',
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
  
  createdBy: {
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
  deletedAt: {
    type: Date
  },
  
  compression: {
    type: Boolean,
    default: true
  },
  encryption: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'backuphistory'
});

// Add indexes for better performance
BackupHistorySchema.index({ createdAt: -1 });
BackupHistorySchema.index({ status: 1 });
BackupHistorySchema.index({ type: 1 });
BackupHistorySchema.index({ createdBy: 1 });

// Static method to get recent backups
BackupHistorySchema.statics.getRecentBackups = async function(limit: number = 10): Promise<IBackupHistory[]> {
  return this.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to cleanup old backup records
BackupHistorySchema.statics.cleanupOldRecords = async function(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'failed'] }
  });
  
  return result.deletedCount || 0;
};

// Instance method to mark as completed
BackupHistorySchema.methods.markCompleted = function(size: number) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.size = size;
  return this.save();
};

// Instance method to mark as failed
BackupHistorySchema.methods.markFailed = function(errorMessage: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  return this.save();
};

// Add interface for static methods
interface BackupHistoryModel extends mongoose.Model<IBackupHistory> {
  getRecentBackups(limit?: number): Promise<IBackupHistory[]>;
  cleanupOldRecords(retentionDays?: number): Promise<number>;
}

const BackupHistory = mongoose.model<IBackupHistory, BackupHistoryModel>('BackupHistory', BackupHistorySchema);

export default BackupHistory; 