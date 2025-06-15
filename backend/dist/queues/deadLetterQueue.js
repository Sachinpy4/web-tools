"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToDeadLetterQueue = addToDeadLetterQueue;
exports.cleanupDeadLetterQueue = cleanupDeadLetterQueue;
exports.retryDeadLetterJob = retryDeadLetterJob;
const bull_1 = __importDefault(require("bull"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../config/redis");
// Flag to prevent repeated error logging
let redisErrorLogged = false;
// Flag to track if the queue is available
let deadLetterQueueAvailable = false;
// Flag to track if we're in the process of reinitializing
let reinitializing = false;
// Declare queue variable first, initialize it only when Redis is confirmed available
let deadLetterQueue = null;
// Function to initialize the dead letter queue
async function initDeadLetterQueue() {
    try {
        // Check Redis availability first
        const redisAvailable = await (0, redis_1.testRedisConnection)();
        if (!redisAvailable) {
            if (!redisErrorLogged) {
                logger_1.default.warn('Redis unavailable - dead letter queue will not be initialized');
                redisErrorLogged = true;
            }
            deadLetterQueueAvailable = false;
            return null;
        }
        // Reset error logged flag
        redisErrorLogged = false;
        // Get Redis host from environment (ensures consistency with other Redis connections)
        const redisHost = process.env.REDIS_HOST || 'localhost';
        // Log what host we're using
        logger_1.default.info(`Initializing dead letter queue with Redis host: ${redisHost}`);
        // Define the Redis connection options
        if (process.env.REDIS_PASSWORD) {
            // Use Redis URI format if password is provided
            const redisUri = `redis://${process.env.REDIS_USERNAME ? process.env.REDIS_USERNAME + ':' : ''}${process.env.REDIS_PASSWORD}@${redisHost}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`;
            logger_1.default.info('Using Redis URI format with authentication for dead letter queue');
            // Define the dead letter queue with Redis URI
            const queue = new bull_1.default('dead-letter-queue', redisUri, {
                defaultJobOptions: {
                    attempts: 1, // Don't retry jobs in the DLQ
                    removeOnComplete: false, // Keep completed jobs for auditing
                    removeOnFail: false, // Keep failed jobs for auditing
                }
            });
            // Handle events
            setupQueueEvents(queue);
            deadLetterQueueAvailable = true;
            logger_1.default.info('Dead letter queue initialized successfully with Redis URI');
            return queue;
        }
        else {
            // Define the dead letter queue with Redis options
            const queue = new bull_1.default('dead-letter-queue', {
                redis: {
                    host: redisHost,
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    maxRetriesPerRequest: 1, // Reduce retries
                    retryStrategy: (times) => {
                        // Quickly fail after 1 retry
                        if (times >= 1) {
                            if (!redisErrorLogged) {
                                logger_1.default.warn('Redis connection failed - dead letter queue will use fallback mode');
                                redisErrorLogged = true;
                            }
                            deadLetterQueueAvailable = false;
                            return null; // Stop retrying
                        }
                        return 100; // Retry once after 100ms
                    },
                    // Add connection timeout
                    connectTimeout: 3000,
                },
                defaultJobOptions: {
                    attempts: 1, // Don't retry jobs in the DLQ
                    removeOnComplete: false, // Keep completed jobs for auditing
                    removeOnFail: false, // Keep failed jobs for auditing
                }
            });
            // Setup event handlers for the queue
            setupQueueEvents(queue);
            deadLetterQueueAvailable = true;
            logger_1.default.info('Dead letter queue initialized successfully with Redis options');
            return queue;
        }
    }
    catch (error) {
        if (!redisErrorLogged) {
            logger_1.default.error(`Failed to initialize dead letter queue: ${error.message}`);
            redisErrorLogged = true;
        }
        deadLetterQueueAvailable = false;
        return null;
    }
}
// Function to set up queue event handlers
function setupQueueEvents(queue) {
    queue.on('error', (error) => {
        // Check if this is a connection error
        if (error.message.includes('ECONNREFUSED') ||
            error.message.includes('ECONNABORTED') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('Connection is closed') ||
            error.message.includes('ended') ||
            error.message.includes('connection')) {
            // Log only once
            if (!redisErrorLogged) {
                logger_1.default.error(`Dead letter queue error: ${error.message}`);
                redisErrorLogged = true;
                deadLetterQueueAvailable = false;
            }
            // Close the queue connection to prevent further errors
            try {
                queue.close().catch(() => { });
            }
            catch (closeError) {
                // Ignore errors during close
            }
            return;
        }
        // For other types of errors, always log
        logger_1.default.error(`Dead letter queue error: ${error.message}`);
    });
    queue.on('completed', (job) => {
        logger_1.default.info(`Dead letter job ${job.id} processed successfully`);
    });
    // Dead letter queue processor
    queue.process(async (job) => {
        try {
            // Log the dead job
            logger_1.default.error(`Processing dead letter job ${job.id}: ${JSON.stringify(job.data.error)}`);
            // Store job failure info to a file for auditing
            const failureRecord = {
                id: job.id,
                originalQueue: job.data.originalQueue,
                originalJobId: job.data.originalJobId,
                timestamp: new Date().toISOString(),
                error: job.data.error,
                data: job.data.originalData
            };
            // Ensure the audit directory exists
            const auditDir = path_1.default.join(__dirname, '../../logs/failed-jobs');
            if (!fs_1.default.existsSync(auditDir)) {
                fs_1.default.mkdirSync(auditDir, { recursive: true });
            }
            // Write the failure record
            const logFile = path_1.default.join(auditDir, `job-${(0, uuid_1.v4)()}.json`);
            fs_1.default.writeFileSync(logFile, JSON.stringify(failureRecord, null, 2));
            // You might want to implement additional recovery logic here
            // such as notifying admins, attempting an alternative processing strategy, etc.
            logger_1.default.info(`Dead letter job ${job.id} processed and recorded to ${logFile}`);
            return { status: 'logged', logFile };
        }
        catch (error) {
            logger_1.default.error(`Failed to process dead letter job ${job.id}: ${error.message}`);
            throw error;
        }
    });
}
// Initialize the queue on module load
initDeadLetterQueue().then(queue => {
    deadLetterQueue = queue;
}).catch(() => {
    // Error already logged in initDeadLetterQueue
    deadLetterQueue = null;
    deadLetterQueueAvailable = false;
});
// Set up a periodic check for Redis availability
// This will allow the system to automatically detect when Redis becomes available again
const REDIS_CHECK_INTERVAL = 15000; // Check every 15 seconds
// Function to start periodic checks
const startDeadLetterQueueChecker = () => {
    const intervalId = setInterval(async () => {
        try {
            // Skip if we're already initialized or in the process of reinitializing
            if (deadLetterQueueAvailable || reinitializing || deadLetterQueue !== null) {
                return;
            }
            // Set reinitializing flag
            reinitializing = true;
            // Check if Redis is now available when we previously thought it wasn't
            const redisAvailable = await (0, redis_1.testRedisConnection)();
            // If Redis is now available but we don't have a queue initialized, recreate it
            if (redisAvailable && !deadLetterQueueAvailable) {
                logger_1.default.info('Redis is now available! Reinitializing dead letter queue...');
                // Try to initialize the queue again
                deadLetterQueue = await initDeadLetterQueue();
                if (deadLetterQueue) {
                    logger_1.default.info('Dead letter queue successfully reinitialized with Redis!');
                }
            }
        }
        catch (error) {
            // Error already logged in testRedisConnection
        }
        finally {
            // Reset flag
            reinitializing = false;
        }
    }, REDIS_CHECK_INTERVAL);
    // Make sure it doesn't prevent the Node.js process from exiting
    if (intervalId.unref) {
        intervalId.unref();
    }
    return intervalId;
};
// Start the checker
const deadLetterQueueCheckerInterval = startDeadLetterQueueChecker();
// Set up a listener for Redis status changes from the central observer
redis_1.redisStatusObserver.on('statusChanged', async (isAvailable) => {
    // If we're already in the process of reinitializing, skip
    if (reinitializing)
        return;
    reinitializing = true;
    try {
        if (isAvailable && !deadLetterQueueAvailable) {
            // Redis just became available - initialize the queue
            logger_1.default.info('Redis became available - initializing dead letter queue');
            // Reset error logged flag
            redisErrorLogged = false;
            // Initialize the queue
            deadLetterQueue = await initDeadLetterQueue();
            if (deadLetterQueue) {
                logger_1.default.info('Dead letter queue successfully initialized with Redis');
            }
        }
        else if (!isAvailable && deadLetterQueueAvailable) {
            // Redis just became unavailable - close the queue
            logger_1.default.info('Redis became unavailable - closing dead letter queue');
            // Close the queue
            if (deadLetterQueue) {
                try {
                    await deadLetterQueue.close().catch(() => { });
                }
                catch (err) {
                    // Ignore errors during close
                }
            }
            // Mark queue as unavailable
            deadLetterQueue = null;
            deadLetterQueueAvailable = false;
            logger_1.default.info('Dead letter queue closed due to Redis unavailability');
        }
    }
    catch (error) {
        logger_1.default.error('Error handling Redis status change:', error);
    }
    finally {
        reinitializing = false;
    }
});
// Function to add a job to the dead letter queue
async function addToDeadLetterQueue(originalQueue, originalJobId, originalData, error) {
    try {
        // If queue isn't initialized yet, try to initialize it now
        if (!deadLetterQueue) {
            deadLetterQueue = await initDeadLetterQueue();
        }
        // If queue is still null, Redis is unavailable
        if (!deadLetterQueue || !deadLetterQueueAvailable) {
            // Fall back to just file logging without Redis
            try {
                const failureRecord = {
                    originalQueue,
                    originalJobId,
                    timestamp: new Date().toISOString(),
                    error: {
                        message: error.message || 'Unknown error',
                        stack: error.stack || '',
                        code: error.code || '',
                        statusCode: error.statusCode || 500
                    },
                    data: originalData
                };
                // Ensure the audit directory exists
                const auditDir = path_1.default.join(__dirname, '../../logs/failed-jobs');
                if (!fs_1.default.existsSync(auditDir)) {
                    fs_1.default.mkdirSync(auditDir, { recursive: true });
                }
                // Write the failure record to file as fallback
                const logFile = path_1.default.join(auditDir, `local-failed-job-${(0, uuid_1.v4)()}.json`);
                fs_1.default.writeFileSync(logFile, JSON.stringify(failureRecord, null, 2));
                if (!redisErrorLogged) {
                    logger_1.default.warn('Redis unavailable - failed job logged locally to file');
                    redisErrorLogged = true;
                }
                return null;
            }
            catch (fileError) {
                logger_1.default.error(`Failed to log job failure to file: ${fileError.message}`);
                return null;
            }
        }
        // Add job to the dead letter queue
        const deadJob = await deadLetterQueue.add({
            originalQueue,
            originalJobId,
            originalData,
            error: {
                message: error.message || 'Unknown error',
                stack: error.stack || '',
                code: error.code || '',
                statusCode: error.statusCode || 500
            },
            timestamp: new Date().toISOString()
        });
        logger_1.default.info(`Added failed job ${originalJobId} from ${originalQueue} to dead letter queue as job ${deadJob.id}`);
        return deadJob.id.toString(); // Convert to string
    }
    catch (error) {
        if (!redisErrorLogged) {
            logger_1.default.error(`Failed to add job to dead letter queue: ${error.message}`);
            redisErrorLogged = true;
        }
        return null;
    }
}
// Clean up old dead letter jobs (keep last 100)
async function cleanupDeadLetterQueue() {
    try {
        // If queue isn't initialized or available, exit early
        if (!deadLetterQueue || !deadLetterQueueAvailable) {
            return 0;
        }
        // Check if Redis is still available
        try {
            if (deadLetterQueue.client) {
                await deadLetterQueue.client.ping();
            }
            else {
                return 0;
            }
        }
        catch (err) {
            if (!redisErrorLogged) {
                logger_1.default.warn('Redis connection lost during cleanup. Skipping dead letter queue cleanup.');
                redisErrorLogged = true;
            }
            deadLetterQueueAvailable = false;
            return 0;
        }
        const jobs = await deadLetterQueue.getJobs(['completed', 'failed']);
        // Sort by completion time (oldest first)
        jobs.sort((a, b) => {
            const aTime = a.finishedOn || 0;
            const bTime = b.finishedOn || 0;
            return aTime - bTime;
        });
        // Keep only the last 100 jobs
        const jobsToRemove = jobs.slice(0, Math.max(0, jobs.length - 100));
        for (const job of jobsToRemove) {
            await job.remove();
        }
        logger_1.default.info(`Cleaned up ${jobsToRemove.length} old dead letter jobs`);
        return jobsToRemove.length;
    }
    catch (error) {
        if (!redisErrorLogged) {
            logger_1.default.error(`Failed to clean up dead letter queue: ${error.message}`);
            redisErrorLogged = true;
        }
        return 0;
    }
}
// Function to retry a job from the dead letter queue
async function retryDeadLetterJob(jobId, targetQueue) {
    try {
        // If queue isn't initialized or available, exit early
        if (!deadLetterQueue || !deadLetterQueueAvailable) {
            logger_1.default.warn('Dead letter queue unavailable - cannot retry job');
            return false;
        }
        const job = await deadLetterQueue.getJob(jobId);
        if (!job) {
            logger_1.default.warn(`Dead letter job ${jobId} not found for retry`);
            return false;
        }
        // Add the original job back to its queue
        if (job.data.originalQueue === targetQueue.name) {
            await targetQueue.add(job.data.originalData);
            logger_1.default.info(`Retried job ${jobId} from dead letter queue to ${targetQueue.name}`);
            return true;
        }
        else {
            logger_1.default.warn(`Queue mismatch for job ${jobId}: ${job.data.originalQueue} vs ${targetQueue.name}`);
            return false;
        }
    }
    catch (error) {
        if (!redisErrorLogged) {
            logger_1.default.error(`Failed to retry dead letter job ${jobId}: ${error.message}`);
            redisErrorLogged = true;
        }
        return false;
    }
}
// Export the queue, but ensure users check for null
exports.default = deadLetterQueue;
//# sourceMappingURL=deadLetterQueue.js.map