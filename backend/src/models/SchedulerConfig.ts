import mongoose from 'mongoose';

export interface ISchedulerConfig extends mongoose.Document {
  type: 'images' | 'logs' | 'cache' | 'database' | 'memory';
  enabled: boolean;
  hour: number;
  minute: number;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schedulerConfigSchema = new mongoose.Schema<ISchedulerConfig>({
  type: {
    type: String,
    enum: ['images', 'logs', 'cache', 'database', 'memory'],
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    default: false,
    required: true
  },
  hour: {
    type: Number,
    min: 0,
    max: 23,
    required: true
  },
  minute: {
    type: Number,
    min: 0,
    max: 59,
    required: true
  },
  lastRun: {
    type: Date,
    default: null
  },
  nextRun: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
schedulerConfigSchema.index({ type: 1 });
schedulerConfigSchema.index({ enabled: 1 });

const SchedulerConfig = mongoose.model<ISchedulerConfig>('SchedulerConfig', schedulerConfigSchema);

export default SchedulerConfig; 