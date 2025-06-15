"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const RestoreHistorySchema = new mongoose_1.default.Schema({
    sourceBackupId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        type: mongoose_1.default.Schema.Types.Mixed
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
RestoreHistorySchema.statics.getRecentRestores = async function (limit = 10) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sourceBackupId', 'filename originalName type')
        .populate('safetyBackupId', 'filename originalName')
        .lean();
};
// Static method to cleanup old restore records
RestoreHistorySchema.statics.cleanupOldRecords = async function (retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['completed', 'failed'] }
    });
    return result.deletedCount || 0;
};
// Instance method to mark as completed
RestoreHistorySchema.methods.markCompleted = function (results) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.collectionsRestored = results.collectionsRestored;
    this.collectionsSkipped = results.collectionsSkipped;
    this.totalDocumentsRestored = results.totalDocumentsRestored;
    this.details = results.details;
    return this.save();
};
// Instance method to mark as failed
RestoreHistorySchema.methods.markFailed = function (errorMessage) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.errorMessage = errorMessage;
    return this.save();
};
const RestoreHistory = mongoose_1.default.model('RestoreHistory', RestoreHistorySchema);
exports.default = RestoreHistory;
//# sourceMappingURL=RestoreHistory.js.map