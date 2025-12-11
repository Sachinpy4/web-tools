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

    try {
      // Setup processors for each queue (migrated to BullMQ)
      await this.setupCompressProcessor();
      await this.setupResizeProcessor();
      await this.setupConvertProcessor();
      await this.setupCropProcessor();
      await this.setupBatchProcessor();

      // Setup Redis status listener
      this.setupRedisStatusListener();

      this.logger.log('✅ All queue processors initialized');
    } catch (error) {
      this.logger.error('❌ Error during worker start:', error);
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
      if (this.processHandlersRegistered.compress) {
        return;
      }

      const compressQueue = this.queueService.getCompressQueue();
      this.processHandlersRegistered.compress = true;
      this.logger.log('✅ Registering compress processor');
      
      // For BullMQ queues, create Worker
      if (compressQueue.constructor.name === 'Queue') {
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.log(`🔍 Creating BullMQ compress worker with Redis config:`, { 
          host: redisConfig.host, 
          port: redisConfig.port, 
          db: redisConfig.db 
        });
        
        try {
          const concurrency = await this.getWorkerConcurrency();
          this.compressWorker = new Worker('image-compression', async (job) => {
            const { filePath, quality, originalFilename, originalSize, webhookUrl } = job.data;
          
            try {
              this.logger.log(`Processing compress job ${job.id}: ${originalFilename}`);
              
              // Update progress (BullMQ style) - more granular updates
              await job.updateProgress(15);
              
              // Process image with intermediate progress updates
              const result = await this.imageService.compressImage(filePath, quality, originalFilename);
              
              await job.updateProgress(95);
              
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
          throw workerError;
        }
      } else {
        // For LocalQueue, use original .process() method
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
      throw error;
    }
  }

  private async setupResizeProcessor() {
    try {
      
      if (this.processHandlersRegistered.resize) {
        return;
      }
      const resizeQueue = this.queueService.getResizeQueue();
      
      this.processHandlersRegistered.resize = true;
      this.logger.log('✅ Registering resize processor');
      
      // For BullMQ queues, create Worker
      if (resizeQueue.constructor.name === 'Queue') {
        
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
      
      if (this.processHandlersRegistered.convert) {
        return;
      }
      const convertQueue = this.queueService.getConvertQueue();
      
      this.processHandlersRegistered.convert = true;
      this.logger.log('✅ Registering convert processor');
      
      // For BullMQ queues, create Worker
      if (convertQueue.constructor.name === 'Queue') {
        
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
      
      if (this.processHandlersRegistered.crop) {
        return;
      }
      const cropQueue = this.queueService.getCropQueue();
      
      this.processHandlersRegistered.crop = true;
      this.logger.log('✅ Registering crop processor');
      
      // For BullMQ queues, create Worker
      if (cropQueue.constructor.name === 'Queue') {
        
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
      
      if (this.processHandlersRegistered.batch) {
        return;
      }
      const batchQueue = this.queueService.getBatchQueue();
      
      this.processHandlersRegistered.batch = true;
      this.logger.log('✅ Registering batch processor');
      
      // For BullMQ queues, create Worker
      if (batchQueue.constructor.name === 'Queue') {
        
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

  // Cache worker concurrency to avoid repeated DB calls during worker creation
  private cachedWorkerConcurrency: number | null = null;
  private concurrencyCacheExpiry: number = 0;
  private readonly CONCURRENCY_CACHE_TTL = 60000; // 1 minute

  /**
   * Get worker concurrency setting from system settings (optimized with cache)
   */
  private async getWorkerConcurrency(): Promise<number> {
    const now = Date.now();
    
    // Use cached concurrency if still valid
    if (this.cachedWorkerConcurrency !== null && now < this.concurrencyCacheExpiry) {
      return this.cachedWorkerConcurrency;
    }

    try {
      const settings = await this.settingsCacheService.getSettings();
      this.cachedWorkerConcurrency = settings.workerConcurrency || 25;
      this.concurrencyCacheExpiry = now + this.CONCURRENCY_CACHE_TTL;
      
      this.logger.log(`Using worker concurrency: ${this.cachedWorkerConcurrency}`);
      return this.cachedWorkerConcurrency;
    } catch (error) {
      this.logger.warn('Failed to get worker concurrency from settings, using default:', error);
      this.cachedWorkerConcurrency = 25; // Default concurrency
      this.concurrencyCacheExpiry = now + this.CONCURRENCY_CACHE_TTL;
      return this.cachedWorkerConcurrency;
    }
  }
}

export async function startImageWorkers(app: any) {

  try {
    const queueService = app.get(QueueService);
    const imageService = app.get(ImageService);
    const redisStatusService = app.get(RedisStatusService);
    const settingsCacheService = app.get(SettingsCacheService);
    const worker = new ImageWorker(queueService, imageService, redisStatusService, settingsCacheService);
    await worker.start();

    console.log('🚀 Image workers started automatically with main server');
    return 'Worker instance created';
  } catch (error) {
    console.error('❌ Failed to start image workers:', error);
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