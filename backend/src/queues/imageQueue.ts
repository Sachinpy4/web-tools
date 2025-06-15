import Queue from 'bull';
import { bullConfig, isRedisAvailable, testRedisConnection, redisStatusObserver, redisConfig } from '../config/redis';
import path from 'path';
import { addToDeadLetterQueue } from './deadLetterQueue';
import logger from '../utils/logger';

// Define job types
export type CompressJobData = {
  filePath: string;
  quality: number;
  originalFilename: string;
  originalSize: number;
  webhookUrl?: string;
};

export type ResizeJobData = {
  filePath: string;
  width?: number;
  height?: number;
  fit: string;
  originalFilename: string;
  webhookUrl?: string;
};

export type ConvertJobData = {
  filePath: string;
  format: string;
  originalFilename: string;
  webhookUrl?: string;
};

export type CropJobData = {
  filePath: string;
  left: number;
  top: number;
  width: number;
  height: number;
  originalFilename: string;
  webhookUrl?: string;
};

// Simple in-memory queue implementation for local-only mode
class LocalQueue<T> {
  private queue: T[] = [];
  private processing = false;
  private handlers: ((job: { data: T, progress: (n: number) => Promise<void> }) => Promise<any>)[] = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  async add(data: T, options?: any): Promise<{ id: string, data: T }> {
    const jobId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const job = { id: jobId, data };
    
    console.log(`[LocalQueue ${this.name}] Adding job ${jobId}`);
    this.queue.push(data);
    this.processNext();
    
    return job;
  }

  process(handler: (job: { data: T, progress: (n: number) => Promise<void> }) => Promise<any>): void {
    this.handlers.push(handler);
    this.processNext();
  }

  private async processNext(): Promise<void> {
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
          progress: async (n: number) => {
            console.log(`[LocalQueue ${this.name}] Job ${jobId} progress: ${n}%`);
          }
        };
        
        const result = await handler(job);
        console.log(`[LocalQueue ${this.name}] Job ${jobId} completed`);
      }
    } catch (error) {
      console.error(`[LocalQueue ${this.name}] Job ${jobId} failed:`, error);
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  async getJob(id: string): Promise<any> {
    return null; // Not implemented for local queue
  }

  async clean(age: number, status: string): Promise<any[]> {
    return []; // Not implemented for local queue
  }

  on(event: string, callback: (...args: any[]) => void): void {
    // Not implemented for local queue
  }

  async close(): Promise<void> {
    // Nothing to close in local queue
  }
}

// Type definition for our unified queue interface
export type QueueType<T> = Queue.Queue<T> | LocalQueue<T>;

// Create queues based on Redis availability
let compressQueue: QueueType<CompressJobData>;
let resizeQueue: QueueType<ResizeJobData>;
let convertQueue: QueueType<ConvertJobData>;
let cropQueue: QueueType<CropJobData>;

// Flag to track if we've already logged Redis unavailability
let redisUnavailabilityLogged = false;

// Local tracking of Redis availability (initialized from the imported value)
let redisAvailableLocally = false; // Default to false until explicitly verified

// Flag to track if queues have been initialized
let queuesInitialized = false;

// Flag to track if we're currently in the process of recreating queues
let recreatingQueues = false;

// Promise to track when queues are fully initialized
let queuesInitializedPromise: Promise<void>;
let resolveQueuesInitialized: () => void;

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
    redisAvailableLocally = await testRedisConnection();
    console.log(`Redis availability check result: ${redisAvailableLocally ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  } catch (error) {
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
          ...redisConfig,
          // Ensure host is explicitly set to the environment variable
          host: redisHost
        },
        defaultJobOptions: bullConfig.defaultJobOptions
      };
      
      // Create queues with error handling for each creation
      try {
        compressQueue = redisUrl
          ? new Queue<CompressJobData>('image-compression', redisUrl, { defaultJobOptions: bullConfig.defaultJobOptions })
          : new Queue<CompressJobData>('image-compression', queueOptions);
      } catch (error) {
        console.error('Failed to create compression queue:', error);
        redisAvailableLocally = false;
        throw error;
      }
      
      try {
        resizeQueue = redisUrl
          ? new Queue<ResizeJobData>('image-resize', redisUrl, { defaultJobOptions: bullConfig.defaultJobOptions })
          : new Queue<ResizeJobData>('image-resize', queueOptions);
      } catch (error) {
        console.error('Failed to create resize queue:', error);
        // Clean up already created queues
        if (compressQueue instanceof Queue) {
          await compressQueue.close().catch(() => {});
        }
        redisAvailableLocally = false;
        throw error;
      }
      
      try {
        convertQueue = redisUrl
          ? new Queue<ConvertJobData>('image-conversion', redisUrl, { defaultJobOptions: bullConfig.defaultJobOptions })
          : new Queue<ConvertJobData>('image-conversion', queueOptions);
      } catch (error) {
        console.error('Failed to create convert queue:', error);
        // Clean up already created queues
        if (compressQueue instanceof Queue) {
          await compressQueue.close().catch(() => {});
        }
        if (resizeQueue instanceof Queue) {
          await resizeQueue.close().catch(() => {});
        }
        redisAvailableLocally = false;
        throw error;
      }
      
      try {
        cropQueue = redisUrl
          ? new Queue<CropJobData>('image-crop', redisUrl, { defaultJobOptions: bullConfig.defaultJobOptions })
          : new Queue<CropJobData>('image-crop', queueOptions);
      } catch (error) {
        console.error('Failed to create crop queue:', error);
        // Clean up already created queues
        if (compressQueue instanceof Queue) {
          await compressQueue.close().catch(() => {});
        }
        if (resizeQueue instanceof Queue) {
          await resizeQueue.close().catch(() => {});
        }
        if (convertQueue instanceof Queue) {
          await convertQueue.close().catch(() => {});
        }
        redisAvailableLocally = false;
        throw error;
      }
  
      // Set up event handlers for all queues
      const setupQueueEvents = (queue: Queue.Queue<any>) => {
        queue.on('error', (error: Error & { code?: string }) => {
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
                    if (compressQueue instanceof Queue) await compressQueue.close().catch(() => {});
                    if (resizeQueue instanceof Queue) await resizeQueue.close().catch(() => {});
                    if (convertQueue instanceof Queue) await convertQueue.close().catch(() => {});
                    if (cropQueue instanceof Queue) await cropQueue.close().catch(() => {});
                  } catch (err) {
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
          } else {
            console.error(`Queue ${queue.name} error:`, error);
          }
        });
  
        // Add failed job handler to send to dead letter queue
        queue.on('failed', async (job, error) => {
          logger.error(`Job ${job.id} in queue ${queue.name} failed with error: ${error.message}`);
          
          try {
            // Add the failed job to the dead letter queue
            const deadLetterJobId = await addToDeadLetterQueue(
              queue.name,
              job.id,
              job.data,
              error
            );
            
            if (deadLetterJobId) {
              logger.info(`Job ${job.id} moved to dead letter queue as job ${deadLetterJobId}`);
            } else {
              logger.warn(`Could not move job ${job.id} to dead letter queue`);
            }
          } catch (dlqError: any) {
            logger.error(`Error adding job ${job.id} to dead letter queue: ${dlqError.message}`);
          }
        });
  
        queue.on('completed', (job) => {
          console.log(`Job ${job.id} completed in queue ${queue.name}`);
        });
        
        queue.on('stalled', (job) => {
          logger.warn(`Job ${job.id} stalled in queue ${queue.name}`);
        });
      };
  
      // Safely setup events with error handling
      try {
        setupQueueEvents(compressQueue as Queue.Queue<any>);
        setupQueueEvents(resizeQueue as Queue.Queue<any>);
        setupQueueEvents(convertQueue as Queue.Queue<any>);
        setupQueueEvents(cropQueue as Queue.Queue<any>);
      } catch (error) {
        console.error('Error setting up queue events:', error);
        redisAvailableLocally = false;
        throw error;
      }
      
      console.log('Redis connection successful! Using Bull queues with Redis');

      // Add a verification check to test the actual Redis connection
      try {
        // Only use client.ping() on Bull queues, not LocalQueue
        const bullCompressQueue = compressQueue as Queue.Queue<CompressJobData>;
        if (bullCompressQueue && 'client' in bullCompressQueue) {
          await new Promise<void>((resolve, reject) => {
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
        
      } catch (error) {
        console.error('Redis ping failed:', (error as Error).message);
        redisAvailableLocally = false;
        
        // Clean up queues
        try {
          const queues = [compressQueue, resizeQueue, convertQueue, cropQueue];
          for (const queue of queues) {
            if (queue instanceof Queue && 'close' in queue) {
              await queue.close().catch(() => {});
            }
          }
        } catch (err) {
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
      
    } catch (err) {
      const error = err as Error;
      console.warn('Failed to initialize Redis queues:', error.message);
      redisAvailableLocally = false;
      
      createLocalQueues();
      recreatingQueues = false;
    }
  } else {
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
  compressQueue = new LocalQueue<CompressJobData>('image-compression');
  resizeQueue = new LocalQueue<ResizeJobData>('image-resize');
  convertQueue = new LocalQueue<ConvertJobData>('image-conversion');
  cropQueue = new LocalQueue<CropJobData>('image-crop');
  
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
let redisCheckerInterval: NodeJS.Timeout;

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
      const redisAvailable = await testRedisConnection();
      
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
    } catch (error) {
      // Error already logged in testRedisConnection
    }
  }, REDIS_CHECK_INTERVAL);
};

// Start the checker
startRedisAvailabilityChecker();

// Set up a listener for Redis status changes from the central observer
redisStatusObserver.on('statusChanged', async (isAvailable: boolean) => {
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
    } catch (error) {
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
      if (compressQueue instanceof Queue) await compressQueue.close().catch(() => {});
      if (resizeQueue instanceof Queue) await resizeQueue.close().catch(() => {});
      if (convertQueue instanceof Queue) await convertQueue.close().catch(() => {});
      if (cropQueue instanceof Queue) await cropQueue.close().catch(() => {});
      
      // Reset initialization flag
      queuesInitialized = false;
      
      // Create local queues
      createLocalQueues();
      
      console.log('🔄 Processing mode changed: Direct (Local) - Automatic switch');
    } catch (err) {
      console.error('[Queue] Error during queue transition to local mode:', err);
      
      // Ensure we have working local queues
      if (!queuesInitialized) {
        createLocalQueues();
      }
    } finally {
      recreatingQueues = false;
    }
  }
});

// Export queues and types
export { compressQueue, resizeQueue, convertQueue, cropQueue };

// Getter function to check if Redis is actually available (accounting for runtime errors)
export const isRedisActuallyAvailable = async () => {
  // If queues aren't initialized yet, wait for them
  if (!queuesInitialized) {
    console.log('Waiting for queue initialization before checking Redis availability...');
    await queuesInitializedPromise;
  }
  
  // After queues are initialized, we can access the availability flag
  console.log(`Redis availability check (cached): ${redisAvailableLocally ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  return redisAvailableLocally;
};

// Export a function to clean up old jobs periodically
export const cleanOldJobs = async () => {
  // Skip cleanup if queues aren't initialized yet
  if (!queuesInitialized) {
    try {
      await Promise.race([
        queuesInitializedPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Queue initialization timeout')), 5000))
      ]);
    } catch (err) {
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
    if (compressQueue instanceof Queue && 'client' in compressQueue) {
      // Verify Redis is still connected before attempting cleanup
      try {
        await compressQueue.client.ping();
      } catch (err) {
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
      const bullCompressQueue = compressQueue as Queue.Queue<CompressJobData>;
      const bullResizeQueue = resizeQueue as Queue.Queue<ResizeJobData>;
      const bullConvertQueue = convertQueue as Queue.Queue<ConvertJobData>;
      const bullCropQueue = cropQueue as Queue.Queue<CropJobData>;
      
      // Use individual try/catch for each cleanup operation
      const completedStatus = 'completed' as const;
      const failedStatus = 'failed' as const;
      
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
      } catch (cleanupError) {
        console.warn('Error during job cleanup:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Failed to clean old jobs:', error);
    // Don't update redisAvailableLocally here, as this might be a transient error
  }
}; 