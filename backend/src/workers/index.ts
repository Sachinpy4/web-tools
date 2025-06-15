/**
 * Worker process entry point
 * 
 * This file is used to start the worker processes that handle image processing jobs.
 * It can be run as a separate process to handle jobs in the background.
 */

import { compressQueue, resizeQueue, convertQueue, cropQueue, cleanOldJobs } from '../queues/imageQueue';
import './imageWorker';
import dotenv from 'dotenv';
import logger from '../utils/logger';
import { getWorkerConcurrency } from '../services/settingsService';
import os from 'os';

// Load environment variables
dotenv.config();

// Function to get dynamic concurrency settings
async function getDynamicConcurrency(): Promise<number> {
  try {
    const dynamicConcurrency = await getWorkerConcurrency();
    logger.info(`Using dynamic concurrency setting: ${dynamicConcurrency}`);
    return dynamicConcurrency;
  } catch (error) {
    logger.warn('Failed to get dynamic concurrency, using calculated default:', error);
    
    // Fallback calculation
    const cpuCount = os.cpus().length;
    const defaultConcurrency = Math.max(10, cpuCount * 2); // Minimum 10, or 2x CPU cores
    const maxConcurrency = process.env.NODE_ENV === 'production' ? cpuCount * 4 : cpuCount * 2;
    
    return Math.min(
      parseInt(process.env.WORKER_CONCURRENCY || String(defaultConcurrency)),
      maxConcurrency
    );
  }
}

// Initialize workers with dynamic concurrency
async function initializeWorkers() {
  const concurrency = await getDynamicConcurrency();
  const cpuCount = os.cpus().length;
  
  // Set concurrency for each queue
  // Need to use type assertion since the type definition is incomplete
  (compressQueue as any).concurrency = concurrency;
  (resizeQueue as any).concurrency = concurrency;
  (convertQueue as any).concurrency = concurrency;
  (cropQueue as any).concurrency = concurrency;

  // Log worker startup with detailed info
  console.log(`[Worker] Starting image processing workers`);
  console.log(`[Worker] CPU cores detected: ${cpuCount}`);
  console.log(`[Worker] Concurrency per queue: ${concurrency}`);
  console.log(`[Worker] Total concurrent jobs possible: ${concurrency * 4} (across all queues)`);
  console.log(`[Worker] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Worker] Listening for jobs on queues: compression, resize, conversion, crop`);
}

// Initialize workers
initializeWorkers().catch(err => {
  logger.error('Failed to initialize workers:', err);
  // Continue with defaults if database settings fail
});

// Clean old jobs on startup and then every hour (more frequent cleanup)
const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour instead of 24 hours
cleanOldJobs().catch(err => console.error('Error cleaning old jobs:', err));
setInterval(() => {
  cleanOldJobs().catch(err => console.error('Error cleaning old jobs:', err));
}, CLEANUP_INTERVAL);

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, shutting down gracefully...');
  
  // Close all queue connections
  await Promise.all([
    compressQueue.close(),
    resizeQueue.close(),
    convertQueue.close(),
    cropQueue.close(),
  ]);
  
  console.log('[Worker] All queue connections closed, exiting.');
  process.exit(0);
});

// Export queues for testing or direct access
export {
  compressQueue,
  resizeQueue,
  convertQueue,
  cropQueue,
}; 