import mongoose from 'mongoose';
import logger from '../utils/logger';

// Schema for job tracking
const jobSchema = new mongoose.Schema({
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
const JobTracking = mongoose.models.JobTracking || mongoose.model('JobTracking', jobSchema);

/**
 * Record a job completion in the database for monitoring purposes
 * @param jobType Type of job (compress, resize, convert, crop)
 * @param processingTime Time taken in milliseconds
 * @param status Status of the job (completed or failed)
 */
export async function recordJobCompletion(
  jobType: 'compress' | 'resize' | 'convert' | 'crop',
  processingTime: number,
  status: 'completed' | 'failed'
): Promise<void> {
  try {
    // Only record if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      logger.warn(`Cannot record job stats: MongoDB not connected (readyState: ${mongoose.connection.readyState})`);
      return;
    }

    // Create and save a new job record
    await JobTracking.create({
      jobType,
      processingTime,
      status,
      createdAt: new Date()
    });

    logger.debug(`Recorded ${status} ${jobType} job (${processingTime}ms) for monitoring`);
  } catch (error) {
    // Just log the error but don't fail the operation
    logger.error(`Failed to record job stats: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the JobTracking model for direct queries
 */
export function getJobTrackingModel() {
  return JobTracking;
} 