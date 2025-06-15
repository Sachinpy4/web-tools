"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SystemSettingsSchema = new mongoose_1.default.Schema({
    // Worker & Processing Settings
    workerConcurrency: {
        type: Number,
        default: 25,
        min: [1, 'Worker concurrency must be at least 1'],
        max: [100, 'Worker concurrency cannot exceed 100']
    },
    maxLoadThreshold: {
        type: Number,
        default: 0.9,
        min: [0.1, 'Load threshold must be at least 0.1'],
        max: [1.0, 'Load threshold cannot exceed 1.0']
    },
    maxMemoryUsagePercent: {
        type: Number,
        default: 90,
        min: [50, 'Memory usage threshold must be at least 50%'],
        max: [99, 'Memory usage threshold cannot exceed 99%']
    },
    degradationCooldownMs: {
        type: Number,
        default: 15000,
        min: [1000, 'Cooldown must be at least 1 second'],
        max: [300000, 'Cooldown cannot exceed 5 minutes']
    },
    // Rate Limiting Settings
    imageProcessingMaxRequests: {
        type: Number,
        default: 50,
        min: [1, 'Must allow at least 1 request'],
        max: [1000, 'Cannot exceed 1000 requests per window']
    },
    imageProcessingWindowMs: {
        type: Number,
        default: 300000, // 5 minutes
        min: [60000, 'Window must be at least 1 minute'],
        max: [3600000, 'Window cannot exceed 1 hour']
    },
    batchOperationMaxRequests: {
        type: Number,
        default: 15,
        min: [1, 'Must allow at least 1 batch operation'],
        max: [100, 'Cannot exceed 100 batch operations per window']
    },
    batchOperationWindowMs: {
        type: Number,
        default: 600000, // 10 minutes
        min: [60000, 'Window must be at least 1 minute'],
        max: [3600000, 'Window cannot exceed 1 hour']
    },
    apiMaxRequests: {
        type: Number,
        default: 1000,
        min: [10, 'Must allow at least 10 API requests'],
        max: [10000, 'Cannot exceed 10000 API requests per window']
    },
    apiWindowMs: {
        type: Number,
        default: 900000, // 15 minutes
        min: [60000, 'Window must be at least 1 minute'],
        max: [3600000, 'Window cannot exceed 1 hour']
    },
    // File Upload Settings
    maxFileSize: {
        type: Number,
        default: 52428800, // 50MB
        min: [1048576, 'Minimum file size is 1MB'],
        max: [104857600, 'Maximum file size is 100MB']
    },
    maxFiles: {
        type: Number,
        default: 10,
        min: [1, 'Must allow at least 1 file'],
        max: [50, 'Cannot exceed 50 files']
    },
    // Cleanup Settings
    processedFileRetentionHours: {
        type: Number,
        default: 48, // 2 days
        min: [1, 'Must retain files for at least 1 hour'],
        max: [720, 'Cannot retain files for more than 30 days']
    },
    archiveFileRetentionHours: {
        type: Number,
        default: 24, // 1 day
        min: [1, 'Must retain archives for at least 1 hour'],
        max: [168, 'Cannot retain archives for more than 7 days']
    },
    tempFileRetentionHours: {
        type: Number,
        default: 2, // 2 hours
        min: [0.5, 'Must retain temp files for at least 30 minutes'],
        max: [48, 'Cannot retain temp files for more than 2 days']
    },
    autoCleanupEnabled: {
        type: Boolean,
        default: true
    },
    cleanupIntervalHours: {
        type: Number,
        default: 6, // Every 6 hours
        min: [1, 'Cleanup interval must be at least 1 hour'],
        max: [72, 'Cleanup interval cannot exceed 72 hours']
    },
    // System Settings
    nodeMemoryLimit: {
        type: Number,
        default: 4096, // 4GB
        min: [1024, 'Memory limit must be at least 1GB'],
        max: [16384, 'Memory limit cannot exceed 16GB']
    },
    jobTimeoutMs: {
        type: Number,
        default: 180000, // 3 minutes
        min: [30000, 'Job timeout must be at least 30 seconds'],
        max: [600000, 'Job timeout cannot exceed 10 minutes']
    },
    jobRetryAttempts: {
        type: Number,
        default: 3,
        min: [1, 'Must allow at least 1 attempt'],
        max: [10, 'Cannot exceed 10 retry attempts']
    }
}, {
    timestamps: true,
    // Ensure only one settings document exists
    collection: 'systemsettings'
});
// Static method to get current settings (create default if none exist)
SystemSettingsSchema.statics.getCurrentSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        // Create default settings
        settings = await this.create({});
    }
    return settings;
};
// Static method to update settings
SystemSettingsSchema.statics.updateSettings = async function (updates) {
    let settings = await this.findOne();
    if (!settings) {
        // Create with updates if no settings exist
        settings = await this.create(updates);
    }
    else {
        // Update existing settings
        Object.assign(settings, updates);
        await settings.save();
    }
    return settings;
};
const SystemSettings = mongoose_1.default.model('SystemSettings', SystemSettingsSchema);
exports.default = SystemSettings;
//# sourceMappingURL=SystemSettings.js.map