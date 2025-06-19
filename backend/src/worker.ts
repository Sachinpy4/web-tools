import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { QueueService } from './modules/images/services/queue.service';
import { ImageService } from './modules/images/services/image.service';
import { RedisStatusService } from './common/services/redis-status.service';
import { SettingsCacheService } from './common/services/settings-cache.service';
import { Worker } from 'bullmq';
import axios from 'axios';
import path from 'path';

class ImageWorker {
  private readonly logger = new Logger(ImageWorker.name);
  private processHandlersRegistered = {
    compress: false,
    resize: false,
    convert: false,
    crop: false,
    batch: false,
  };

  // BullMQ Workers
  private compressWorker: Worker | null = null;
  private resizeWorker: Worker | null = null;
  private convertWorker: Worker | null = null;
  private cropWorker: Worker | null = null;
  private batchWorker: Worker | null = null;

  constructor(
    private readonly queueService: QueueService,
    private readonly imageService: ImageService,
    private readonly redisStatusService: RedisStatusService,
    private readonly settingsCacheService: SettingsCacheService,
  ) {}

  async start() {
    this.logger.log('🚀 Starting Image Processing Worker...');
    this.logger.log('🔍 DEBUG - Worker start method called');

    try {
      // Setup processors for each queue (migrated to BullMQ)
      this.logger.log('🔍 DEBUG - Setting up compress processor...');
      await this.setupCompressProcessor();
      this.logger.log('🔍 DEBUG - Compress processor setup completed');
      
      this.logger.log('🔍 DEBUG - Setting up resize processor...');
      await this.setupResizeProcessor();
      this.logger.log('🔍 DEBUG - Resize processor setup completed');
      
      this.logger.log('🔍 DEBUG - Setting up convert processor...');
      await this.setupConvertProcessor();
      this.logger.log('🔍 DEBUG - Convert processor setup completed');
      
      this.logger.log('🔍 DEBUG - Setting up crop processor...');
      await this.setupCropProcessor();
      this.logger.log('🔍 DEBUG - Crop processor setup completed');
      
      this.logger.log('🔍 DEBUG - Setting up batch processor...');
      await this.setupBatchProcessor();
      this.logger.log('🔍 DEBUG - Batch processor setup completed');

      // Setup Redis status listener
      this.logger.log('🔍 DEBUG - Setting up Redis status listener...');
      this.setupRedisStatusListener();
      this.logger.log('🔍 DEBUG - Redis status listener setup completed');

      this.logger.log('✅ All queue processors initialized');
    } catch (error) {
      this.logger.error('❌ Error during worker start:', error);
      this.logger.error('🔍 DEBUG - Worker start error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  // Cleanup BullMQ workers properly
  async cleanup() {
    this.logger.log('🧹 Cleaning up BullMQ workers...');
    
    if (this.compressWorker) await this.compressWorker.close();
    if (this.resizeWorker) await this.resizeWorker.close();
    if (this.convertWorker) await this.convertWorker.close();
    if (this.cropWorker) await this.cropWorker.close();
    if (this.batchWorker) await this.batchWorker.close();

    this.logger.log('✅ All BullMQ workers cleaned up');
  }

  // COMPRESS PROCESSOR - Fixed BullMQ Worker pattern
  private async setupCompressProcessor() {
    try {
      this.logger.log('🔍 DEBUG - setupCompressProcessor called');
      
      if (this.processHandlersRegistered.compress) {
        this.logger.log('🔍 DEBUG - Compress processor already registered, skipping');
        return;
      }

      this.logger.log('🔍 DEBUG - Getting compress queue from service...');
      const compressQueue = this.queueService.getCompressQueue();
      this.logger.log('🔍 DEBUG - Compress queue retrieved:', {
        exists: !!compressQueue,
        type: compressQueue ? compressQueue.constructor.name : 'null',
        hasProcess: compressQueue ? 'process' in compressQueue : false
      });
      
      this.processHandlersRegistered.compress = true;
      this.logger.log('✅ Registering compress processor');
      
      // For BullMQ queues, create Worker
      if (compressQueue.constructor.name === 'Queue') {
        this.logger.log('🔍 DEBUG - Queue is BullMQ type, creating worker...');
        
        this.logger.log('🔍 DEBUG - Getting Redis config...');
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.log(`🔍 Creating BullMQ compress worker with Redis config:`, { 
          host: redisConfig.host, 
          port: redisConfig.port, 
          db: redisConfig.db 
        });
        
        try {
          this.logger.log('🔍 DEBUG - Creating Worker instance...');
          const concurrency = await this.getWorkerConcurrency();
          this.compressWorker = new Worker('image-compression', async (job) => {
            const { filePath, quality, originalFilename, originalSize, webhookUrl } = job.data;
          
            try {
              this.logger.log(`Processing compress job ${job.id}: ${originalFilename}`);
              
              // Update progress (BullMQ style)
              await job.updateProgress(10);
              
              // Process image
              const result = await this.imageService.compressImage(filePath, quality, originalFilename);
              
              await job.updateProgress(90);
              
              // Prepare response
              const response = {
                jobId: job.id.toString(),
                status: 'completed',
                message: 'Image compression completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalSize: originalSize,
                compressedSize: result.processedSize,
                compressionRatio: result.compressionRatio,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
              };
              
              // Send webhook if provided
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for job ${job.id}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for job ${job.id}:`, webhookError.message);
                }
              }
              
              // Cleanup original file
              await this.imageService.cleanup(filePath);
              
              await job.updateProgress(100);
              return response;
              
            } catch (error) {
              this.logger.error(`Compress job ${job.id} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          }, { 
            connection: redisConfig,
            concurrency: concurrency
          });
          
          this.logger.log('🔍 DEBUG - Worker instance created, setting up event listeners...');
          
          // Add event listeners for debugging
          this.compressWorker.on('ready', () => {
            this.logger.log('✅ BullMQ compress worker is ready and connected');
          });
          
          this.compressWorker.on('error', (error) => {
            this.logger.error('❌ BullMQ compress worker error:', error);
          });
          
          this.compressWorker.on('failed', (job, err) => {
            this.logger.error(`❌ BullMQ compress job ${job?.id} failed:`, err);
          });
          
          this.compressWorker.on('completed', (job, result) => {
            this.logger.log(`✅ BullMQ compress job ${job.id} completed successfully`);
          });
          
          this.logger.log('✅ BullMQ compress worker created successfully');
        } catch (workerError) {
          this.logger.error('❌ Failed to create BullMQ compress worker:', workerError);
          this.logger.error('🔍 DEBUG - Worker creation error details:', {
            message: workerError.message,
            stack: workerError.stack,
            name: workerError.name
          });
          throw workerError;
        }
      } else {
        // For LocalQueue, use original .process() method
        this.logger.log('🔍 DEBUG - Queue is LocalQueue type, setting up local processor...');
        if ('process' in compressQueue) {
          compressQueue.process(async (jobOrData: any) => {
            // Handle LocalQueue data (direct data)
            const jobData = jobOrData.data || jobOrData;
            const jobId = jobOrData.id || 'local-job';
            
            const { filePath, quality, originalFilename, originalSize, webhookUrl } = jobData;
            
            try {
              this.logger.log(`Processing compress job ${jobId}: ${originalFilename}`);
              
              // Process image
              const result = await this.imageService.compressImage(filePath, quality, originalFilename);
              
              // Prepare response
              const response = {
                jobId: jobId.toString(),
                status: 'completed',
                message: 'Image compression completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalSize: originalSize,
                compressedSize: result.processedSize,
                compressionRatio: result.compressionRatio,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
              };
              
              // Send webhook if provided
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for job ${jobId}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for job ${jobId}:`, webhookError.message);
                }
              }
              
              // Cleanup original file
              await this.imageService.cleanup(filePath);
              
              return response;
              
            } catch (error) {
              this.logger.error(`Compress job ${jobId} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          });
          this.logger.log('✅ LocalQueue compress processor registered');
        }
      }
    } catch (error) {
      this.logger.error('❌ Error in setupCompressProcessor:', error);
      this.logger.error('🔍 DEBUG - setupCompressProcessor error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  private async setupResizeProcessor() {
    try {
      this.logger.log('🔍 DEBUG - setupResizeProcessor called');
      
      if (this.processHandlersRegistered.resize) {
        this.logger.log('🔍 DEBUG - Resize processor already registered, skipping');
        return;
      }

      this.logger.log('🔍 DEBUG - Getting resize queue from service...');
      const resizeQueue = this.queueService.getResizeQueue();
      this.logger.log('🔍 DEBUG - Resize queue retrieved:', {
        exists: !!resizeQueue,
        type: resizeQueue ? resizeQueue.constructor.name : 'null',
        hasProcess: resizeQueue ? 'process' in resizeQueue : false
      });
      
      this.processHandlersRegistered.resize = true;
      this.logger.log('✅ Registering resize processor');
      
      // For BullMQ queues, create Worker
      if (resizeQueue.constructor.name === 'Queue') {
        this.logger.log('🔍 DEBUG - Queue is BullMQ type, creating resize worker...');
        
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.log(`🔍 Creating BullMQ resize worker with Redis config:`, { 
          host: redisConfig.host, 
          port: redisConfig.port, 
          db: redisConfig.db 
        });
        
        try {
          this.resizeWorker = new Worker('image-resize', async (job) => {
            const { filePath, width, height, maintainAspectRatio, originalFilename, webhookUrl } = job.data;
          
            try {
              this.logger.log(`Processing resize job ${job.id}: ${originalFilename}`);
              
              await job.updateProgress(10);
              
              // Process image
              const result = await this.imageService.resizeImage(filePath, width, height, originalFilename, maintainAspectRatio);
              
              await job.updateProgress(90);
              
              // Prepare response
              const response = {
                jobId: job.id.toString(),
                status: 'completed',
                message: 'Image resize completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
                width: result.dimensions.width,
                height: result.dimensions.height,
                mime: `image/${path.extname(originalFilename).slice(1)}`,
              };
              
              // Send webhook if provided
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for resize job ${job.id}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for resize job ${job.id}:`, webhookError.message);
                }
              }
              
              // Cleanup original file
              await this.imageService.cleanup(filePath);
              
              await job.updateProgress(100);
              return response;
              
            } catch (error) {
              this.logger.error(`Resize job ${job.id} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          }, { connection: redisConfig });
          
          // Add event listeners
          this.resizeWorker.on('ready', () => {
            this.logger.log('✅ BullMQ resize worker is ready and connected');
          });
          
          this.resizeWorker.on('error', (error) => {
            this.logger.error('❌ BullMQ resize worker error:', error);
          });
          
          this.resizeWorker.on('failed', (job, err) => {
            this.logger.error(`❌ BullMQ resize job ${job?.id} failed:`, err);
          });
          
          this.resizeWorker.on('completed', (job, result) => {
            this.logger.log(`✅ BullMQ resize job ${job.id} completed successfully`);
          });
          
          this.logger.log('✅ BullMQ resize worker created successfully');
        } catch (workerError) {
          this.logger.error('❌ Failed to create BullMQ resize worker:', workerError);
          throw workerError;
        }
      } else {
        // For LocalQueue, use original .process() method
        this.logger.log('🔍 DEBUG - Queue is LocalQueue type, setting up local resize processor...');
        if ('process' in resizeQueue) {
          resizeQueue.process(async (jobOrData: any) => {
            const jobData = jobOrData.data || jobOrData;
            const jobId = jobOrData.id || 'local-job';
            
            const { filePath, width, height, maintainAspectRatio, originalFilename, webhookUrl } = jobData;
            
            try {
              this.logger.log(`Processing resize job ${jobId}: ${originalFilename}`);
              
              const result = await this.imageService.resizeImage(filePath, width, height, originalFilename, maintainAspectRatio);
              
              const response = {
                jobId: jobId.toString(),
                status: 'completed',
                message: 'Image resize completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
                width: result.dimensions.width,
                height: result.dimensions.height,
                mime: `image/${path.extname(originalFilename).slice(1)}`,
              };
              
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for resize job ${jobId}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for resize job ${jobId}:`, webhookError.message);
                }
              }
              
              await this.imageService.cleanup(filePath);
              return response;
              
            } catch (error) {
              this.logger.error(`Resize job ${jobId} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          });
          this.logger.log('✅ LocalQueue resize processor registered');
        }
      }
    } catch (error) {
      this.logger.error('❌ Error in setupResizeProcessor:', error);
      throw error;
    }
  }

  private async setupConvertProcessor() {
    try {
      this.logger.log('🔍 DEBUG - setupConvertProcessor called');
      
      if (this.processHandlersRegistered.convert) {
        this.logger.log('🔍 DEBUG - Convert processor already registered, skipping');
        return;
      }

      this.logger.log('🔍 DEBUG - Getting convert queue from service...');
      const convertQueue = this.queueService.getConvertQueue();
      this.logger.log('🔍 DEBUG - Convert queue retrieved:', {
        exists: !!convertQueue,
        type: convertQueue ? convertQueue.constructor.name : 'null',
        hasProcess: convertQueue ? 'process' in convertQueue : false
      });
      
      this.processHandlersRegistered.convert = true;
      this.logger.log('✅ Registering convert processor');
      
      // For BullMQ queues, create Worker
      if (convertQueue.constructor.name === 'Queue') {
        this.logger.log('🔍 DEBUG - Queue is BullMQ type, creating convert worker...');
        
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.log(`🔍 Creating BullMQ convert worker with Redis config:`, { 
          host: redisConfig.host, 
          port: redisConfig.port, 
          db: redisConfig.db 
        });
        
        try {
          this.convertWorker = new Worker('image-convert', async (job) => {
            const { filePath, format, quality, originalFilename, webhookUrl } = job.data;
          
            try {
              this.logger.log(`Processing convert job ${job.id}: ${originalFilename} to ${format}`);
              
              await job.updateProgress(10);
              
              // Process image
              const result = await this.imageService.convertFormat(filePath, format, originalFilename, quality);
              
              await job.updateProgress(90);
              
              // Prepare response
              const response = {
                jobId: job.id.toString(),
                status: 'completed',
                message: 'Image conversion completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
                originalFormat: path.extname(originalFilename).slice(1),
                convertedFormat: format,
                mime: `image/${format}`,
                width: result.dimensions.width,
                height: result.dimensions.height,
              };
              
              // Send webhook if provided
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for convert job ${job.id}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for convert job ${job.id}:`, webhookError.message);
                }
              }
              
              // Cleanup original file
              await this.imageService.cleanup(filePath);
              
              await job.updateProgress(100);
              return response;
              
            } catch (error) {
              this.logger.error(`Convert job ${job.id} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          }, { connection: redisConfig });
          
          // Add event listeners
          this.convertWorker.on('ready', () => {
            this.logger.log('✅ BullMQ convert worker is ready and connected');
          });
          
          this.convertWorker.on('error', (error) => {
            this.logger.error('❌ BullMQ convert worker error:', error);
          });
          
          this.convertWorker.on('failed', (job, err) => {
            this.logger.error(`❌ BullMQ convert job ${job?.id} failed:`, err);
          });
          
          this.convertWorker.on('completed', (job, result) => {
            this.logger.log(`✅ BullMQ convert job ${job.id} completed successfully`);
          });
          
          this.logger.log('✅ BullMQ convert worker created successfully');
        } catch (workerError) {
          this.logger.error('❌ Failed to create BullMQ convert worker:', workerError);
          throw workerError;
        }
      } else {
        // For LocalQueue, use original .process() method
        this.logger.log('🔍 DEBUG - Queue is LocalQueue type, setting up local convert processor...');
        if ('process' in convertQueue) {
          convertQueue.process(async (jobOrData: any) => {
            const jobData = jobOrData.data || jobOrData;
            const jobId = jobOrData.id || 'local-job';
            
            const { filePath, format, quality, originalFilename, webhookUrl } = jobData;
            
            try {
              this.logger.log(`Processing convert job ${jobId}: ${originalFilename} to ${format}`);
              
              const result = await this.imageService.convertFormat(filePath, format, originalFilename, quality);
              
              const response = {
                jobId: jobId.toString(),
                status: 'completed',
                message: 'Image conversion completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
                originalFormat: path.extname(originalFilename).slice(1),
                convertedFormat: format,
                mime: `image/${format}`,
                width: result.dimensions.width,
                height: result.dimensions.height,
              };
              
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for convert job ${jobId}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for convert job ${jobId}:`, webhookError.message);
                }
              }
              
              await this.imageService.cleanup(filePath);
              return response;
              
            } catch (error) {
              this.logger.error(`Convert job ${jobId} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          });
          this.logger.log('✅ LocalQueue convert processor registered');
        }
      }
    } catch (error) {
      this.logger.error('❌ Error in setupConvertProcessor:', error);
      throw error;
    }
  }

  private async setupCropProcessor() {
    try {
      this.logger.log('🔍 DEBUG - setupCropProcessor called');
      
      if (this.processHandlersRegistered.crop) {
        this.logger.log('🔍 DEBUG - Crop processor already registered, skipping');
        return;
      }

      this.logger.log('🔍 DEBUG - Getting crop queue from service...');
      const cropQueue = this.queueService.getCropQueue();
      this.logger.log('🔍 DEBUG - Crop queue retrieved:', {
        exists: !!cropQueue,
        type: cropQueue ? cropQueue.constructor.name : 'null',
        hasProcess: cropQueue ? 'process' in cropQueue : false
      });
      
      this.processHandlersRegistered.crop = true;
      this.logger.log('✅ Registering crop processor');
      
      // For BullMQ queues, create Worker
      if (cropQueue.constructor.name === 'Queue') {
        this.logger.log('🔍 DEBUG - Queue is BullMQ type, creating crop worker...');
        
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.log(`🔍 Creating BullMQ crop worker with Redis config:`, { 
          host: redisConfig.host, 
          port: redisConfig.port, 
          db: redisConfig.db 
        });
        
        try {
          this.cropWorker = new Worker('image-crop', async (job) => {
            const { filePath, crop, originalFilename, webhookUrl } = job.data;
          
            try {
              this.logger.log(`Processing crop job ${job.id}: ${originalFilename}`);
              
              await job.updateProgress(10);
              
              // Process image
              const result = await this.imageService.cropImage(filePath, crop, originalFilename);
              
              await job.updateProgress(90);
              
              // Prepare response
              const response = {
                jobId: job.id.toString(),
                status: 'completed',
                message: 'Image crop completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
                width: result.dimensions.width,
                height: result.dimensions.height,
                mime: `image/${path.extname(originalFilename).slice(1)}`,
              };
              
              // Send webhook if provided
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for crop job ${job.id}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for crop job ${job.id}:`, webhookError.message);
                }
              }
              
              // Cleanup original file
              await this.imageService.cleanup(filePath);
              
              await job.updateProgress(100);
              return response;
              
            } catch (error) {
              this.logger.error(`Crop job ${job.id} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          }, { connection: redisConfig });
          
          // Add event listeners
          this.cropWorker.on('ready', () => {
            this.logger.log('✅ BullMQ crop worker is ready and connected');
          });
          
          this.cropWorker.on('error', (error) => {
            this.logger.error('❌ BullMQ crop worker error:', error);
          });
          
          this.cropWorker.on('failed', (job, err) => {
            this.logger.error(`❌ BullMQ crop job ${job?.id} failed:`, err);
          });
          
          this.cropWorker.on('completed', (job, result) => {
            this.logger.log(`✅ BullMQ crop job ${job.id} completed successfully`);
          });
          
          this.logger.log('✅ BullMQ crop worker created successfully');
        } catch (workerError) {
          this.logger.error('❌ Failed to create BullMQ crop worker:', workerError);
          throw workerError;
        }
      } else {
        // For LocalQueue, use original .process() method
        this.logger.log('🔍 DEBUG - Queue is LocalQueue type, setting up local crop processor...');
        if ('process' in cropQueue) {
          cropQueue.process(async (jobOrData: any) => {
            const jobData = jobOrData.data || jobOrData;
            const jobId = jobOrData.id || 'local-job';
            
            const { filePath, crop, originalFilename, webhookUrl } = jobData;
            
            try {
              this.logger.log(`Processing crop job ${jobId}: ${originalFilename}`);
              
              const result = await this.imageService.cropImage(filePath, crop, originalFilename);
              
              const response = {
                jobId: jobId.toString(),
                status: 'completed',
                message: 'Image crop completed successfully',
                downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
                originalFilename: originalFilename,
                filename: result.outputPath.split('/').pop(),
                width: result.dimensions.width,
                height: result.dimensions.height,
                mime: `image/${path.extname(originalFilename).slice(1)}`,
              };
              
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for crop job ${jobId}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for crop job ${jobId}:`, webhookError.message);
                }
              }
              
              await this.imageService.cleanup(filePath);
              return response;
              
            } catch (error) {
              this.logger.error(`Crop job ${jobId} failed:`, error);
              await this.imageService.cleanup(filePath);
              throw error;
            }
          });
          this.logger.log('✅ LocalQueue crop processor registered');
        }
      }
    } catch (error) {
      this.logger.error('❌ Error in setupCropProcessor:', error);
      throw error;
    }
  }

  private async setupBatchProcessor() {
    try {
      this.logger.log('🔍 DEBUG - setupBatchProcessor called');
      
      if (this.processHandlersRegistered.batch) {
        this.logger.log('🔍 DEBUG - Batch processor already registered, skipping');
        return;
      }

      this.logger.log('🔍 DEBUG - Getting batch queue from service...');
      const batchQueue = this.queueService.getBatchQueue();
      this.logger.log('🔍 DEBUG - Batch queue retrieved:', {
        exists: !!batchQueue,
        type: batchQueue ? batchQueue.constructor.name : 'null',
        hasProcess: batchQueue ? 'process' in batchQueue : false
      });
      
      this.processHandlersRegistered.batch = true;
      this.logger.log('✅ Registering batch processor');
      
      // For BullMQ queues, create Worker
      if (batchQueue.constructor.name === 'Queue') {
        this.logger.log('🔍 DEBUG - Queue is BullMQ type, creating batch worker...');
        
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.log(`🔍 Creating BullMQ batch worker with Redis config:`, { 
          host: redisConfig.host, 
          port: redisConfig.port, 
          db: redisConfig.db 
        });
        
        try {
          this.batchWorker = new Worker('image-batch', async (job) => {
            const { operation, filePaths, originalFilenames, options, webhookUrl } = job.data;
          
            try {
              this.logger.log(`Processing batch job ${job.id}: ${operation} for ${filePaths.length} files`);
              
              await job.updateProgress(10);
              
              // Process batch
              const archivePath = await this.imageService.processBatch(filePaths, operation, options);
              
              await job.updateProgress(90);
              
              // Prepare response
              const response = {
                jobId: job.id.toString(),
                status: 'completed',
                message: `Batch ${operation} completed successfully`,
                downloadUrl: `/api/images/download/${archivePath.split('/').pop()}`,
                operation: operation,
                fileCount: filePaths.length,
                archivePath: archivePath,
              };
              
              // Send webhook if provided
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for batch job ${job.id}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for batch job ${job.id}:`, webhookError.message);
                }
              }
              
              // Cleanup original files
              for (const filePath of filePaths) {
                await this.imageService.cleanup(filePath);
              }
              
              await job.updateProgress(100);
              return response;
              
            } catch (error) {
              this.logger.error(`Batch job ${job.id} failed:`, error);
              // Cleanup original files even on failure
              for (const filePath of filePaths) {
                await this.imageService.cleanup(filePath);
              }
              throw error;
            }
          }, { connection: redisConfig });
          
          // Add event listeners
          this.batchWorker.on('ready', () => {
            this.logger.log('✅ BullMQ batch worker is ready and connected');
          });
          
          this.batchWorker.on('error', (error) => {
            this.logger.error('❌ BullMQ batch worker error:', error);
          });
          
          this.batchWorker.on('failed', (job, err) => {
            this.logger.error(`❌ BullMQ batch job ${job?.id} failed:`, err);
          });
          
          this.batchWorker.on('completed', (job, result) => {
            this.logger.log(`✅ BullMQ batch job ${job.id} completed successfully`);
          });
          
          this.logger.log('✅ BullMQ batch worker created successfully');
        } catch (workerError) {
          this.logger.error('❌ Failed to create BullMQ batch worker:', workerError);
          throw workerError;
        }
      } else {
        // For LocalQueue, use original .process() method
        this.logger.log('🔍 DEBUG - Queue is LocalQueue type, setting up local batch processor...');
        if ('process' in batchQueue) {
          batchQueue.process(async (jobOrData: any) => {
            const jobData = jobOrData.data || jobOrData;
            const jobId = jobOrData.id || 'local-job';
            
            const { operation, filePaths, originalFilenames, options, webhookUrl } = jobData;
            
            try {
              this.logger.log(`Processing batch job ${jobId}: ${operation} for ${filePaths.length} files`);
              
              const archivePath = await this.imageService.processBatch(filePaths, operation, options);
              
              const response = {
                jobId: jobId.toString(),
                status: 'completed',
                message: `Batch ${operation} completed successfully`,
                downloadUrl: `/api/images/download/${archivePath.split('/').pop()}`,
                operation: operation,
                fileCount: filePaths.length,
                archivePath: archivePath,
              };
              
              if (webhookUrl) {
                try {
                  await axios.post(webhookUrl, response);
                  this.logger.log(`Webhook sent successfully for batch job ${jobId}`);
                } catch (webhookError) {
                  this.logger.warn(`Webhook failed for batch job ${jobId}:`, webhookError.message);
                }
              }
              
              // Cleanup original files
              for (const filePath of filePaths) {
                await this.imageService.cleanup(filePath);
              }
              
              return response;
              
            } catch (error) {
              this.logger.error(`Batch job ${jobId} failed:`, error);
              // Cleanup original files even on failure
              for (const filePath of filePaths) {
                await this.imageService.cleanup(filePath);
              }
              throw error;
            }
          });
          this.logger.log('✅ LocalQueue batch processor registered');
        }
      }
    } catch (error) {
      this.logger.error('❌ Error in setupBatchProcessor:', error);
      throw error;
    }
  }

  private setupRedisStatusListener(): void {
    this.redisStatusService.on('statusChanged', async (isAvailable: boolean) => {
      this.logger.log(`[Worker] Redis status changed to: ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
      
      if (isAvailable) {
        // Redis became available - reregister process handlers
        this.logger.log('[Worker] Redis is now available. Reregistering process handlers...');
        
        // Clean up existing BullMQ workers before recreating
        if (this.compressWorker) await this.compressWorker.close();
        if (this.resizeWorker) await this.resizeWorker.close();
        if (this.convertWorker) await this.convertWorker.close();
        if (this.cropWorker) await this.cropWorker.close();
        if (this.batchWorker) await this.batchWorker.close();

        // Reset process handlers registration flags
        this.processHandlersRegistered.compress = false;
        this.processHandlersRegistered.resize = false;
        this.processHandlersRegistered.convert = false;
        this.processHandlersRegistered.crop = false;
        this.processHandlersRegistered.batch = false;
        
        // Reregister all processors
        await this.setupCompressProcessor();
        await this.setupResizeProcessor();
        await this.setupConvertProcessor();
        await this.setupCropProcessor();
        await this.setupBatchProcessor();
        
        this.logger.log('✅ Process handlers reregistered for Redis queues');
      } else {
        this.logger.log('[Worker] Redis is no longer available. Will use local queues.');
        
        // Reset process handlers when Redis becomes unavailable
        this.processHandlersRegistered.compress = false;
        this.processHandlersRegistered.resize = false;
        this.processHandlersRegistered.convert = false;
        this.processHandlersRegistered.crop = false;
        this.processHandlersRegistered.batch = false;
        
        // Wait a brief moment for queue service to switch to local queues
        setTimeout(async () => {
          // Reregister all processors for local queues
          await this.setupCompressProcessor();
          await this.setupResizeProcessor();
          await this.setupConvertProcessor();
          await this.setupCropProcessor();
          await this.setupBatchProcessor();
          
          this.logger.log('✅ Process handlers reregistered for local queues');
        }, 100); // 100ms delay
      }
    });
  }

  /**
   * Get worker concurrency setting from system settings
   */
  private async getWorkerConcurrency(): Promise<number> {
    try {
      const settings = await this.settingsCacheService.getSettings();
      const concurrency = settings.workerConcurrency || 25;
      this.logger.log(`Using worker concurrency: ${concurrency}`);
      return concurrency;
    } catch (error) {
      this.logger.warn('Failed to get worker concurrency from settings, using default:', error);
      return 25; // Default concurrency
    }
  }
}

export async function startImageWorkers(app: any) {
  console.log('🔍 DEBUG - startImageWorkers called');
  console.log('🔍 DEBUG - App instance:', app ? 'Available' : 'Not available');

  try {
    console.log('🔍 DEBUG - Getting QueueService from DI...');
    const queueService = app.get(QueueService);
    console.log('🔍 DEBUG - QueueService:', queueService ? 'Available' : 'Not available');

    console.log('🔍 DEBUG - Getting ImageService from DI...');
    const imageService = app.get(ImageService);
    console.log('🔍 DEBUG - ImageService:', imageService ? 'Available' : 'Not available');

    console.log('🔍 DEBUG - Getting RedisStatusService from DI...');
    const redisStatusService = app.get(RedisStatusService);
    console.log('🔍 DEBUG - RedisStatusService:', redisStatusService ? 'Available' : 'Not available');

    console.log('🔍 DEBUG - Getting SettingsCacheService from DI...');
    const settingsCacheService = app.get(SettingsCacheService);
    console.log('🔍 DEBUG - SettingsCacheService:', settingsCacheService ? 'Available' : 'Not available');

    console.log('🔍 DEBUG - Creating ImageWorker instance...');
    const worker = new ImageWorker(queueService, imageService, redisStatusService, settingsCacheService);
    console.log('🔍 DEBUG - ImageWorker created successfully');

    console.log('🔍 DEBUG - Starting worker...');
    await worker.start();
    console.log('🔍 DEBUG - Worker started successfully');

    console.log('🚀 Image workers started automatically with main server');
    return 'Worker instance created';
  } catch (error) {
    console.error('❌ Failed to start image workers:', error);
    console.error('🔍 DEBUG - startImageWorkers error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await startImageWorkers(app);
  console.log('🚀 Standalone worker process started');
}

if (require.main === module) {
  bootstrap();
} 