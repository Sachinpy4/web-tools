"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordJobCompletion = recordJobCompletion;
exports.getJobTrackingModel = getJobTrackingModel;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
// Schema for job tracking
const jobSchema = new mongoose_1.default.Schema({
    jobType: {
        type: String,
        required: true,
        enum: ['compress', 'resize', 'convert', 'crop']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processingTime: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['completed', 'failed']
    }
});
// Create model if it doesn't exist
const JobTracking = mongoose_1.default.models.JobTracking || mongoose_1.default.model('JobTracking', jobSchema);
/**
 * Record a job completion in the database for monitoring purposes
 * @param jobType Type of job (compress, resize, convert, crop)
 * @param processingTime Time taken in milliseconds
 * @param status Status of the job (completed or failed)
 */
async function recordJobCompletion(jobType, processingTime, status) {
    try {
        // Only record if mongoose is connected
        if (mongoose_1.default.connection.readyState !== 1) {
            logger_1.default.warn(`Cannot record job stats: MongoDB not connected (readyState: ${mongoose_1.default.connection.readyState})`);
            return;
        }
        // Create and save a new job record
        await JobTracking.create({
            jobType,
            processingTime,
            status,
            createdAt: new Date()
        });
        logger_1.default.debug(`Recorded ${status} ${jobType} job (${processingTime}ms) for monitoring`);
    }
    catch (error) {
        // Just log the error but don't fail the operation
        logger_1.default.error(`Failed to record job stats: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Get the JobTracking model for direct queries
 */
function getJobTrackingModel() {
    return JobTracking;
}
//# sourceMappingURL=jobTrackingService.js.map