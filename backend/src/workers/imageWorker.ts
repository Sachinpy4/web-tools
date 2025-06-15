import { 
  compressQueue, 
  resizeQueue, 
  convertQueue, 
  cropQueue,
  CompressJobData,
  ResizeJobData,
  ConvertJobData,
  CropJobData,
  isRedisActuallyAvailable
} from '../queues/imageQueue';

import { 
  compressImageService, 
  resizeImageService, 
  convertImageService,
  cropImageService 
} from '../services/imageService';

import { isRedisAvailable, testRedisConnection, redisStatusObserver } from '../config/redis';
import path from 'path';
import axios from 'axios';

// Use an augmented type to satisfy TypeScript
type ProcessHandler<T> = (job: { data: T; progress: (n: number) => Promise<void>; id?: string | number }) => Promise<any>;

/**
 * Send webhook notification about job completion
 */
async function sendWebhookNotification(jobId: string | number, data: any, webhookUrl: string, status: 'completed' | 'failed', error?: string) {
  try {
    if (!webhookUrl) return;
    
    console.log(`[Worker] Sending webhook notification for job ${jobId} to ${webhookUrl}`);
    
    await axios.post(webhookUrl, {
      jobId: String(jobId),
      status,
      timestamp: new Date().toISOString(),
      data: status === 'completed' ? data : null,
      error: status === 'failed' ? error : null
    });
    
    console.log(`[Worker] Webhook notification sent successfully for job ${jobId}`);
  } catch (err) {
    console.error(`[Worker] Failed to send webhook notification for job ${jobId}:`, err);
  }
}

// Flag to prevent excessive error logging
let redisErrorLogged = false;

// Flag to track initial startup sequence
let initialSetupComplete = false;

// List of error messages we've already seen to prevent duplicates
const seenErrors = new Set();

// Set up a domain to catch uncaught errors
const domain = require('domain').create();

domain.on('error', (err) => {
  // Extract the error message and first line of stack for deduplication
  const errorKey = `${err.message}:${err.stack?.split('\n')[1] || ''}`;
  
  // Check if this is a Redis connection error
  const isRedisError = 
    err.message.includes('ECONNREFUSED') || 
    err.message.includes('ECONNABORTED') || 
    err.message.includes('ECONNRESET') || 
    err.message.includes('Connection is closed') || 
    err.message.includes('ended') || 
    err.message.includes('connection');
  
  // Only log Redis errors once
  if (isRedisError) {
    if (!redisErrorLogged) {
      console.error('[Worker] Redis connection error:', err.message);
      redisErrorLogged = true;
    }
  } 
  // For other errors, log if we haven't seen this exact error before
  else if (!seenErrors.has(errorKey)) {
    console.error('[Worker] Uncaught error in worker domain:', err);
    // Add to seen errors to prevent duplicates
    seenErrors.add(errorKey);
    
    // Limit the size of the seen errors set to prevent memory leaks
    if (seenErrors.size > 100) {
      // Clear the oldest entries when we reach 100 errors
      const entries = Array.from(seenErrors);
      entries.slice(0, 50).forEach(entry => seenErrors.delete(entry));
    }
  }
});

// Flag to track which queues already have handlers
const processHandlersRegistered = {
  compress: false,
  resize: false,
  convert: false,
  crop: false
};

// Delay worker startup to allow Redis status to be properly determined
setTimeout(async () => {
  domain.run(async () => {
    try {
      // Initial worker setup
      await setupWorkers();
      
      // Mark initial setup as complete - prevents unnecessary reconfigurations
      initialSetupComplete = true;
      
      // Now that initial setup is complete, start the periodic checker
      startRedisChecker();
    } catch (error) {
      console.error('[Worker] Error during worker startup:', error);
    }
  });
}, 1000); // Delay worker startup by 1 second to allow Redis connection to be established

// Set up a listener for Redis status changes from the central observer
redisStatusObserver.on('statusChanged', async (isAvailable: boolean) => {
  // Skip if we're already checking or still in initial startup
  if (isCheckingRedis || !initialSetupComplete) return;
  
  isCheckingRedis = true;
  
  try {
    if (isAvailable) {
      console.log('[Worker] Redis is now available! Reconfiguring workers...');
      redisErrorLogged = false; // Reset error flag
      
      // Force a clean reconfiguration for the new Redis connection
      processHandlersRegistered.compress = false;
      processHandlersRegistered.resize = false;
      processHandlersRegistered.convert = false;
      processHandlersRegistered.crop = false;
      
      // Wait for the queue system to fully initialize before setting up workers
      try {
        // Ensure the queue system is initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check again if Redis is still available before proceeding
        if (await testRedisConnection()) {
          await setupWorkers();
          console.log('[Worker] Workers successfully reconfigured to use Redis queues');
        } else {
          console.log('[Worker] Redis became unavailable during reconfiguration, aborting');
        }
      } catch (setupError) {
        console.error('[Worker] Error during worker reconfiguration:', setupError);
      }
    } else {
      console.log('[Worker] Redis is no longer available. Will use local queues.');
      // The main queue system will handle the fallback
      
      // Reset process handlers when Redis becomes unavailable, so they can be 
      // reregistered when it becomes available again
      processHandlersRegistered.compress = false;
      processHandlersRegistered.resize = false;
      processHandlersRegistered.convert = false;
      processHandlersRegistered.crop = false;
    }
  } catch (error) {
    console.error('[Worker] Error handling Redis status change:', error);
  } finally {
    isCheckingRedis = false;
  }
});

// Function to set up workers
async function setupWorkers() {
  // Force a new check for Redis availability each time we set up workers
  const redisAvailable = await testRedisConnection();
  
  console.log(`[Worker] ${redisAvailable ? 'Redis available' : 'Redis unavailable'} - ${redisAvailable ? 'Using Bull queues' : 'Using local queue'} for job processing`);
  
  // If Redis is available, configure the workers
  if (redisAvailable === true) {
    // Clear any previously registered handlers to ensure clean reconfiguration
    processHandlersRegistered.compress = false;
    processHandlersRegistered.resize = false;
    processHandlersRegistered.convert = false;
    processHandlersRegistered.crop = false;
    
    await setupBullWorkers();
  } else {
    console.log('[Worker] Using local queue implementation (no Redis)');
    // Local queues process jobs in-line, no need for separate workers
  }
}

// Function to set up Bull workers
async function setupBullWorkers() {
  try {
    // Make sure we're working with Bull queues and not LocalQueue
    const bullCompressQueue = compressQueue;
    const bullResizeQueue = resizeQueue;
    const bullConvertQueue = convertQueue;
    const bullCropQueue = cropQueue;
    
    // Only register the handler if it hasn't been registered yet
    if (bullCompressQueue && 'process' in bullCompressQueue && !processHandlersRegistered.compress) {
      try {
        // Worker for image compression
        bullCompressQueue.process(async (job) => {
          // Add an id if it doesn't exist in the job object
          const jobWithId = job as { data: CompressJobData; progress: (n: number) => Promise<void>; id: string | number };
          const { filePath, quality, originalFilename, webhookUrl } = jobWithId.data;
          
          try {
            // Update progress to 10%
            await jobWithId.progress(10);
            console.log(`[Worker] Starting compression job ${jobWithId.id || 'unknown'} for ${originalFilename}`);
            
            // Process the image
            const result = await compressImageService(filePath, quality);
            
            // Update progress to 90%
            await jobWithId.progress(90);
            
            // Return output with generated paths for download
            const filename = path.basename(result.path);
            
            const jobResult = {
              originalSize: jobWithId.data.originalSize,
              compressedSize: result.size ?? 0,
              compressionRatio: Math.round((1 - ((result.size ?? 0) / jobWithId.data.originalSize)) * 100),
              mime: result.mime,
              filename,
              originalFilename,
              width: result.width,
              height: result.height,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(originalFilename)}`
            };
            
            console.log(`[Worker] Completed compression job ${jobWithId.id || 'unknown'}`);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(jobWithId.id || 'unknown', jobResult, webhookUrl, 'completed');
            }
            
            return jobResult;
          } catch (error) {
            console.error(`[Worker] Compression job ${jobWithId.id || 'unknown'} failed:`, error);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(
                jobWithId.id || 'unknown', 
                null, 
                webhookUrl, 
                'failed', 
                error instanceof Error ? error.message : String(error)
              );
            }
            
            throw error;
          }
        });
        
        // Mark this handler as registered
        processHandlersRegistered.compress = true;
      } catch (err) {
        if (!redisErrorLogged) {
          console.error('[Worker] Error setting up compression worker:', err);
          redisErrorLogged = true;
        }
      }
    }
    
    // Only register the handler if it hasn't been registered yet
    if (bullResizeQueue && 'process' in bullResizeQueue && !processHandlersRegistered.resize) {
      try {
        // Worker for image resizing
        bullResizeQueue.process(async (job) => {
          // Add an id if it doesn't exist in the job object
          const jobWithId = job as { data: ResizeJobData; progress: (n: number) => Promise<void>; id: string | number };
          const { filePath, width, height, fit, originalFilename, webhookUrl } = jobWithId.data;
          
          try {
            // Update progress to 10%
            await jobWithId.progress(10);
            console.log(`[Worker] Starting resize job ${jobWithId.id || 'unknown'} for ${originalFilename}`);
            
            // Process the image
            const result = await resizeImageService(filePath, width ?? 0, height ?? 0, fit ?? 'contain');
            
            // Update progress to 90%
            await jobWithId.progress(90);
            
            // Return output with generated paths for download
            const filename = path.basename(result.path);
            
            const jobResult = {
              width: result.width,
              height: result.height,
              mime: result.mime,
              filename,
              originalFilename,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(originalFilename)}`
            };
            
            console.log(`[Worker] Completed resize job ${jobWithId.id || 'unknown'}`);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(jobWithId.id || 'unknown', jobResult, webhookUrl, 'completed');
            }
            
            return jobResult;
          } catch (error) {
            console.error(`[Worker] Resize job ${jobWithId.id || 'unknown'} failed:`, error);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(
                jobWithId.id || 'unknown', 
                null, 
                webhookUrl, 
                'failed', 
                error instanceof Error ? error.message : String(error)
              );
            }
            
            throw error;
          }
        });
        
        // Mark this handler as registered
        processHandlersRegistered.resize = true;
      } catch (err) {
        if (!redisErrorLogged) {
          console.error('[Worker] Error setting up resize worker:', err);
          redisErrorLogged = true;
        }
      }
    }
    
    // Only register the handler if it hasn't been registered yet
    if (bullConvertQueue && 'process' in bullConvertQueue && !processHandlersRegistered.convert) {
      try {
        // Worker for image format conversion
        bullConvertQueue.process(async (job) => {
          // Add an id if it doesn't exist in the job object
          const jobWithId = job as { data: ConvertJobData; progress: (n: number) => Promise<void>; id: string | number };
          const { filePath, format, originalFilename, webhookUrl } = jobWithId.data;
          
          try {
            // Update progress to 10%
            await jobWithId.progress(10);
            console.log(`[Worker] Starting conversion job ${jobWithId.id || 'unknown'} for ${originalFilename}`);
            
            // Process the image
            const result = await convertImageService(filePath, format);
            
            // Update progress to 90%
            await jobWithId.progress(90);
            
            // Return output with generated paths for download
            const filename = path.basename(result.path);
            
            const jobResult = {
              originalFormat: path.extname(originalFilename).substring(1),
              convertedFormat: format,
              mime: result.mime,
              filename,
              originalFilename,
              width: result.width,
              height: result.height,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(originalFilename.replace(/\.[^/.]+$/, `.${format}`))}`
            };
            
            console.log(`[Worker] Completed conversion job ${jobWithId.id || 'unknown'}`);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(jobWithId.id || 'unknown', jobResult, webhookUrl, 'completed');
            }
            
            return jobResult;
          } catch (error) {
            console.error(`[Worker] Conversion job ${jobWithId.id || 'unknown'} failed:`, error);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(
                jobWithId.id || 'unknown', 
                null, 
                webhookUrl, 
                'failed', 
                error instanceof Error ? error.message : String(error)
              );
            }
            
            throw error;
          }
        });
        
        // Mark this handler as registered
        processHandlersRegistered.convert = true;
      } catch (err) {
        if (!redisErrorLogged) {
          console.error('[Worker] Error setting up conversion worker:', err);
          redisErrorLogged = true;
        }
      }
    }
    
    // Only register the handler if it hasn't been registered yet
    if (bullCropQueue && 'process' in bullCropQueue && !processHandlersRegistered.crop) {
      try {
        // Worker for image cropping
        bullCropQueue.process(async (job) => {
          // Add an id if it doesn't exist in the job object
          const jobWithId = job as { data: CropJobData; progress: (n: number) => Promise<void>; id: string | number };
          const { filePath, left, top, width, height, originalFilename, webhookUrl } = jobWithId.data;
          
          try {
            // Update progress to 10%
            await jobWithId.progress(10);
            console.log(`[Worker] Starting crop job ${jobWithId.id || 'unknown'} for ${originalFilename}`);
            
            // Process the image
            const result = await cropImageService(filePath, left, top, width, height);
            
            // Update progress to 90%
            await jobWithId.progress(90);
            
            // Return output with generated paths for download
            const filename = path.basename(result.path);
            
            const jobResult = {
              width: result.width,
              height: result.height,
              mime: result.mime,
              filename,
              originalFilename,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(originalFilename)}`
            };
            
            console.log(`[Worker] Completed crop job ${jobWithId.id || 'unknown'}`);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(jobWithId.id || 'unknown', jobResult, webhookUrl, 'completed');
            }
            
            return jobResult;
          } catch (error) {
            console.error(`[Worker] Crop job ${jobWithId.id || 'unknown'} failed:`, error);
            
            // Send webhook notification if URL was provided
            if (webhookUrl) {
              await sendWebhookNotification(
                jobWithId.id || 'unknown', 
                null, 
                webhookUrl, 
                'failed', 
                error instanceof Error ? error.message : String(error)
              );
            }
            
            throw error;
          }
        });
        
        // Mark this handler as registered
        processHandlersRegistered.crop = true;
      } catch (err) {
        if (!redisErrorLogged) {
          console.error('[Worker] Error setting up crop worker:', err);
          redisErrorLogged = true;
        }
      }
    }
    
    console.log('[Worker] All workers registered successfully');
  } catch (error) {
    console.error('[Worker] Error setting up Bull workers:', error);
  }
}

// Set up a periodic check for Redis availability changes
const REDIS_CHECK_INTERVAL = 12000; // Check every 12 seconds
let redisCheckerInterval: NodeJS.Timeout;
let isCheckingRedis = false;

// Function to start periodic checks
function startRedisChecker() {
  // Clear any existing interval first
  if (redisCheckerInterval) {
    clearInterval(redisCheckerInterval);
  }
  
  // Set up the interval
  redisCheckerInterval = setInterval(async () => {
    // Skip if already checking or initial setup is not complete
    if (isCheckingRedis || !initialSetupComplete) return;
    
    try {
      isCheckingRedis = true;
      
      // First check the current Redis status directly
      const isRedisAvailable = await testRedisConnection();
      
      // Check if we need to check the status of the workers
      // We only need to do this in two cases:
      // 1. Redis is available but we're not set up to use it
      // 2. Redis is not available but we're still trying to use it
      if (isRedisAvailable && !processHandlersRegistered.compress) {
        console.log('[Worker] Redis is available but worker not registered. Reconfiguring...');
        await setupWorkers();
        console.log('[Worker] Workers reconfigured after periodic check');
      }
    } catch (error) {
      // Error already logged in Redis connection functions
    } finally {
      isCheckingRedis = false;
    }
  }, REDIS_CHECK_INTERVAL);
  
  // Make sure it doesn't prevent the Node.js process from exiting
  if (redisCheckerInterval.unref) {
    redisCheckerInterval.unref();
  }
} 