"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const BackupHistorySchema = new mongoose_1.default.Schema({
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
BackupHistorySchema.statics.getRecentBackups = async function (limit = 10) {
    return this.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
// Static method to cleanup old backup records
BackupHistorySchema.statics.cleanupOldRecords = async function (retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['completed', 'failed'] }
    });
    return result.deletedCount || 0;
};
// Instance method to mark as completed
BackupHistorySchema.methods.markCompleted = function (size) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.size = size;
    return this.save();
};
// Instance method to mark as failed
BackupHistorySchema.methods.markFailed = function (errorMessage) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.errorMessage = errorMessage;
    return this.save();
};
const BackupHistory = mongoose_1.default.model('BackupHistory', BackupHistorySchema);
exports.default = BackupHistory;
//# sourceMappingURL=BackupHistory.js.map