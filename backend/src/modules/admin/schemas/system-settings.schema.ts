import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemSettingsDocument = SystemSettings & Document;

@Schema({ 
  timestamps: true,
  collection: 'systemsettings'
})
export class SystemSettings {
  // Worker & Processing Settings
  @Prop({
    type: Number,
    default: 30, // Increased for 10K+ traffic handling
    min: [1, 'Worker concurrency must be at least 1'],
    max: [100, 'Worker concurrency cannot exceed 100']
  })
  workerConcurrency: number;

  @Prop({
    type: Number,
    default: 0.9,
    min: [0.1, 'Load threshold must be at least 0.1'],
    max: [1.0, 'Load threshold cannot exceed 1.0']
  })
  maxLoadThreshold: number;

  @Prop({
    type: Number,
    default: 85, // More conservative for high traffic
    min: [50, 'Memory usage threshold must be at least 50%'],
    max: [99, 'Memory usage threshold cannot exceed 99%']
  })
  maxMemoryUsagePercent: number;

  @Prop({
    type: Number,
    default: 15000,
    min: [1000, 'Cooldown must be at least 1 second'],
    max: [300000, 'Cooldown cannot exceed 5 minutes']
  })
  degradationCooldownMs: number;

  // Rate Limiting Settings
  @Prop({
    type: Number,
    default: 100, // Increased for 10K+ daily requests
    min: [1, 'Must allow at least 1 request'],
    max: [1000, 'Cannot exceed 1000 requests per window']
  })
  imageProcessingMaxRequests: number;

  @Prop({
    type: Number,
    default: 300000, // 5 minutes
    min: [60000, 'Window must be at least 1 minute'],
    max: [3600000, 'Window cannot exceed 1 hour']
  })
  imageProcessingWindowMs: number;

  @Prop({
    type: Number,
    default: 25, // Increased for higher traffic
    min: [1, 'Must allow at least 1 batch operation'],
    max: [100, 'Cannot exceed 100 batch operations per window']
  })
  batchOperationMaxRequests: number;

  @Prop({
    type: Number,
    default: 600000, // 10 minutes
    min: [60000, 'Window must be at least 1 minute'],
    max: [3600000, 'Window cannot exceed 1 hour']
  })
  batchOperationWindowMs: number;

  @Prop({
    type: Number,
    default: 1000,
    min: [10, 'Must allow at least 10 API requests'],
    max: [10000, 'Cannot exceed 10000 API requests per window']
  })
  apiMaxRequests: number;

  @Prop({
    type: Number,
    default: 900000, // 15 minutes
    min: [60000, 'Window must be at least 1 minute'],
    max: [3600000, 'Window cannot exceed 1 hour']
  })
  apiWindowMs: number;

  // File Upload Settings
  @Prop({
    type: Number,
    default: 52428800, // 50MB
    min: [1048576, 'Minimum file size is 1MB'],
    max: [104857600, 'Maximum file size is 100MB']
  })
  maxFileSize: number;

  @Prop({
    type: Number,
    default: 10,
    min: [1, 'Must allow at least 1 file'],
    max: [50, 'Cannot exceed 50 files']
  })
  maxFiles: number;

  // Cleanup Settings
  @Prop({
    type: Number,
    default: 24, // 1 day (reduced for high traffic storage management)
    min: [1, 'Must retain files for at least 1 hour'],
    max: [720, 'Cannot retain files for more than 30 days']
  })
  processedFileRetentionHours: number;

  @Prop({
    type: Number,
    default: 24, // 1 day
    min: [1, 'Must retain archives for at least 1 hour'],
    max: [168, 'Cannot retain archives for more than 7 days']
  })
  archiveFileRetentionHours: number;

  @Prop({
    type: Number,
    default: 2, // 2 hours
    min: [0.5, 'Must retain temp files for at least 30 minutes'],
    max: [48, 'Cannot retain temp files for more than 2 days']
  })
  tempFileRetentionHours: number;

  @Prop({
    type: Boolean,
    default: true
  })
  autoCleanupEnabled: boolean;

  @Prop({
    type: Number,
    default: 3, // Every 3 hours (more frequent for high traffic)
    min: [1, 'Cleanup interval must be at least 1 hour'],
    max: [72, 'Cleanup interval cannot exceed 72 hours']
  })
  cleanupIntervalHours: number;

  // System Settings
  @Prop({
    type: Number,
    default: 4096, // 4GB
    min: [1024, 'Memory limit must be at least 1GB'],
    max: [16384, 'Memory limit cannot exceed 16GB']
  })
  nodeMemoryLimit: number;

  @Prop({
    type: Number,
    default: 180000, // 3 minutes
    min: [30000, 'Job timeout must be at least 30 seconds'],
    max: [600000, 'Job timeout cannot exceed 10 minutes']
  })
  jobTimeoutMs: number;

  @Prop({
    type: Number,
    default: 3,
    min: [1, 'Must allow at least 1 attempt'],
    max: [10, 'Cannot exceed 10 retry attempts']
  })
  jobRetryAttempts: number;

  // Polling Configuration Settings
  @Prop({
    type: Number,
    default: 2000, // 2 seconds - job status polling
    min: [500, 'Job polling interval must be at least 500ms'],
    max: [30000, 'Job polling interval cannot exceed 30 seconds']
  })
  jobStatusPollingIntervalMs: number;

  @Prop({
    type: Number,
    default: 30000, // 30 seconds - processing mode initial
    min: [5000, 'Processing mode polling interval must be at least 5 seconds'],
    max: [300000, 'Processing mode polling interval cannot exceed 5 minutes']
  })
  processingModePollingIntervalMs: number;

  @Prop({
    type: Number,
    default: 300000, // 5 minutes - processing mode maximum
    min: [30000, 'Processing mode max interval must be at least 30 seconds'],
    max: [900000, 'Processing mode max interval cannot exceed 15 minutes']
  })
  processingModeMaxPollingIntervalMs: number;

  @Prop({
    type: Number,
    default: 60, // 60 attempts (2 minutes with 2s intervals)
    min: [10, 'Must allow at least 10 polling attempts'],
    max: [300, 'Cannot exceed 300 polling attempts']
  })
  maxPollingAttempts: number;

  @Prop({
    type: Boolean,
    default: true
  })
  enableAdaptivePolling: boolean;

  // CRITICAL FIX: BullMQ Queue Management Settings (for job cleanup bug fix)
  @Prop({
    type: Number,
    default: 100, // FIXED: Increased from 10 to prevent "job not found" errors
    min: [10, 'Must keep at least 10 completed jobs'],
    max: [500, 'Cannot keep more than 500 completed jobs']
  })
  queueRemoveOnComplete: number;

  @Prop({
    type: Number,
    default: 50, // FIXED: Increased from 5 to prevent "job not found" errors
    min: [5, 'Must keep at least 5 failed jobs'],
    max: [200, 'Cannot keep more than 200 failed jobs']
  })
  queueRemoveOnFail: number;

  @Prop({
    type: Number,
    default: 86400000, // 24 hours in milliseconds
    min: [3600000, 'Job TTL must be at least 1 hour'],
    max: [604800000, 'Job TTL cannot exceed 7 days']
  })
  queueJobTtlMs: number;

  @Prop({
    type: Number,
    default: 30000, // 30 seconds
    min: [5000, 'Stalled interval must be at least 5 seconds'],
    max: [300000, 'Stalled interval cannot exceed 5 minutes']
  })
  queueStalledIntervalMs: number;

  @Prop({
    type: Number,
    default: 1,
    min: [1, 'Must allow at least 1 stalled attempt'],
    max: [5, 'Cannot exceed 5 stalled attempts']
  })
  queueMaxStalledCount: number;
}

export const SystemSettingsSchema = SchemaFactory.createForClass(SystemSettings);

// Add static methods to the schema
SystemSettingsSchema.statics.getCurrentSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    // Create default settings
    settings = await this.create({});
  }
  
  return settings;
};

SystemSettingsSchema.statics.updateSettings = async function(updates: Partial<SystemSettings>) {
  let settings = await this.findOne();
  
  if (!settings) {
    // Create with updates if no settings exist
    settings = await this.create(updates);
  } else {
    // Update existing settings
    Object.assign(settings, updates);
    await settings.save();
  }
  
  return settings;
}; 