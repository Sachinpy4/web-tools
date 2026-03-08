import { NestFactory } from '@nestjs/core';
import { INestApplication, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { QueueService } from './modules/images/services/queue.service';
import { ImageService } from './modules/images/services/image.service';
import { RedisStatusService } from './common/services/redis-status.service';
import { SettingsCacheService } from './common/services/settings-cache.service';
import { Worker, Job, Queue } from 'bullmq';
import axios from 'axios';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

type QueueName = 'compress' | 'resize' | 'convert' | 'crop' | 'batch';

interface WorkerConfig {
  queueName: string;           // BullMQ queue name (e.g. 'image-compression')
  processorName: QueueName;    // Internal name for tracking
  getQueue: () => any;         // Function to get the queue instance
  processJob: (job: Job | any) => Promise<any>;  // Job processor function
  concurrency?: number;        // Optional concurrency override
}

// ─── ImageWorker Class ────────────────────────────────────────────────────────

class ImageWorker {
  private readonly logger = new Logger(ImageWorker.name);
  private readonly processHandlersRegistered: Record<QueueName, boolean> = {
    compress: false,
    resize: false,
    convert: false,
    crop: false,
    batch: false,
  };

  // BullMQ Workers
  private workers: Partial<Record<QueueName, Worker>> = {};

  // Concurrency cache
  private cachedWorkerConcurrency: number | null = null;
  private concurrencyCacheExpiry = 0;
  private readonly CONCURRENCY_CACHE_TTL = 60000; // 1 minute

  constructor(
    private readonly queueService: QueueService,
    private readonly imageService: ImageService,
    private readonly redisStatusService: RedisStatusService,
    private readonly settingsCacheService: SettingsCacheService,
  ) {}

  async start() {
    this.logger.log('Starting Image Processing Worker...');

    try {
      await this.setupAllProcessors();
      this.setupRedisStatusListener();
      this.logger.log('All queue processors initialized');
    } catch (error) {
      this.logger.error('Error during worker start:', error);
      throw error;
    }
  }

  async cleanup() {
    this.logger.log('Cleaning up BullMQ workers...');
    for (const [name, worker] of Object.entries(this.workers)) {
      if (worker) {
        await worker.close();
        this.logger.debug(`Closed ${name} worker`);
      }
    }
    this.workers = {};
    this.logger.log('All BullMQ workers cleaned up');
  }

  // ─── Generic Worker Factory ───────────────────────────────────────────────

  /**
   * Creates either a BullMQ Worker or registers a LocalQueue processor.
   * This eliminates ~700 lines of duplicated setup code.
   */
  private async setupWorker(config: WorkerConfig): Promise<void> {
    const { queueName, processorName, getQueue, processJob, concurrency } = config;

    try {
      if (this.processHandlersRegistered[processorName]) {
        return;
      }

      const queue = getQueue();
      this.processHandlersRegistered[processorName] = true;
      this.logger.log(`Registering ${processorName} processor`);

      // BullMQ Queue → create a Worker
      if (queue instanceof Queue) {
        const redisConfig = this.redisStatusService.getRedisConfig();
        this.logger.debug(`Creating BullMQ ${processorName} worker (Redis: ${redisConfig.host}:${redisConfig.port})`);

        const workerConcurrency = concurrency ?? await this.getWorkerConcurrency();

        const worker = new Worker(queueName, async (job: Job) => {
          try {
            this.logger.log(`Processing ${processorName} job ${job.id}`);
            await job.updateProgress(10);

            const result = await processJob(job);

            await job.updateProgress(100);
            return result;
          } catch (error) {
            this.logger.error(`${processorName} job ${job.id} failed:`, error);
            throw error;
          }
        }, {
          connection: redisConfig,
          concurrency: workerConcurrency,
        });

        // Standard event listeners
        worker.on('ready', () => this.logger.log(`BullMQ ${processorName} worker is ready`));
        worker.on('error', (error) => this.logger.error(`BullMQ ${processorName} worker error:`, error));
        worker.on('failed', (job, err) => this.logger.error(`BullMQ ${processorName} job ${job?.id} failed:`, err));
        worker.on('completed', (job) => this.logger.log(`BullMQ ${processorName} job ${job.id} completed`));

        this.workers[processorName] = worker;
        this.logger.log(`BullMQ ${processorName} worker created`);

      } else if ('process' in queue) {
        // LocalQueue fallback → use .process()
        queue.process(async (jobOrData: any) => {
          const jobData = jobOrData.data || jobOrData;
          const jobId = jobOrData.id || 'local-job';

          try {
            this.logger.log(`Processing ${processorName} job ${jobId} (local)`);
            const result = await processJob({ id: jobId, data: jobData } as any);
            return result;
          } catch (error) {
            this.logger.error(`${processorName} job ${jobId} failed (local):`, error);
            throw error;
          }
        });
        this.logger.log(`LocalQueue ${processorName} processor registered`);
      }
    } catch (error) {
      this.logger.error(`Error in setup ${processorName} processor:`, error);
      throw error;
    }
  }

  // ─── Webhook Helper ───────────────────────────────────────────────────────

  private async sendWebhook(webhookUrl: string | undefined, response: any, jobId: string, operationName: string): Promise<void> {
    if (!webhookUrl) return;
    try {
      await axios.post(webhookUrl, response);
      this.logger.log(`Webhook sent for ${operationName} job ${jobId}`);
    } catch (error) {
      this.logger.warn(`Webhook failed for ${operationName} job ${jobId}:`, error.message);
    }
  }

  // ─── Processor Definitions ────────────────────────────────────────────────

  private async setupAllProcessors(): Promise<void> {
    await this.setupWorker({
      queueName: 'image-compression',
      processorName: 'compress',
      getQueue: () => this.queueService.getCompressQueue(),
      processJob: async (job) => {
        const { filePath, quality, originalFilename, originalSize, webhookUrl } = job.data;
        try {
          const result = await this.imageService.compressImage(filePath, quality, originalFilename);

          const response = {
            jobId: job.id.toString(),
            status: 'completed',
            message: 'Image compression completed successfully',
            downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
            originalSize,
            compressedSize: result.processedSize,
            compressionRatio: result.compressionRatio,
            originalFilename,
            filename: result.outputPath.split('/').pop(),
          };

          await this.sendWebhook(webhookUrl, response, job.id, 'compress');
          await this.imageService.cleanup(filePath);
          return response;
        } catch (error) {
          await this.imageService.cleanup(filePath);
          throw error;
        }
      },
    });

    await this.setupWorker({
      queueName: 'image-resize',
      processorName: 'resize',
      getQueue: () => this.queueService.getResizeQueue(),
      processJob: async (job) => {
        const { filePath, width, height, maintainAspectRatio, originalFilename, webhookUrl } = job.data;
        try {
          const result = await this.imageService.resizeImage(filePath, width, height, originalFilename, maintainAspectRatio);

          const response = {
            jobId: job.id.toString(),
            status: 'completed',
            message: 'Image resize completed successfully',
            downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
            originalFilename,
            filename: result.outputPath.split('/').pop(),
            width: result.dimensions.width,
            height: result.dimensions.height,
            mime: `image/${path.extname(originalFilename).slice(1)}`,
          };

          await this.sendWebhook(webhookUrl, response, job.id, 'resize');
          await this.imageService.cleanup(filePath);
          return response;
        } catch (error) {
          await this.imageService.cleanup(filePath);
          throw error;
        }
      },
    });

    await this.setupWorker({
      queueName: 'image-convert',
      processorName: 'convert',
      getQueue: () => this.queueService.getConvertQueue(),
      processJob: async (job) => {
        const { filePath, format, quality, originalFilename, webhookUrl } = job.data;
        try {
          const result = await this.imageService.convertFormat(filePath, format, originalFilename, quality);

          const response = {
            jobId: job.id.toString(),
            status: 'completed',
            message: 'Image conversion completed successfully',
            downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
            originalFilename,
            filename: result.outputPath.split('/').pop(),
            originalFormat: path.extname(originalFilename).slice(1),
            convertedFormat: format,
            mime: `image/${format}`,
            width: result.dimensions.width,
            height: result.dimensions.height,
          };

          await this.sendWebhook(webhookUrl, response, job.id, 'convert');
          await this.imageService.cleanup(filePath);
          return response;
        } catch (error) {
          await this.imageService.cleanup(filePath);
          throw error;
        }
      },
    });

    await this.setupWorker({
      queueName: 'image-crop',
      processorName: 'crop',
      getQueue: () => this.queueService.getCropQueue(),
      processJob: async (job) => {
        const { filePath, crop, originalFilename, webhookUrl } = job.data;
        try {
          const result = await this.imageService.cropImage(filePath, crop, originalFilename);

          const response = {
            jobId: job.id.toString(),
            status: 'completed',
            message: 'Image crop completed successfully',
            downloadUrl: `/api/images/download/${result.outputPath.split('/').pop()}`,
            originalFilename,
            filename: result.outputPath.split('/').pop(),
            width: result.dimensions.width,
            height: result.dimensions.height,
            mime: `image/${path.extname(originalFilename).slice(1)}`,
          };

          await this.sendWebhook(webhookUrl, response, job.id, 'crop');
          await this.imageService.cleanup(filePath);
          return response;
        } catch (error) {
          await this.imageService.cleanup(filePath);
          throw error;
        }
      },
    });

    await this.setupWorker({
      queueName: 'image-batch',
      processorName: 'batch',
      getQueue: () => this.queueService.getBatchQueue(),
      processJob: async (job) => {
        const { operation, filePaths, options, webhookUrl } = job.data;
        try {
          const archivePath = await this.imageService.processBatch(filePaths, operation, options);

          const response = {
            jobId: job.id.toString(),
            status: 'completed',
            message: `Batch ${operation} completed successfully`,
            downloadUrl: `/api/images/download/${archivePath.split('/').pop()}`,
            operation,
            fileCount: filePaths.length,
            archivePath,
          };

          await this.sendWebhook(webhookUrl, response, job.id, 'batch');

          // Cleanup all original files
          for (const fp of filePaths) {
            await this.imageService.cleanup(fp);
          }
          return response;
        } catch (error) {
          for (const fp of filePaths) {
            await this.imageService.cleanup(fp);
          }
          throw error;
        }
      },
    });
  }

  // ─── Redis Status Listener ────────────────────────────────────────────────

  private setupRedisStatusListener(): void {
    this.redisStatusService.on('statusChanged', async (isAvailable: boolean) => {
      this.logger.log(`[Worker] Redis status changed to: ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);

      // Close existing workers
      await this.cleanup();

      // Reset all registration flags
      for (const key of Object.keys(this.processHandlersRegistered) as QueueName[]) {
        this.processHandlersRegistered[key] = false;
      }

      if (!isAvailable) {
        // Brief delay for queue service to switch to local queues
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Re-register all processors (for Redis queues or local queues)
      await this.setupAllProcessors();
      this.logger.log(`Process handlers reregistered for ${isAvailable ? 'Redis' : 'local'} queues`);
    });
  }

  // ─── Worker Concurrency ───────────────────────────────────────────────────

  private async getWorkerConcurrency(): Promise<number> {
    const now = Date.now();

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
      this.cachedWorkerConcurrency = 25;
      this.concurrencyCacheExpiry = now + this.CONCURRENCY_CACHE_TTL;
      return this.cachedWorkerConcurrency;
    }
  }
}

// ─── Module-Level Exports ───────────────────────────────────────────────────

const moduleLogger = new Logger('ImageWorker');

let activeWorker: ImageWorker | null = null;

export function getImageWorker(): ImageWorker | null {
  return activeWorker;
}

export async function startImageWorkers(app: INestApplication): Promise<ImageWorker> {
  try {
    const queueService = app.get(QueueService);
    const imageService = app.get(ImageService);
    const redisStatusService = app.get(RedisStatusService);
    const settingsCacheService = app.get(SettingsCacheService);
    const worker = new ImageWorker(queueService, imageService, redisStatusService, settingsCacheService);
    await worker.start();

    activeWorker = worker;

    moduleLogger.log('Image workers started automatically with main server');
    return worker;
  } catch (error) {
    moduleLogger.error('Failed to start image workers:', error);
    throw error;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await startImageWorkers(app);
  moduleLogger.log('Standalone worker process started');
}

if (require.main === module) {
  bootstrap().catch((err) => {
    moduleLogger.error('Worker failed to start', err);
    process.exit(1);
  });
}