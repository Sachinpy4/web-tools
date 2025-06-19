import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { CompressJobData } from '../dto/compress-image.dto';
import { RedisStatusService } from '../../../common/services/redis-status.service';
import { SettingsCacheService } from '../../../common/services/settings-cache.service';

// Local Queue implementation (same as original)
class LocalQueue<T = any> {
  private jobs: Map<string, { id: string; data: T; status: string; result?: any; error?: string }> = new Map();
  private processor: (data: T) => Promise<any>;
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async add(data: T): Promise<{ id: string }> {
    const id = `local_${uuidv4()}`;
    this.jobs.set(id, { id, data, status: 'waiting' });
    
    // Process immediately (same as original)
    setTimeout(() => this.processJob(id), 0);
    
    return { id };
  }

  process(processor: (data: T) => Promise<any>): void {
    this.processor = processor;
  }

  private async processJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || !this.processor) return;

    job.status = 'active';
    
    try {
      const result = await this.processor(job.data);
      job.result = result;
      job.status = 'completed';
    } catch (error) {
      job.error = error.message;
      job.status = 'failed';
    }
  }

  async getJob(id: string): Promise<any> {
    const job = this.jobs.get(id);
    if (!job) return null;

    return {
      id: job.id,
      data: job.data,
      state: job.status,
      progress: job.status === 'completed' ? 100 : job.status === 'active' ? 50 : 0,
      result: job.result,
      error: job.error,
    };
  }

  async clean(): Promise<void> {
    // Remove completed jobs older than 1 hour (same as original)
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(id);
      }
    }
  }
}

export interface QueueOptions {
  attempts?: number;
  backoff?: { type: 'exponential' | 'fixed'; delay: number; };
  delay?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private recreatingQueues = false;
  
  // Queues (migrated to BullMQ)
  private compressQueue: Queue<CompressJobData> | LocalQueue<CompressJobData>;
  private resizeQueue: Queue<any> | LocalQueue<any>;
  private convertQueue: Queue<any> | LocalQueue<any>;
  private cropQueue: Queue<any> | LocalQueue<any>;
  private batchQueue: Queue<any> | LocalQueue<any>;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisStatusService: RedisStatusService,
    private readonly settingsCacheService: SettingsCacheService,
  ) {}

  async onModuleInit() {
    this.logger.log('🔍 DEBUG - QueueService onModuleInit called');
    try {
      await this.initializeQueues();
      this.logger.log('🔍 DEBUG - QueueService initialization completed');
      this.setupRedisStatusListener();
      this.logger.log('🔍 DEBUG - Redis status listener setup completed');
    } catch (error) {
      this.logger.error('❌ Error during QueueService initialization:', error);
      this.logger.error('🔍 DEBUG - QueueService init error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    // Remove Redis status listener
    this.redisStatusService.removeAllListeners('statusChanged');
    
    // Close Bull queues gracefully if they exist
    if (this.isUsingRedisQueues()) {
      await this.closeQueuesGracefully();
    }
  }

  // Initialize queues based on Redis status (using global Redis status service)
  private async initializeQueues(): Promise<void> {
    this.logger.log('🔍 DEBUG - initializeQueues called');
    this.logger.log('🔍 DEBUG - Redis available:', this.redisStatusService.isRedisAvailable);
    
    if (this.redisStatusService.isRedisAvailable) {
      this.logger.log('🔍 DEBUG - Redis is available, switching to Bull queues...');
      await this.switchToBullQueues();
    } else {
      this.logger.log('🔍 DEBUG - Redis is not available, switching to local queues...');
      this.switchToLocalQueues();
    }
    this.logger.log('🔍 DEBUG - Queue initialization completed');
  }

  // Setup Redis status listener (same pattern as original)
  private setupRedisStatusListener(): void {
    this.redisStatusService.on('statusChanged', async (isAvailable: boolean) => {
      this.logger.log(`[Queue] Redis status changed to: ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
      
      // If Redis just became available and we're in local mode, switch to Redis mode
      if (isAvailable && !this.isUsingRedisQueues()) {
        this.logger.log('[Queue] Redis is now available! Switching from local to Redis queues...');
        
        // Prevent concurrent queue recreation
        if (this.recreatingQueues) {
          return;
        }
        
        this.recreatingQueues = true;
        
        try {
          await this.switchToBullQueues();
          this.logger.log('🔄 Processing mode changed: Queued (Redis) - Automatic switch');
        } catch (error) {
          this.logger.error('[Queue] Failed to recreate queues with Redis:', error);
          // Ensure we're still using local queues if recreation fails
          this.switchToLocalQueues();
        } finally {
          this.recreatingQueues = false;
        }
      }
      
      // If Redis just became unavailable and we're in Redis mode, switch to local mode
      if (!isAvailable && this.isUsingRedisQueues()) {
        this.logger.log('[Queue] Redis is no longer available. Switching to local queues...');
        
        // If we're already handling the transition, don't do anything
        if (this.recreatingQueues) {
          return;
        }
        
        this.recreatingQueues = true;
        
        try {
          // Start queue cleanup in background (non-blocking)
          this.closeQueuesGracefully(); // Remove await - don't wait for Bull.js cleanup
          
          // Immediately create local queues
          this.switchToLocalQueues();
          
          this.logger.log('🔄 Processing mode changed: Direct (Local) - Automatic switch');
        } catch (err) {
          this.logger.error('[Queue] Error during queue transition to local mode:', err);
          
          // Force switch to local queues even if cleanup failed
          this.switchToLocalQueues();
        } finally {
          this.recreatingQueues = false;
        }
      }
    });
  }

  // Check if currently using Redis queues
  private isUsingRedisQueues(): boolean {
    return this.compressQueue && 'close' in this.compressQueue;
  }

  // Gracefully close Bull queues with timeout to prevent hanging
  private async closeQueuesGracefully(): Promise<void> {
    this.logger.log('🧹 Starting queue cleanup...');
    
    // Force immediate switch to prevent new operations
    const bullQueues = [
      { queue: this.compressQueue, name: 'compress' },
      { queue: this.resizeQueue, name: 'resize' },
      { queue: this.convertQueue, name: 'convert' },
      { queue: this.cropQueue, name: 'crop' },
      { queue: this.batchQueue, name: 'batch' }
    ];

    // First, immediately clear references to prevent new operations
    this.compressQueue = null as any;
    this.resizeQueue = null as any;
    this.convertQueue = null as any;
    this.cropQueue = null as any;
    this.batchQueue = null as any;
    
    this.logger.log('🔄 Queue references cleared, attempting graceful cleanup...');

    // Try to close Bull queues in the background without blocking
    const cleanupPromises = bullQueues.map(async ({ queue, name }) => {
      if (queue && 'close' in queue) {
        try {
          // Set a very short timeout to prevent hanging
          const closePromise = queue.close();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${name} queue close timeout`)), 1500) // Reduced to 1.5 seconds
          );
          
          await Promise.race([closePromise, timeoutPromise]);
          this.logger.log(`✅ Closed ${name} queue successfully`);
        } catch (error) {
          this.logger.warn(`⚠️ Failed to close ${name} queue (expected when Redis is down):`, error.message);
          
          // Try to force disconnect the Redis connection if possible
          try {
            const client = await queue.client;
            if (client && client.disconnect) {
              await client.disconnect();
            }
            if (client && client.quit) {
              await client.quit();
            }
          } catch (disconnectError) {
            // Ignore disconnect errors - they're expected when Redis is down
          }
          
          // Try to remove all listeners to prevent memory leaks
          try {
            if (queue.removeAllListeners) {
              queue.removeAllListeners();
            }
          } catch (listenerError) {
            // Ignore listener cleanup errors
          }
        }
      }
    });

    // Don't wait for cleanup to complete - run in background with better error handling
    Promise.allSettled(cleanupPromises).then((results) => {
      this.logger.log('🧹 Background queue cleanup completed');
      
      // Log any unexpected errors (not Redis connection errors)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const queueName = bullQueues[index]?.name || 'unknown';
          const error = result.reason;
          
          // Only log if it's not a Redis connection error
          if (error && !error.message?.includes('Redis') && !error.message?.includes('Connection')) {
            this.logger.warn(`Unexpected error during ${queueName} queue cleanup:`, error.message);
          }
        }
      });
    }).catch((error) => {
      // This should never happen with Promise.allSettled, but just in case
      this.logger.warn('Error during background cleanup completion:', error.message);
    });
    
    this.logger.log('✅ Queue cleanup initiated (running in background)');
  }

  // Switch to Bull queues (using Redis status service configuration)
  private async switchToBullQueues(): Promise<void> {
    try {
      this.logger.log('🔍 DEBUG - switchToBullQueues called');
      
      this.logger.log('🔍 DEBUG - Getting Redis config...');
      const redisConfig = this.redisStatusService.getRedisConfig();
      this.logger.log('🔍 DEBUG - Redis config:', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db,
        hasPassword: !!redisConfig.password
      });

      // Create BullMQ queues with error event handlers to prevent unhandled rejections
      this.logger.log('🔍 DEBUG - Creating BullMQ queues...');
      
      this.logger.log('🔍 DEBUG - Creating compress queue...');
      this.compressQueue = new Queue<CompressJobData>('image-compression', { connection: redisConfig });
      this.logger.log('🔍 DEBUG - Compress queue created');
      
      this.logger.log('🔍 DEBUG - Creating resize queue...');
      this.resizeQueue = new Queue('image-resize', { connection: redisConfig });
      this.logger.log('🔍 DEBUG - Resize queue created');
      
      this.logger.log('🔍 DEBUG - Creating convert queue...');
      this.convertQueue = new Queue('image-convert', { connection: redisConfig });
      this.logger.log('🔍 DEBUG - Convert queue created');
      
      this.logger.log('🔍 DEBUG - Creating crop queue...');
      this.cropQueue = new Queue('image-crop', { connection: redisConfig });
      this.logger.log('🔍 DEBUG - Crop queue created');
      
      this.logger.log('🔍 DEBUG - Creating batch queue...');
      this.batchQueue = new Queue('image-batch', { connection: redisConfig });
      this.logger.log('🔍 DEBUG - Batch queue created');

      // Add error handlers to all queues to prevent unhandled rejections
      const queues = [
        { queue: this.compressQueue, name: 'compress' },
        { queue: this.resizeQueue, name: 'resize' },
        { queue: this.convertQueue, name: 'convert' },
        { queue: this.cropQueue, name: 'crop' },
        { queue: this.batchQueue, name: 'batch' }
      ];

      this.logger.log('🔍 DEBUG - Setting up error handlers for queues...');
      queues.forEach(async ({ queue, name }) => {
        if (queue && 'on' in queue) {
          queue.on('error', (error) => {
            this.logger.warn(`⚠️ ${name} queue error (handled):`, error.message);
          });

          // Handle Redis client errors if accessible
          try {
            const client = await queue.client;
            if (client && client.on) {
              client.on('error', (error) => {
                this.logger.warn(`⚠️ ${name} queue Redis client error (handled):`, error.message);
              });
            }
          } catch (clientError) {
            // Ignore client access errors
            this.logger.debug(`Could not access client for ${name} queue:`, clientError.message);
          }
        }
      });

      this.logger.log('✅ Switched to Bull queues with Redis');
    } catch (error) {
      this.logger.error('❌ Failed to switch to Bull queues:', error);
      this.logger.error('🔍 DEBUG - switchToBullQueues error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      this.switchToLocalQueues();
    }
  }

  // Switch to local queues (same as original)
  private switchToLocalQueues(): void {
    this.logger.log('🔄 Creating local queues...');
    
    this.compressQueue = new LocalQueue<CompressJobData>('image-compression');
    this.resizeQueue = new LocalQueue('image-resize');
    this.convertQueue = new LocalQueue('image-convert');
    this.cropQueue = new LocalQueue('image-crop');
    this.batchQueue = new LocalQueue('image-batch');

    this.logger.log('✅ Switched to local queues successfully');  
    this.logger.log(`🔍 Queue types: compress=${typeof this.compressQueue}, resize=${typeof this.resizeQueue}`);
  }

  // Add job to queue with dynamic settings
  async addCompressJob(data: CompressJobData, options?: QueueOptions): Promise<string> {
    console.log('🔍 QUEUE SERVICE - Adding compress job:', data);
    
    try {
      // Get dynamic options from system settings
      const dynamicOptions = await this.getDynamicQueueOptions(options);
      
      // BullMQ requires job name, LocalQueue doesn't
      const job = this.isUsingRedisQueues() 
        ? await (this.compressQueue as Queue).add('compress-image', data, dynamicOptions)
        : await (this.compressQueue as LocalQueue<CompressJobData>).add(data);

      const jobId = (job as any).id?.toString() || (job as any).id;
      console.log('✅ QUEUE SERVICE - Compress job added with dynamic settings:', {
        jobId,
        attempts: dynamicOptions.attempts,
        timeout: dynamicOptions.timeout
      });
      return jobId;
    } catch (error) {
      console.error('❌ QUEUE SERVICE - Failed to add compress job:', error);
      this.logger.error('Failed to add compress job:', error);
      throw error;
    }
  }

  async addResizeJob(data: any, options?: QueueOptions): Promise<string> {
    try {
      // Get dynamic options from system settings
      const dynamicOptions = await this.getDynamicQueueOptions(options);
      
      // BullMQ requires job name, LocalQueue doesn't
      const job = this.isUsingRedisQueues() 
        ? await (this.resizeQueue as any).add('resize-image', data, dynamicOptions)
        : await this.resizeQueue.add(data, dynamicOptions as any);

      const jobId = (job as any).id?.toString() || (job as any).id;
      this.logger.log(`Added resize job with dynamic settings: ${jobId} (${dynamicOptions.attempts} attempts, ${dynamicOptions.timeout}ms timeout)`);
      return jobId;
    } catch (error) {
      this.logger.error('Failed to add resize job:', error);
      throw error;
    }
  }

  async addConvertJob(data: any, options?: QueueOptions): Promise<string> {
    try {
      // Get dynamic options from system settings
      const dynamicOptions = await this.getDynamicQueueOptions(options);
      
      // BullMQ requires job name, LocalQueue doesn't
      const job = this.isUsingRedisQueues() 
        ? await (this.convertQueue as Queue).add('convert-image', data, dynamicOptions)
        : await this.convertQueue.add(data, dynamicOptions as any);

      const jobId = (job as any).id?.toString() || (job as any).id;
      this.logger.log(`Added convert job with dynamic settings: ${jobId} (${dynamicOptions.attempts} attempts, ${dynamicOptions.timeout}ms timeout)`);
      return jobId;
    } catch (error) {
      this.logger.error('Failed to add convert job:', error);
      throw error;
    }
  }

  async addCropJob(data: any, options?: QueueOptions): Promise<string> {
    try {
      // Get dynamic options from system settings
      const dynamicOptions = await this.getDynamicQueueOptions(options);
      
      // BullMQ requires job name, LocalQueue doesn't
      const job = this.isUsingRedisQueues() 
        ? await (this.cropQueue as Queue).add('crop-image', data, dynamicOptions)
        : await this.cropQueue.add(data, dynamicOptions as any);

      const jobId = (job as any).id?.toString() || (job as any).id;
      this.logger.log(`Added crop job with dynamic settings: ${jobId} (${dynamicOptions.attempts} attempts, ${dynamicOptions.timeout}ms timeout)`);
      return jobId;
    } catch (error) {
      this.logger.error('Failed to add crop job:', error);
      throw error;
    }
  }

  async addBatchJob(data: any, options?: QueueOptions): Promise<string> {
    try {
      // Get dynamic options from system settings
      const dynamicOptions = await this.getDynamicQueueOptions(options);
      
      // BullMQ requires job name, LocalQueue doesn't
      const job = this.isUsingRedisQueues() 
        ? await (this.batchQueue as Queue).add('batch-process', data, dynamicOptions)
        : await this.batchQueue.add(data, dynamicOptions as any);

      const jobId = (job as any).id?.toString() || (job as any).id;
      this.logger.log(`Added batch job with dynamic settings: ${jobId} (${dynamicOptions.attempts} attempts, ${dynamicOptions.timeout}ms timeout)`);
      return jobId;
    } catch (error) {
      this.logger.error('Failed to add batch job:', error);
      throw error;
    }
  }

  // Get job status (same API as original)
  async getJobStatus(jobId: string, queueType: string): Promise<any> {
    try {
      console.log('🔍 QUEUE SERVICE - Getting job status:', { jobId, queueType });
      
      let queue: Queue<any> | LocalQueue<any>;
      
      switch (queueType) {
        case 'compress':
          queue = this.compressQueue;
          break;
        case 'resize':
          queue = this.resizeQueue;
          break;
        case 'convert':
          queue = this.convertQueue;
          break;
        case 'crop':
          queue = this.cropQueue;
          break;
        case 'batch':
          queue = this.batchQueue;
          break;
        default:
          throw new Error(`Unknown queue type: ${queueType}`);
      }

      console.log('🔍 QUEUE SERVICE - Using queue:', queue.constructor.name);
      
      const job = await queue.getJob(jobId);
      console.log('🔍 QUEUE SERVICE - Raw job object:', job);
      
      if (!job) {
        console.log('❌ QUEUE SERVICE - Job not found in queue:', jobId);
        return null;
      }

      // Handle BullMQ vs LocalQueue differently
      let state = 'unknown';
      let progress = 0;
      let result = null;
      let error = null;

      if (this.isUsingRedisQueues()) {
        // BullMQ job - use BullMQ properties and methods
        try {
          // BullMQ jobs have direct properties
          state = (job as any).finishedOn 
            ? ((job as any).failedReason ? 'failed' : 'completed')
            : (job as any).processedOn 
              ? 'active' 
              : 'waiting';
          
          progress = (job as any).progress || 0;
          result = (job as any).returnvalue;
          error = (job as any).failedReason;
          
          console.log('🔍 QUEUE SERVICE - BullMQ job state details:', {
            state,
            progress,
            hasResult: !!result,
            hasError: !!error,
            processedOn: (job as any).processedOn,
            finishedOn: (job as any).finishedOn,
            failedReason: (job as any).failedReason
          });
        } catch (stateError) {
          console.log('⚠️ QUEUE SERVICE - Could not get BullMQ state, using fallback');
          // Fallback for BullMQ
          state = 'waiting';
          progress = 0;
        }
      } else {
        // Local queue
        state = (job as any).state || 'unknown';
        progress = (job as any).progress || 0;
        result = (job as any).result;
        error = (job as any).error;
        
        console.log('🔍 QUEUE SERVICE - LocalQueue job state details:', {
          state,
          progress,
          hasResult: !!result,
          hasError: !!error
        });
      }

      const status = {
        id: job.id,
        state,
        progress,
        result,
        error,
        queuePosition: (job as any).queuePosition,
        estimatedWaitTime: (job as any).estimatedWaitTime,
      };
      
      console.log('✅ QUEUE SERVICE - Job status result:', status);
      return status;
    } catch (error) {
      console.error('❌ QUEUE SERVICE - Failed to get job status:', { jobId, queueType, error: error.message });
      this.logger.error(`Failed to get job status for ${jobId}:`, error);
      return null;
    }
  }

  // Cleanup (same as original)
  async cleanup(): Promise<void> {
    try {
      if (this.compressQueue instanceof LocalQueue) {
        await this.compressQueue.clean();
      }
      if (this.resizeQueue instanceof LocalQueue) {
        await this.resizeQueue.clean();
      }
      if (this.convertQueue instanceof LocalQueue) {
        await this.convertQueue.clean();
      }
      if (this.cropQueue instanceof LocalQueue) {
        await this.cropQueue.clean();
      }
      if (this.batchQueue instanceof LocalQueue) {
        await this.batchQueue.clean();
      }
      
      this.logger.log('Queue cleanup completed');
    } catch (error) {
      this.logger.error('Queue cleanup failed:', error);
    }
  }

  // Get queue statistics (using Redis status service)
  async getQueueStats(): Promise<any> {
    try {
      console.log('🔍 QUEUE SERVICE - Getting queue stats, Redis available:', this.redisStatusService.isRedisAvailable);
      
      const stats = {
        redis: this.redisStatusService.isRedisAvailable ? 'available' : 'unavailable',
        mode: this.redisStatusService.isRedisAvailable ? 'queued' : 'direct',
        queues: {
          compress: await this.getQueueInfo(this.compressQueue),
          resize: await this.getQueueInfo(this.resizeQueue),
          convert: await this.getQueueInfo(this.convertQueue),
          crop: await this.getQueueInfo(this.cropQueue),
          batch: await this.getQueueInfo(this.batchQueue),
        },
      };

      console.log('✅ QUEUE SERVICE - Queue stats result:', stats);
      return stats;
    } catch (error) {
      console.error('❌ QUEUE SERVICE - Failed to get queue stats:', error);
      this.logger.error('Failed to get queue stats:', error);
      return { redis: 'unavailable', mode: 'direct', error: error.message };
    }
  }

  private async getQueueInfo(queue: Queue<any> | LocalQueue<any>): Promise<any> {
    if (this.isUsingRedisQueues() && 'getWaiting' in queue) {
      // BullMQ queue - use BullMQ methods
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          (queue as Queue<any>).getWaiting(),
          (queue as Queue<any>).getActive(),
          (queue as Queue<any>).getCompleted(),
          (queue as Queue<any>).getFailed(),
        ]);

        return {
          type: 'bullmq',
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        };
      } catch (error) {
        console.warn('Failed to get BullMQ queue info:', error);
        return {
          type: 'bullmq',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          error: error.message,
        };
      }
    } else {
      // Local queue
      return {
        type: 'local',
        // Local queue doesn't track detailed stats
        status: 'active',
      };
    }
  }

  // Process queues (for worker setup)
  getCompressQueue(): Queue<CompressJobData> | LocalQueue<CompressJobData> {
    this.logger.log('🔍 DEBUG - getCompressQueue called');
    this.logger.log('🔍 DEBUG - Compress queue details:', {
      exists: !!this.compressQueue,
      type: this.compressQueue ? this.compressQueue.constructor.name : 'null',
      hasProcess: this.compressQueue ? 'process' in this.compressQueue : false,
      isUsingRedis: this.isUsingRedisQueues()
    });
    return this.compressQueue;
  }

  getResizeQueue(): Queue<any> | LocalQueue<any> {
    return this.resizeQueue;
  }

  getConvertQueue(): Queue<any> | LocalQueue<any> {
    return this.convertQueue;
  }

  getCropQueue(): Queue<any> | LocalQueue<any> {
    return this.cropQueue;
  }

  getBatchQueue(): Queue<any> | LocalQueue<any> {
    return this.batchQueue;
  }

  // Quick Redis availability check without expensive operations (optimization)
  isRedisQuickAvailable(): boolean {
    return this.redisStatusService.isRedisAvailable;
  }

  // Cache for dynamic queue options to avoid repeated DB calls
  private cachedQueueOptions: any = null;
  private queueOptionsCacheExpiry: number = 0;
  private readonly QUEUE_CACHE_TTL = 30000; // 30 seconds

  /**
   * Get dynamic queue options from system settings (optimized with local cache)
   */
  private async getDynamicQueueOptions(customOptions?: QueueOptions): Promise<any> {
    const now = Date.now();
    
    // Use cached options if still valid (30-second cache for high performance)
    if (this.cachedQueueOptions && now < this.queueOptionsCacheExpiry) {
      return {
        ...this.cachedQueueOptions,
        ...customOptions // Custom options override cached ones
      };
    }

    try {
      const settings = await this.settingsCacheService.getSettings();
      
      this.cachedQueueOptions = {
        attempts: settings.jobRetryAttempts || 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 10,
        removeOnFail: 5,
        delay: 0,
        timeout: settings.jobTimeoutMs || 180000, // 3 minutes default
      };
      
      this.queueOptionsCacheExpiry = now + this.QUEUE_CACHE_TTL;
      
      return {
        ...this.cachedQueueOptions,
        ...customOptions // Custom options override cached ones
      };
    } catch (error) {
      this.logger.warn('Failed to get dynamic queue options, using defaults:', error);
      
      // Cache fallback options too
      this.cachedQueueOptions = {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 10,
        removeOnFail: 5,
        delay: 0,
        timeout: 180000,
      };
      
      this.queueOptionsCacheExpiry = now + this.QUEUE_CACHE_TTL;
      
      return {
        ...this.cachedQueueOptions,
        ...customOptions
      };
    }
  }

  /**
   * Clear queue options cache when settings change
   */
  clearQueueOptionsCache(): void {
    this.cachedQueueOptions = null;
    this.queueOptionsCacheExpiry = 0;
  }
} 