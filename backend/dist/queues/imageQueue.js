"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOldJobs = exports.isRedisActuallyAvailable = exports.cropQueue = exports.convertQueue = exports.resizeQueue = exports.compressQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const redis_1 = require("../config/redis");
const deadLetterQueue_1 = require("./deadLetterQueue");
const logger_1 = __importDefault(require("../utils/logger"));
// Simple in-memory queue implementation for local-only mode
class LocalQueue {
    queue = [];
    processing = false;
    handlers = [];
    name;
    constructor(name) {
        this.name = name;
    }
    async add(data, options) {
        const jobId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const job = { id: jobId, data };
        console.log(`[LocalQueue ${this.name}] Adding job ${jobId}`);
        this.queue.push(data);
        this.processNext();
        return job;
    }
    process(handler) {
        this.handlers.push(handler);
        this.processNext();
    }
    async processNext() {
        if (this.processing || this.queue.length === 0 || this.handlers.length === 0) {
            return;
        }
        this.processing = true;
        const data = this.queue.shift();
        const handler = this.handlers[0]; // Use the first registered handler
        const jobId = `local-${Date.now()}`;
        console.log(`[LocalQueue ${this.name}] Processing job ${jobId}`);
        try {
            // Make sure data is not undefined before proceeding
            if (data) {
                const job = {
                    data,
                    progress: async (n) => {
                        console.log(`[LocalQueue ${this.name}] Job ${jobId} progress: ${n}%`);
                    }
                };
                const result = await handler(job);
                console.log(`[LocalQueue ${this.name}] Job ${jobId} completed`);
            }
        }
        catch (error) {
            console.error(`[LocalQueue ${this.name}] Job ${jobId} failed:`, error);
        }
        finally {
            this.processing = false;
            this.processNext();
        }
    }
    async getJob(id) {
        return null; // Not implemented for local queue
    }
    async clean(age, status) {
        return []; // Not implemented for local queue
    }
    on(event, callback) {
        // Not implemented for local queue
    }
    async close() {
        // Nothing to close in local queue
    }
}
// Create queues based on Redis availability
let compressQueue;
let resizeQueue;
let convertQueue;
let cropQueue;
// Flag to track if we've already logged Redis unavailability
let redisUnavailabilityLogged = false;
// Local tracking of Redis availability (initialized from the imported value)
let redisAvailableLocally = false; // Default to false until explicitly verified
// Flag to track if queues have been initialized
let queuesInitialized = false;
// Flag to track if we're currently in the process of recreating queues
let recreatingQueues = false;
// Promise to track when queues are fully initialized
let queuesInitializedPromise;
let resolveQueuesInitialized;
// Initialize the promise that will resolve when queues are ready
queuesInitializedPromise = new Promise((resolve) => {
    resolveQueuesInitialized = resolve;
});
// Function to create queues based on Redis availability
const createQueues = async () => {
    // If queues are already initialized or we're in the process of recreating them, don't recreate them
    if (queuesInitialized || recreatingQueues) {
        return;
    }
    // Set flag to prevent concurrent queue recreation
    recreatingQueues = true;
    console.log('Initializing queue system...');
    // Double-check Redis availability with a test connection
    try {
        redisAvailableLocally = await (0, redis_1.testRedisConnection)();
        console.log(`Redis availability check result: ${redisAvailableLocally ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    }
    catch (error) {
        console.error('Error checking Redis availability:', error);
        redisAvailableLocally = false;
    }
    if (redisAvailableLocally) {
        try {
            // Create Bull queues with Redis
            console.log('Attempting to create Bull queues with Redis...');
            // Use the REDIS_HOST environment variable consistently
            const redisHost = process.env.REDIS_HOST || 'localhost';
            // Log the actual Redis host we're using
            console.log(`Using Redis host: ${redisHost}`);
            // Determine whether to use URL or configuration object
            const redisUrl = process.env.REDIS_PASSWORD
                ? `redis://${process.env.REDIS_USERNAME ? process.env.REDIS_USERNAME + ':' : ''}${process.env.REDIS_PASSWORD}@${redisHost}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`
                : undefined;
            // Default queue options as a separate variable with proper type
            const queueOptions = {
                redis: {
                    ...redis_1.redisConfig,
                    // Ensure host is explicitly set to the environment variable
                    host: redisHost
                },
                defaultJobOptions: redis_1.bullConfig.defaultJobOptions
            };
            // Create queues with error handling for each creation
            try {
                exports.compressQueue = compressQueue = redisUrl
                    ? new bull_1.default('image-compression', redisUrl, { defaultJobOptions: redis_1.bullConfig.defaultJobOptions })
                    : new bull_1.default('image-compression', queueOptions);
            }
            catch (error) {
                console.error('Failed to create compression queue:', error);
                redisAvailableLocally = false;
                throw error;
            }
            try {
                exports.resizeQueue = resizeQueue = redisUrl
                    ? new bull_1.default('image-resize', redisUrl, { defaultJobOptions: redis_1.bullConfig.defaultJobOptions })
                    : new bull_1.default('image-resize', queueOptions);
            }
            catch (error) {
                console.error('Failed to create resize queue:', error);
                // Clean up already created queues
                if (compressQueue instanceof bull_1.default) {
                    await compressQueue.close().catch(() => { });
                }
                redisAvailableLocally = false;
                throw error;
            }
            try {
                exports.convertQueue = convertQueue = redisUrl
                    ? new bull_1.default('image-conversion', redisUrl, { defaultJobOptions: redis_1.bullConfig.defaultJobOptions })
                    : new bull_1.default('image-conversion', queueOptions);
            }
            catch (error) {
                console.error('Failed to create convert queue:', error);
                // Clean up already created queues
                if (compressQueue instanceof bull_1.default) {
                    await compressQueue.close().catch(() => { });
                }
                if (resizeQueue instanceof bull_1.default) {
                    await resizeQueue.close().catch(() => { });
                }
                redisAvailableLocally = false;
                throw error;
            }
            try {
                exports.cropQueue = cropQueue = redisUrl
                    ? new bull_1.default('image-crop', redisUrl, { defaultJobOptions: redis_1.bullConfig.defaultJobOptions })
                    : new bull_1.default('image-crop', queueOptions);
            }
            catch (error) {
                console.error('Failed to create crop queue:', error);
                // Clean up already created queues
                if (compressQueue instanceof bull_1.default) {
                    await compressQueue.close().catch(() => { });
                }
                if (resizeQueue instanceof bull_1.default) {
                    await resizeQueue.close().catch(() => { });
                }
                if (convertQueue instanceof bull_1.default) {
                    await convertQueue.close().catch(() => { });
                }
                redisAvailableLocally = false;
                throw error;
            }
            // Set up event handlers for all queues
            const setupQueueEvents = (queue) => {
                queue.on('error', (error) => {
                    // Check if this is a connection error
                    if ((error.code && error.code === 'ECONNREFUSED') ||
                        error.message.includes('Connection is closed') ||
                        error.message.includes('ended') ||
                        error.message.includes('connection')) {
                        // Only log the first occurrence of the error
                        if (!redisUnavailabilityLogged) {
                            console.error(`Queue ${queue.name} error:`, error.message);
                            redisUnavailabilityLogged = true;
                            // If we get connection errors, Redis is actually not available
                            // Fall back to local queues - but we'll do this outside this handler to avoid
                            // race conditions
                            redisAvailableLocally = false;
                            // Schedule queue replacement with small delay, but only if not already recreating
                            if (!recreatingQueues) {
                                setTimeout(async () => {
                                    recreatingQueues = true; // Set flag to prevent concurrent recreation
                                    // Close existing queues safely
                                    try {
                                        if (compressQueue instanceof bull_1.default)
                                            await compressQueue.close().catch(() => { });
                                        if (resizeQueue instanceof bull_1.default)
                                            await resizeQueue.close().catch(() => { });
                                        if (convertQueue instanceof bull_1.default)
                                            await convertQueue.close().catch(() => { });
                                        if (cropQueue instanceof bull_1.default)
                                            await cropQueue.close().catch(() => { });
                                    }
                                    catch (err) {
                                        console.error('Error closing queues:', err);
                                    }
                                    // Reset initialized flag to allow recreation
                                    queuesInitialized = false;
                                    // Recreate queues as local
                                    createLocalQueues();
                                    // Reset recreation flag
                                    recreatingQueues = false;
                                }, 500);
                            }
                        }
                    }
                    else {
                        console.error(`Queue ${queue.name} error:`, error);
                    }
                });
                // Add failed job handler to send to dead letter queue
                queue.on('failed', async (job, error) => {
                    logger_1.default.error(`Job ${job.id} in queue ${queue.name} failed with error: ${error.message}`);
                    try {
                        // Add the failed job to the dead letter queue
                        const deadLetterJobId = await (0, deadLetterQueue_1.addToDeadLetterQueue)(queue.name, job.id, job.data, error);
                        if (deadLetterJobId) {
                            logger_1.default.info(`Job ${job.id} moved to dead letter queue as job ${deadLetterJobId}`);
                        }
                        else {
                            logger_1.default.warn(`Could not move job ${job.id} to dead letter queue`);
                        }
                    }
                    catch (dlqError) {
                        logger_1.default.error(`Error adding job ${job.id} to dead letter queue: ${dlqError.message}`);
                    }
                });
                queue.on('completed', (job) => {
                    console.log(`Job ${job.id} completed in queue ${queue.name}`);
                });
                queue.on('stalled', (job) => {
                    logger_1.default.warn(`Job ${job.id} stalled in queue ${queue.name}`);
                });
            };
            // Safely setup events with error handling
            try {
                setupQueueEvents(compressQueue);
                setupQueueEvents(resizeQueue);
                setupQueueEvents(convertQueue);
                setupQueueEvents(cropQueue);
            }
            catch (error) {
                console.error('Error setting up queue events:', error);
                redisAvailableLocally = false;
                throw error;
            }
            console.log('Redis connection successful! Using Bull queues with Redis');
            // Add a verification check to test the actual Redis connection
            try {
                // Only use client.ping() on Bull queues, not LocalQueue
                const bullCompressQueue = compressQueue;
                if (bullCompressQueue && 'client' in bullCompressQueue) {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Redis ping timed out'));
                        }, 3000);
                        bullCompressQueue.client.ping().then(() => {
                            clearTimeout(timeout);
                            resolve();
                        }).catch(error => {
                            clearTimeout(timeout);
                            reject(error);
                        });
                    });
                }
                // If we get here, Redis is fully available and working
                redisAvailableLocally = true;
                redisUnavailabilityLogged = false; // Reset the flag since Redis is now available
                console.log('Redis ping successful - queue system is fully operational');
            }
            catch (error) {
                console.error('Redis ping failed:', error.message);
                redisAvailableLocally = false;
                // Clean up queues
                try {
                    const queues = [compressQueue, resizeQueue, convertQueue, cropQueue];
                    for (const queue of queues) {
                        if (queue instanceof bull_1.default && 'close' in queue) {
                            await queue.close().catch(() => { });
                        }
                    }
                }
                catch (err) {
                    console.error('Error closing queues after ping failure:', err);
                }
                // Fall back to local queues
                createLocalQueues();
                recreatingQueues = false;
                return;
            }
            queuesInitialized = true;
            recreatingQueues = false;
            resolveQueuesInitialized(); // Resolve the initialization promise
            console.log('Queue system initialization completed with Redis');
        }
        catch (err) {
            const error = err;
            console.warn('Failed to initialize Redis queues:', error.message);
            redisAvailableLocally = false;
            createLocalQueues();
            recreatingQueues = false;
        }
    }
    else {
        createLocalQueues();
        recreatingQueues = false;
    }
};
// Function to create local queues
const createLocalQueues = () => {
    if (!redisUnavailabilityLogged) {
        console.warn('Using local-only queue implementation (no Redis)');
        redisUnavailabilityLogged = true;
    }
    // Create local queues
    exports.compressQueue = compressQueue = new LocalQueue('image-compression');
    exports.resizeQueue = resizeQueue = new LocalQueue('image-resize');
    exports.convertQueue = convertQueue = new LocalQueue('image-conversion');
    exports.cropQueue = cropQueue = new LocalQueue('image-crop');
    queuesInitialized = true;
    redisAvailableLocally = false; // Explicitly set to false for local queues
    resolveQueuesInitialized(); // Resolve the initialization promise
    console.log('Queue system initialization completed with local queues');
};
// Initialize queues asynchronously to avoid blocking the server startup
createQueues().catch(error => {
    console.error('Failed to initialize queues:', error);
    // Ensure we have local queues as fallback
    if (!queuesInitialized) {
        createLocalQueues();
    }
});
// Set up a periodic check for Redis availability
// This will allow the system to automatically switch between queue and direct modes
const REDIS_CHECK_INTERVAL = 10000; // Check every 10 seconds
// Start the periodic Redis availability checker
let redisCheckerInterval;
// Function to start periodic checks
const startRedisAvailabilityChecker = () => {
    // Clear any existing interval first
    if (redisCheckerInterval) {
        clearInterval(redisCheckerInterval);
    }
    // Set up the periodic checker
    redisCheckerInterval = setInterval(async () => {
        try {
            // Skip checking if we're already using Redis or in the process of recreating queues
            if (redisAvailableLocally || recreatingQueues) {
                return;
            }
            // Check if Redis is now available when we previously thought it wasn't
            const redisAvailable = await (0, redis_1.testRedisConnection)();
            // If Redis is now available but we're using local queues, switch to Redis queues
            if (redisAvailable && !redisAvailableLocally && queuesInitialized) {
                console.log('Redis is now available! Switching from direct to queue mode...');
                // Reset the initialization flag to allow recreation
                queuesInitialized = false;
                // Recreate queues
                await createQueues();
                // Log the mode switch
                console.log('🔄 Processing mode: Queued (Redis) - Automatic switch');
            }
        }
        catch (error) {
            // Error already logged in testRedisConnection
        }
    }, REDIS_CHECK_INTERVAL);
};
// Start the checker
startRedisAvailabilityChecker();
// Set up a listener for Redis status changes from the central observer
redis_1.redisStatusObserver.on('statusChanged', async (isAvailable) => {
    console.log(`[Queue] Redis status changed to: ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    // If Redis just became available and we're in local mode, switch to Redis mode
    if (isAvailable && !redisAvailableLocally && queuesInitialized) {
        console.log('[Queue] Redis is now available! Switching from direct to queue mode...');
        // Reset the initialization flag to allow recreation
        queuesInitialized = false;
        redisUnavailabilityLogged = false;
        // Recreate queues with Redis
        try {
            await createQueues();
            console.log('🔄 Processing mode changed: Queued (Redis) - Automatic switch');
        }
        catch (error) {
            console.error('[Queue] Failed to recreate queues with Redis:', error);
            // Ensure we're still using local queues if recreation fails
            if (!queuesInitialized) {
                createLocalQueues();
            }
        }
    }
    // If Redis just became unavailable and we're in Redis mode, switch to local mode
    if (!isAvailable && redisAvailableLocally) {
        console.log('[Queue] Redis is no longer available. Switching to local mode...');
        // If we're already handling the transition, don't do anything
        if (recreatingQueues) {
            return;
        }
        // Close existing Redis queues and recreate local queues
        recreatingQueues = true;
        try {
            // Close existing queues safely
            if (compressQueue instanceof bull_1.default)
                await compressQueue.close().catch(() => { });
            if (resizeQueue instanceof bull_1.default)
                await resizeQueue.close().catch(() => { });
            if (convertQueue instanceof bull_1.default)
                await convertQueue.close().catch(() => { });
            if (cropQueue instanceof bull_1.default)
                await cropQueue.close().catch(() => { });
            // Reset initialization flag
            queuesInitialized = false;
            // Create local queues
            createLocalQueues();
            console.log('🔄 Processing mode changed: Direct (Local) - Automatic switch');
        }
        catch (err) {
            console.error('[Queue] Error during queue transition to local mode:', err);
            // Ensure we have working local queues
            if (!queuesInitialized) {
                createLocalQueues();
            }
        }
        finally {
            recreatingQueues = false;
        }
    }
});
// Getter function to check if Redis is actually available (accounting for runtime errors)
const isRedisActuallyAvailable = async () => {
    // If queues aren't initialized yet, wait for them
    if (!queuesInitialized) {
        console.log('Waiting for queue initialization before checking Redis availability...');
        await queuesInitializedPromise;
    }
    // After queues are initialized, we can access the availability flag
    console.log(`Redis availability check (cached): ${redisAvailableLocally ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    return redisAvailableLocally;
};
exports.isRedisActuallyAvailable = isRedisActuallyAvailable;
// Export a function to clean up old jobs periodically
const cleanOldJobs = async () => {
    // Skip cleanup if queues aren't initialized yet
    if (!queuesInitialized) {
        try {
            await Promise.race([
                queuesInitializedPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Queue initialization timeout')), 5000))
            ]);
        }
        catch (err) {
            console.warn('Skipping job cleanup: queue system not initialized');
            return;
        }
    }
    // Skip cleanup if Redis is not available
    if (!redisAvailableLocally) {
        return;
    }
    try {
        // Make sure we're working with Bull queues, not LocalQueue
        if (compressQueue instanceof bull_1.default && 'client' in compressQueue) {
            // Verify Redis is still connected before attempting cleanup
            try {
                await compressQueue.client.ping();
            }
            catch (err) {
                // If Redis is down, update our flags but don't trigger a full fallback
                // (that will happen naturally when the next job is attempted)
                redisAvailableLocally = false;
                if (!redisUnavailabilityLogged) {
                    console.warn('Redis connection lost during cleanup. Skipping cleanup.');
                    redisUnavailabilityLogged = true;
                }
                return;
            }
            // All these should be Bull queues at this point since we checked redisAvailableLocally
            const bullCompressQueue = compressQueue;
            const bullResizeQueue = resizeQueue;
            const bullConvertQueue = convertQueue;
            const bullCropQueue = cropQueue;
            // Use individual try/catch for each cleanup operation
            const completedStatus = 'completed';
            const failedStatus = 'failed';
            try {
                await Promise.allSettled([
                    bullCompressQueue.clean(24 * 60 * 60 * 1000, completedStatus),
                    bullResizeQueue.clean(24 * 60 * 60 * 1000, completedStatus),
                    bullConvertQueue.clean(24 * 60 * 60 * 1000, completedStatus),
                    bullCropQueue.clean(24 * 60 * 60 * 1000, completedStatus),
                    bullCompressQueue.clean(7 * 24 * 60 * 60 * 1000, failedStatus),
                    bullResizeQueue.clean(7 * 24 * 60 * 60 * 1000, failedStatus),
                    bullConvertQueue.clean(7 * 24 * 60 * 60 * 1000, failedStatus),
                    bullCropQueue.clean(7 * 24 * 60 * 60 * 1000, failedStatus),
                ]);
                console.log('Cleaned up old jobs');
            }
            catch (cleanupError) {
                console.warn('Error during job cleanup:', cleanupError);
            }
        }
    }
    catch (error) {
        console.error('Failed to clean old jobs:', error);
        // Don't update redisAvailableLocally here, as this might be a transient error
    }
};
exports.cleanOldJobs = cleanOldJobs;
//# sourceMappingURL=imageQueue.js.map