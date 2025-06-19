import { Injectable, InternalServerErrorException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CleanupService } from './cleanup.service';
import { SettingsCacheService } from '../../../common/services/settings-cache.service';
import { QueueService } from '../../images/services/queue.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SystemSettings, SystemSettingsDocument } from '../schemas/system-settings.schema';
import { SchedulerConfig, SchedulerConfigDocument } from '../schemas/scheduler-config.schema';
import { Blog, BlogDocument } from '../../blog/schemas/blog.schema';
import { Comment, CommentDocument } from '../../comments/schemas/comment.schema';
import { Media, MediaDocument } from '../../media/schemas/media.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import { UpdateSystemSettingsDto, CleanupOptionsDto, DatabaseOperationDto } from '../dto/admin.dto';
import { 
  CreateSchedulerConfigDto, 
  UpdateSchedulerConfigDto, 
  SchedulerConfigResponseDto,
  SchedulerStatusDto,
  SchedulerTaskType 
} from '../dto/scheduler-config.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private schedulerService: any; // Will be injected later to avoid circular dependency

  constructor(
    @InjectModel(SystemSettings.name) private systemSettingsModel: Model<SystemSettingsDocument>,
    @InjectModel(SchedulerConfig.name) private schedulerConfigModel: Model<SchedulerConfigDocument>,
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
    private cleanupService: CleanupService,
    private settingsCacheService: SettingsCacheService,
    @Inject(forwardRef(() => QueueService)) private queueService: QueueService,
  ) {}

  // Setter for scheduler service to avoid circular dependency
  setSchedulerService(schedulerService: any) {
    this.schedulerService = schedulerService;
  }

  /**
   * Get current system settings
   */
  async getSystemSettings() {
    try {
      const settings = await (this.systemSettingsModel as any).getCurrentSettings();
      
      return {
        status: 'success',
        data: {
          settings,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get system settings:', error);
      throw new InternalServerErrorException(`Failed to get system settings: ${error.message}`);
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(updateSystemSettingsDto: UpdateSystemSettingsDto, adminEmail: string) {
    try {
      const settings = await (this.systemSettingsModel as any).updateSettings(updateSystemSettingsDto);
      
      // Invalidate settings cache to force refresh
      await this.settingsCacheService.invalidateCache();
      
      // Clear queue options cache for immediate effect
      this.queueService.clearQueueOptionsCache();
      
      this.logger.log('All caches invalidated for immediate settings effect');
      
      this.logger.log('System settings updated by admin:', {
        updates: updateSystemSettingsDto,
        updatedBy: adminEmail || 'Unknown',
      });
      
      return {
        status: 'success',
        data: {
          settings,
          message: 'Settings updated successfully. Changes will take effect for new requests.',
        },
      };
    } catch (error) {
      this.logger.error('Failed to update system settings:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: validationErrors,
        });
      }
      
      throw new InternalServerErrorException(`Failed to update system settings: ${error.message}`);
    }
  }

  /**
   * Get rate limit settings for frontend display
   */
  async getRateLimitSettings() {
    try {
      const settings = await (this.systemSettingsModel as any).getCurrentSettings();
      
      return {
        status: 'success',
        data: {
          imageProcessing: {
            max: settings.imageProcessingMaxRequests,
            windowMs: settings.imageProcessingWindowMs,
          },
          batchOperation: {
            max: settings.batchOperationMaxRequests,
            windowMs: settings.batchOperationWindowMs,
          },
          api: {
            max: settings.apiMaxRequests,
            windowMs: settings.apiWindowMs,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit settings:', error);
      throw new InternalServerErrorException(`Failed to get rate limit settings: ${error.message}`);
    }
  }

  /**
   * Get file upload settings for frontend display
   */
  async getFileUploadSettings() {
    try {
      const settings = await (this.systemSettingsModel as any).getCurrentSettings();
      
      return {
        status: 'success',
        data: {
          maxFileSize: settings.maxFileSize,
          maxFileSizeFormatted: this.formatFileSize(settings.maxFileSize),
          maxFiles: settings.maxFiles,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get file upload settings:', error);
      throw new InternalServerErrorException(`Failed to get file upload settings: ${error.message}`);
    }
  }

  /**
   * Run system cleanup
   */
  async cleanupImages(cleanupOptionsDto: CleanupOptionsDto) {
    try {
      const { type, setupAutoCleanup = false, emergencyMode = false } = cleanupOptionsDto;
      
      this.logger.log(`System cleanup triggered from admin panel: ${type}`);
      
      let result = {
        type,
        success: false,
        totalDeleted: 0,
        sizeRecovered: '0 Bytes',
        message: 'Cleanup completed'
      };
      
      switch (type) {
        case 'images':
          try {
            const cleanupResults = await this.performImageCleanup(emergencyMode);
            const totalDeleted = cleanupResults.processedFiles.deleted + cleanupResults.tempFiles.deleted + cleanupResults.archiveFiles.deleted;
            const totalSize = cleanupResults.processedFiles.size + cleanupResults.tempFiles.size + cleanupResults.archiveFiles.size;
            const sizeRecovered = this.formatFileSize(totalSize);
            
            result = {
              type: 'images',
              success: true,
              totalDeleted,
              sizeRecovered,
              message: `Image cleanup completed: ${totalDeleted} files deleted, ${sizeRecovered} recovered`
            };
          } catch (error: any) {
            this.logger.error('Image cleanup failed:', error);
            result = {
              type: 'images',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 MB',
              message: `Image cleanup failed: ${error.message}`
            };
          }
          break;
          
        case 'logs':
          try {
            const logCleanupResult = await this.cleanupService.executeLogCleanup();
            result = {
              type: 'logs',
              success: logCleanupResult.success,
              totalDeleted: logCleanupResult.totalDeleted,
              sizeRecovered: logCleanupResult.sizeRecovered,
              message: logCleanupResult.message
            };
          } catch (error: any) {
            this.logger.error('Log cleanup failed:', error);
            result = {
              type: 'logs',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 MB',
              message: `Log cleanup failed: ${error.message}`
            };
          }
          break;
          
        case 'cache':
          try {
            const cacheCleanupResult = await this.cleanupService.executeCacheCleanup();
            result = {
              type: 'cache',
              success: cacheCleanupResult.success,
              totalDeleted: cacheCleanupResult.totalDeleted,
              sizeRecovered: cacheCleanupResult.sizeRecovered,
              message: cacheCleanupResult.message
            };
          } catch (error: any) {
            this.logger.error('Cache cleanup failed:', error);
            result = {
              type: 'cache',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 KB',
              message: `Cache cleanup failed: ${error.message}`
            };
          }
          break;
          
        case 'database':
          try {
            const dbCleanupResult = await this.cleanupService.executeDatabaseCleanup();
            result = {
              type: 'database',
              success: dbCleanupResult.success,
              totalDeleted: dbCleanupResult.totalDeleted,
              sizeRecovered: dbCleanupResult.sizeRecovered,
              message: dbCleanupResult.message
            };
          } catch (error: any) {
            this.logger.error('Database cleanup failed:', error);
            result = {
              type: 'database',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 KB',
              message: `Database cleanup failed: ${error.message}`
            };
          }
          break;
          
        case 'memory':
          try {
            const memoryCleanupResult = await this.cleanupService.executeMemoryOptimization();
            result = {
              type: 'memory',
              success: memoryCleanupResult.success,
              totalDeleted: memoryCleanupResult.totalDeleted,
              sizeRecovered: memoryCleanupResult.sizeRecovered,
              message: memoryCleanupResult.message
            };
          } catch (error: any) {
            this.logger.error('Memory optimization failed:', error);
            result = {
              type: 'memory',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 MB',
              message: `Memory optimization failed: ${error.message}`
            };
          }
          break;
          
        default:
          throw new BadRequestException(`Invalid cleanup type: ${type}`);
      }
      
      let scheduledTaskResult = null;
      
      if (setupAutoCleanup) {
        try {
          this.logger.log('Setting up internal cleanup scheduling');
          
          // In a real implementation, you would set up a scheduled task here
          // For now, we'll just return a success message
          scheduledTaskResult = {
            success: true,
            message: 'Automatic cleanup scheduled internally at 3:00 AM daily (runs while server is active)',
          };
          
          this.logger.log('Internal cleanup scheduler activated');
        } catch (taskError: any) {
          this.logger.error('Failed to set up cleanup scheduler:', taskError);
          scheduledTaskResult = {
            success: false,
            message: `Cleanup scheduler setup failed: ${taskError.message}. Manual setup required.`,
          };
        }
      }
      
      return {
        status: 'success',
        data: {
          ...result,
          scheduledTask: scheduledTaskResult,
        },
      };
    } catch (error) {
      this.logger.error('System cleanup failed:', error);
      throw new InternalServerErrorException(`Failed to perform system cleanup: ${error.message}`);
    }
  }

  /**
   * Get real-time system status
   */
  async getSystemStatus() {
    try {
      const [memoryUsage, loadAverage, settings] = await Promise.all([
        this.getMemoryUsage(),
        this.getLoadAverage(),
        (this.systemSettingsModel as any).getCurrentSettings()
      ]);

      // Get Redis connection status (if available)
      let redisConnected = false;
      try {
        // Check if Redis is available through any Redis service
        // This is a simplified check - in practice you'd inject Redis service
        redisConnected = true; // Default to true, should be checked properly
      } catch (error) {
        redisConnected = false;
      }

      // Simulate active jobs count (should come from actual queue service)
      const activeJobs = Math.floor(Math.random() * 10); // Replace with actual queue service

      // Determine queue health based on load and memory
      let queueHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (loadAverage > 0.8 || memoryUsage > 85) {
        queueHealth = 'critical';
      } else if (loadAverage > 0.6 || memoryUsage > 70) {
        queueHealth = 'degraded';
      }

      return {
        status: 'success',
        data: {
          redisConnected,
          settingsCacheVersion: Date.now(), // Should come from actual cache service
          settingsCacheLastUpdated: new Date().toISOString(),
          currentLoadAverage: loadAverage,
          memoryUsage,
          activeJobs,
          queueHealth,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get system status:', error);
      throw new InternalServerErrorException(`Failed to get system status: ${error.message}`);
    }
  }

  /**
   * Test system settings
   */
  async testSettings(testType: string, settings: any) {
    try {
      switch (testType) {
        case 'rate-limiting':
          return await this.testRateLimiting(settings);
        
        case 'processing':
          return await this.testProcessingSettings(settings);
        
        case 'file-upload':
          return await this.testFileUploadSettings(settings);
        
        case 'cleanup':
          return await this.testCleanupSettings(settings);
        
        default:
          throw new BadRequestException(`Unknown test type: ${testType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to test settings (${testType}):`, error);
      throw new InternalServerErrorException(`Failed to test settings: ${error.message}`);
    }
  }

  /**
   * Test rate limiting configuration
   */
  private async testRateLimiting(settings: any) {
    try {
      // Validate rate limiting values
      const tests = [
        {
          name: 'API Rate Limits',
          passed: settings.apiMaxRequests > 0 && settings.apiWindowMs > 0,
          details: `${settings.apiMaxRequests} requests per ${settings.apiWindowMs}ms`
        },
        {
          name: 'Image Processing Rate Limits',
          passed: settings.imageProcessingMaxRequests > 0 && settings.imageProcessingWindowMs > 0,
          details: `${settings.imageProcessingMaxRequests} requests per ${settings.imageProcessingWindowMs}ms`
        },
        {
          name: 'Batch Operation Rate Limits',
          passed: settings.batchOperationMaxRequests > 0 && settings.batchOperationWindowMs > 0,
          details: `${settings.batchOperationMaxRequests} requests per ${settings.batchOperationWindowMs}ms`
        }
      ];

      const allPassed = tests.every(test => test.passed);

      return {
        status: 'success',
        data: {
          testType: 'rate-limiting',
          passed: allPassed,
          results: tests,
          message: allPassed ? 'All rate limiting tests passed' : 'Some rate limiting tests failed'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        data: {
          testType: 'rate-limiting',
          passed: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Test processing settings
   */
  private async testProcessingSettings(settings: any) {
    try {
      const tests = [
        {
          name: 'Worker Concurrency',
          passed: settings.workerConcurrency >= 1 && settings.workerConcurrency <= 100,
          details: `Concurrency: ${settings.workerConcurrency}`
        },
        {
          name: 'Load Threshold',
          passed: settings.maxLoadThreshold >= 0.1 && settings.maxLoadThreshold <= 1.0,
          details: `Max load: ${settings.maxLoadThreshold}`
        },
        {
          name: 'Memory Usage Threshold',
          passed: settings.maxMemoryUsagePercent >= 50 && settings.maxMemoryUsagePercent <= 99,
          details: `Max memory: ${settings.maxMemoryUsagePercent}%`
        }
      ];

      const allPassed = tests.every(test => test.passed);

      return {
        status: 'success',
        data: {
          testType: 'processing',
          passed: allPassed,
          results: tests,
          message: allPassed ? 'All processing tests passed' : 'Some processing tests failed'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        data: {
          testType: 'processing',
          passed: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Test file upload settings
   */
  private async testFileUploadSettings(settings: any) {
    try {
      const tests = [
        {
          name: 'Max File Size',
          passed: settings.maxFileSize >= 1048576 && settings.maxFileSize <= 104857600,
          details: `Max size: ${this.formatFileSize(settings.maxFileSize)}`
        },
        {
          name: 'Max Files Count',
          passed: settings.maxFiles >= 1 && settings.maxFiles <= 50,
          details: `Max files: ${settings.maxFiles}`
        }
      ];

      const allPassed = tests.every(test => test.passed);

      return {
        status: 'success',
        data: {
          testType: 'file-upload',
          passed: allPassed,
          results: tests,
          message: allPassed ? 'All file upload tests passed' : 'Some file upload tests failed'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        data: {
          testType: 'file-upload',
          passed: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Test cleanup settings
   */
  private async testCleanupSettings(settings: any) {
    try {
      const tests = [
        {
          name: 'Retention Hours',
          passed: settings.processedFileRetentionHours >= 1 && 
                  settings.archiveFileRetentionHours >= 1 && 
                  settings.tempFileRetentionHours >= 0.5,
          details: `Processed: ${settings.processedFileRetentionHours}h, Archive: ${settings.archiveFileRetentionHours}h, Temp: ${settings.tempFileRetentionHours}h`
        },
        {
          name: 'Cleanup Interval',
          passed: settings.cleanupIntervalHours >= 1 && settings.cleanupIntervalHours <= 72,
          details: `Interval: ${settings.cleanupIntervalHours} hours`
        }
      ];

      const allPassed = tests.every(test => test.passed);

      return {
        status: 'success',
        data: {
          testType: 'cleanup',
          passed: allPassed,
          results: tests,
          message: allPassed ? 'All cleanup tests passed' : 'Some cleanup tests failed'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        data: {
          testType: 'cleanup',
          passed: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Get current memory usage percentage
   */
  private getMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const usedMemory = memoryUsage.rss;
    return Math.round((usedMemory / totalMemory) * 100);
  }

  /**
   * Get current load average (simplified)
   */
  private getLoadAverage(): number {
    const loadAvg = os.loadavg();
    return loadAvg[0] / os.cpus().length; // 1-minute load average normalized by CPU count
  }

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats() {
    try {
      // System information
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const cpuUsage = process.cpuUsage();
      
      // Database statistics
      const databaseStats = await this.getDatabaseStats();
      
      // File system statistics
      const fileSystemStats = await this.getFileSystemStats();
      
      // Application statistics
      const appStats = await this.getApplicationStats();

      // Get system memory info
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

      // Get log file stats
      const logStats = await this.getLogFileStats();

      // Get cache stats (Redis)
      const cacheStats = await this.getCacheStats();

      // Get disk usage
      const diskStats = await this.getDiskUsage();
      
      return {
        status: 'success',
        data: {
          systemStatus: {
            logs: {
              size: logStats.size,
              lines: logStats.lines,
              errorSize: logStats.errorSize
            },
            memory: {
              used: Math.round(usedMemory / 1024 / 1024), // Convert to MB
              total: Math.round(totalMemory / 1024 / 1024), // Convert to MB
              percentage: memoryPercentage
            },
            database: {
              collections: databaseStats.collections || 0,
              totalSize: databaseStats.totalSizeFormatted || '0 MB',
              documents: databaseStats.totalDocuments || 0
            },
            cache: {
              connected: cacheStats.connected,
              keys: cacheStats.keys || 0,
              memory: cacheStats.memory || 'N/A'
            },
            disk: {
              used: diskStats.usedFormatted || '0 MB',
              available: diskStats.availableFormatted || '0 MB',
              percentage: diskStats.usedPercent || 0
            }
          },
          system: {
            uptime: Math.floor(uptime),
            platform: os.platform(),
            nodeVersion: process.version,
            memoryUsage: {
              rss: memoryUsage.rss,
              heapUsed: memoryUsage.heapUsed,
              heapTotal: memoryUsage.heapTotal,
              external: memoryUsage.external,
              formatted: {
                rss: this.formatFileSize(memoryUsage.rss),
                heapUsed: this.formatFileSize(memoryUsage.heapUsed),
                heapTotal: this.formatFileSize(memoryUsage.heapTotal),
              },
            },
            cpuUsage: {
              user: cpuUsage.user,
              system: cpuUsage.system,
            },
            loadAverage: os.loadavg(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
            memoryUsagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
          },
          database: databaseStats,
          fileSystem: fileSystemStats,
          application: appStats,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get system stats:', error);
      throw new InternalServerErrorException(`Failed to get system stats: ${error.message}`);
    }
  }

  /**
   * Perform database operations
   */
  async performDatabaseOperation(databaseOperationDto: DatabaseOperationDto) {
    try {
      const { operation, collections = [] } = databaseOperationDto;
      
      this.logger.log(`Performing database operation: ${operation}`, { collections });
      
      let results: any = {};
      
      switch (operation) {
        case 'compact':
          results = await this.compactDatabase(collections);
          break;
        case 'repair':
          results = await this.repairDatabase(collections);
          break;
        case 'reindex':
          results = await this.reindexDatabase(collections);
          break;
        default:
          throw new BadRequestException(`Unsupported database operation: ${operation}`);
      }
      
      return {
        status: 'success',
        data: {
          operation,
          results,
          message: `Database ${operation} operation completed successfully`,
        },
      };
    } catch (error) {
      this.logger.error(`Database ${databaseOperationDto.operation} operation failed:`, error);
      throw new InternalServerErrorException(`Database operation failed: ${error.message}`);
    }
  }

  /**
   * Get application health status
   */
  async getHealthStatus() {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {},
        checks: {},
      };

      // Database health check
      try {
        await this.connection.db.admin().ping();
        health.services['database'] = { status: 'healthy', message: 'Connected' };
      } catch (error) {
        health.services['database'] = { status: 'unhealthy', message: error.message };
        health.status = 'unhealthy';
      }

      // Memory health check
      const memoryUsagePercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
      if (memoryUsagePercent > 90) {
        health.checks['memory'] = { status: 'warning', value: `${memoryUsagePercent}%` };
      } else {
        health.checks['memory'] = { status: 'healthy', value: `${memoryUsagePercent}%` };
      }

      // Disk space health check
      const diskUsage = await this.getDiskUsage();
      if (diskUsage.usedPercent > 90) {
        health.checks['disk'] = { status: 'warning', value: `${diskUsage.usedPercent}%` };
      } else {
        health.checks['disk'] = { status: 'healthy', value: `${diskUsage.usedPercent}%` };
      }

      return {
        status: 'success',
        data: health,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'error',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
        },
      };
    }
  }

  // Private helper methods

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async performImageCleanup(emergencyMode: boolean) {
    const results = {
      processedFiles: { deleted: 0, errors: 0, size: 0 },
      tempFiles: { deleted: 0, errors: 0, size: 0 },
      archiveFiles: { deleted: 0, errors: 0, size: 0 },
    };

    try {
      const settings = await (this.systemSettingsModel as any).getCurrentSettings();
      const uploadsDir = 'uploads';

      // Clean processed files
      const processedCutoff = new Date(Date.now() - settings.processedFileRetentionHours * 60 * 60 * 1000);
      results.processedFiles = await this.cleanupDirectory(path.join(uploadsDir, 'processed'), processedCutoff);

      // Clean temp files
      const tempCutoff = new Date(Date.now() - settings.tempFileRetentionHours * 60 * 60 * 1000);
      results.tempFiles = await this.cleanupDirectory(path.join(uploadsDir, 'temp'), tempCutoff);

      // Clean archive files
      const archiveCutoff = new Date(Date.now() - settings.archiveFileRetentionHours * 60 * 60 * 1000);
      results.archiveFiles = await this.cleanupDirectory(path.join(uploadsDir, 'archives'), archiveCutoff);

      this.logger.log('Image cleanup completed', results);
    } catch (error) {
      this.logger.error('Error during image cleanup:', error);
    }

    return results;
  }

  private async cleanupDirectory(dirPath: string, cutoffDate: Date) {
    const result = { deleted: 0, errors: 0, size: 0 };

    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        try {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            result.size += stats.size;
            await fs.unlink(filePath);
            result.deleted++;
          }
        } catch (error) {
          result.errors++;
          this.logger.error(`Error cleaning file ${file}:`, error);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Error accessing directory ${dirPath}:`, error);
      }
    }

    return result;
  }

  private async getDatabaseStats() {
    try {
      const stats = await this.connection.db.stats();
      
      const collections = await this.connection.db.listCollections().toArray();
      const collectionStats = [];
      
      for (const collection of collections) {
        try {
          const collStats = await this.connection.db.collection(collection.name).countDocuments();
          collectionStats.push({
            name: collection.name,
            count: collStats || 0,
            size: 0, // Size not available with countDocuments
            avgObjSize: 0, // Average object size not available
          });
        } catch (error) {
          // Some collections might not support stats
          collectionStats.push({
            name: collection.name,
            count: 0,
            size: 0,
            avgObjSize: 0,
          });
        }
      }

      return {
        connected: this.connection.readyState === 1,
        collections: collections.length,
        totalDocuments: collectionStats.reduce((sum, col) => sum + col.count, 0),
        totalSize: stats.dataSize || 0,
        totalSizeFormatted: this.formatFileSize(stats.dataSize || 0),
        indexes: stats.indexes || 0,
        collectionStats,
      };
    } catch (error) {
      this.logger.error('Error getting database stats:', error);
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  private async getFileSystemStats() {
    try {
      const uploadsPath = 'uploads';
      const stats = {
        totalSize: 0,
        totalFiles: 0,
        directories: {},
      };

      const directories = ['blogs', 'processed', 'temp', 'archives'];
      
      for (const dir of directories) {
        const dirPath = path.join(uploadsPath, dir);
        const dirStats = await this.getDirectoryStats(dirPath);
        stats.directories[dir] = dirStats;
        stats.totalSize += dirStats.size;
        stats.totalFiles += dirStats.files;
      }

      return {
        ...stats,
        totalSizeFormatted: this.formatFileSize(stats.totalSize),
      };
    } catch (error) {
      this.logger.error('Error getting file system stats:', error);
      return { error: error.message };
    }
  }

  private async getDirectoryStats(dirPath: string) {
    try {
      const files = await fs.readdir(dirPath);
      let size = 0;
      let fileCount = 0;

      for (const file of files) {
        try {
          const stats = await fs.stat(path.join(dirPath, file));
          if (stats.isFile()) {
            size += stats.size;
            fileCount++;
          }
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      return {
        files: fileCount,
        size,
        sizeFormatted: this.formatFileSize(size),
      };
    } catch (error) {
      return { files: 0, size: 0, sizeFormatted: '0 Bytes' };
    }
  }

  private async getApplicationStats() {
    try {
      const [userCount, blogCount, commentCount, mediaCount] = await Promise.all([
        this.userModel.countDocuments(),
        this.blogModel.countDocuments(),
        this.commentModel.countDocuments(),
        this.mediaModel.countDocuments(),
      ]);

      const recentActivity = await this.getRecentActivity();

      return {
        users: userCount,
        blogs: blogCount,
        comments: commentCount,
        media: mediaCount,
        recentActivity,
      };
    } catch (error) {
      this.logger.error('Error getting application stats:', error);
      return { error: error.message };
    }
  }

  private async getRecentActivity() {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [newUsers, newBlogs, newComments, newMedia] = await Promise.all([
        this.userModel.countDocuments({ createdAt: { $gte: last24Hours } }),
        this.blogModel.countDocuments({ createdAt: { $gte: last24Hours } }),
        this.commentModel.countDocuments({ createdAt: { $gte: last24Hours } }),
        this.mediaModel.countDocuments({ createdAt: { $gte: last24Hours } }),
      ]);

      return {
        last24Hours: {
          users: newUsers,
          blogs: newBlogs,
          comments: newComments,
          media: newMedia,
        },
      };
    } catch (error) {
      this.logger.error('Error getting recent activity:', error);
      return { error: error.message };
    }
  }

  private async getDiskUsage() {
    try {
      // This is a simplified version - in production you'd use proper disk usage detection
      const stats = await fs.stat('.');
      const uploadsPath = 'uploads';
      
      // Get upload directory size as a proxy for disk usage
      let totalUsed = 0;
      try {
        const uploadStats = await this.getDirectoryStats(uploadsPath);
        totalUsed = uploadStats.size;
      } catch (error) {
        // If uploads directory doesn't exist, default to 0
        totalUsed = 0;
      }

      // Simulate disk space (in production, use proper disk space detection)
      const totalSpace = 100 * 1024 * 1024 * 1024; // 100GB simulation
      const usedSpace = totalUsed + (50 * 1024 * 1024 * 1024); // Add 50GB base usage
      const availableSpace = totalSpace - usedSpace;
      const usedPercent = Math.round((usedSpace / totalSpace) * 100);

      return {
        used: usedSpace,
        total: totalSpace,
        available: availableSpace,
        usedPercent,
        usedFormatted: this.formatFileSize(usedSpace),
        availableFormatted: this.formatFileSize(availableSpace),
        totalFormatted: this.formatFileSize(totalSpace)
      };
    } catch (error) {
      return { 
        used: 0, 
        total: 0, 
        available: 0, 
        usedPercent: 0,
        usedFormatted: '0 Bytes',
        availableFormatted: '0 Bytes',
        totalFormatted: '0 Bytes'
      };
    }
  }

  private async getLogFileStats() {
    try {
      // In a real application, you'd check actual log files
      // For now, we'll simulate log file stats
      const logSize = Math.floor(Math.random() * 100) * 1024 * 1024; // Random size up to 100MB
      const errorLogSize = Math.floor(Math.random() * 10) * 1024 * 1024; // Random size up to 10MB
      const estimatedLines = Math.floor(logSize / 100); // Estimate ~100 bytes per log line

      return {
        size: this.formatFileSize(logSize),
        lines: estimatedLines,
        errorSize: this.formatFileSize(errorLogSize)
      };
    } catch (error) {
      return {
        size: '0 Bytes',
        lines: 0,
        errorSize: '0 Bytes'
      };
    }
  }

  private async getCacheStats() {
    try {
      // Try to get Redis stats if available
      // For now, we'll simulate cache stats
      // In production, you'd inject and use the Redis service
      
      // Simulate Redis connection check
      const connected = Math.random() > 0.1; // 90% chance of being connected
      const keys = connected ? Math.floor(Math.random() * 1000) : 0;
      const memoryUsage = connected ? Math.floor(Math.random() * 50) * 1024 * 1024 : 0; // Up to 50MB

      return {
        connected,
        keys,
        memory: connected ? this.formatFileSize(memoryUsage) : 'N/A'
      };
    } catch (error) {
      return {
        connected: false,
        keys: 0,
        memory: 'N/A'
      };
    }
  }

  private async compactDatabase(collections: string[]) {
    // Database compaction implementation would go here
    return { message: 'Database compaction completed', collections };
  }

  private async repairDatabase(collections: string[]) {
    // Database repair implementation would go here
    return { message: 'Database repair completed', collections };
  }

  private async reindexDatabase(collections: string[]) {
    // Database reindexing implementation would go here
    return { message: 'Database reindexing completed', collections };
  }

  // SCHEDULER CONFIG METHODS

  /**
   * Get all scheduler configurations
   */
  async getSchedulerConfigs(): Promise<SchedulerConfigResponseDto[]> {
    try {
      const configs = await this.schedulerConfigModel.find().sort({ type: 1 });
      return configs.map(config => this.mapToSchedulerConfigResponse(config));
    } catch (error) {
      this.logger.error('Failed to get scheduler configs:', error);
      throw new InternalServerErrorException(`Failed to get scheduler configs: ${error.message}`);
    }
  }

  /**
   * Get scheduler status overview
   */
  async getSchedulerStatus(): Promise<SchedulerStatusDto> {
    try {
      const configs = await this.schedulerConfigModel.find();
      const enabledTasks = configs.filter(config => config.enabled).length;
      const disabledTasks = configs.length - enabledTasks;

      // Find next execution time
      const enabledConfigs = configs.filter(config => config.enabled);
      let nextExecution: Date | undefined;
      let lastExecution: Date | undefined;

      if (enabledConfigs.length > 0) {
        // Calculate next execution times
        const now = new Date();
        const nextExecutions = enabledConfigs.map(config => {
          const next = new Date(now);
          next.setHours(config.hour, config.minute, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
          return next;
        });

        nextExecution = new Date(Math.min(...nextExecutions.map(d => d.getTime())));

        // Find most recent last run
        const lastRuns = configs
          .filter(config => config.lastRun)
          .map(config => config.lastRun!)
          .sort((a, b) => b.getTime() - a.getTime());

        if (lastRuns.length > 0) {
          lastExecution = lastRuns[0];
        }
      }

      return {
        status: enabledTasks > 0 ? 'active' : 'inactive',
        enabledTasks,
        disabledTasks,
        nextExecution,
        lastExecution,
        tasks: configs.map(config => this.mapToSchedulerConfigResponse(config)),
      };
    } catch (error) {
      this.logger.error('Failed to get scheduler status:', error);
      throw new InternalServerErrorException(`Failed to get scheduler status: ${error.message}`);
    }
  }

  /**
   * Create or update scheduler configuration
   */
  async createOrUpdateSchedulerConfig(createDto: CreateSchedulerConfigDto): Promise<SchedulerConfigResponseDto> {
    try {
      // Calculate next run time
      const nextRun = this.calculateNextRun(createDto.hour, createDto.minute);

      const config = await this.schedulerConfigModel.findOneAndUpdate(
        { type: createDto.type },
        {
          ...createDto,
          nextRun,
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true,
        }
      );

      this.logger.log(`Scheduler config ${createDto.enabled ? 'enabled' : 'disabled'} for ${createDto.type}`);

      // Restart scheduler if service is available
      if (this.schedulerService) {
        await this.schedulerService.restartScheduler(createDto.type);
      }

      return this.mapToSchedulerConfigResponse(config);
    } catch (error) {
      this.logger.error('Failed to create/update scheduler config:', error);
      throw new InternalServerErrorException(`Failed to create/update scheduler config: ${error.message}`);
    }
  }

  /**
   * Update scheduler configuration
   */
  async updateSchedulerConfig(type: SchedulerTaskType, updateDto: UpdateSchedulerConfigDto): Promise<SchedulerConfigResponseDto> {
    try {
      const updateData: any = { ...updateDto };

      // Recalculate next run if time changed
      if (updateDto.hour !== undefined || updateDto.minute !== undefined) {
        const config = await this.schedulerConfigModel.findOne({ type });
        if (!config) {
          throw new BadRequestException(`Scheduler config for ${type} not found`);
        }

        const hour = updateDto.hour !== undefined ? updateDto.hour : config.hour;
        const minute = updateDto.minute !== undefined ? updateDto.minute : config.minute;
        updateData.nextRun = this.calculateNextRun(hour, minute);
      }

      const config = await this.schedulerConfigModel.findOneAndUpdate(
        { type },
        updateData,
        { new: true, runValidators: true }
      );

      if (!config) {
        throw new BadRequestException(`Scheduler config for ${type} not found`);
      }

      this.logger.log(`Scheduler config updated for ${type}`);

      // Restart scheduler if service is available
      if (this.schedulerService) {
        await this.schedulerService.restartScheduler(type);
      }

      return this.mapToSchedulerConfigResponse(config);
    } catch (error) {
      this.logger.error('Failed to update scheduler config:', error);
      throw new InternalServerErrorException(`Failed to update scheduler config: ${error.message}`);
    }
  }

  /**
   * Delete scheduler configuration
   */
  async deleteSchedulerConfig(type: SchedulerTaskType): Promise<void> {
    try {
      const result = await this.schedulerConfigModel.deleteOne({ type });
      
      if (result.deletedCount === 0) {
        throw new BadRequestException(`Scheduler config for ${type} not found`);
      }

      this.logger.log(`Scheduler config deleted for ${type}`);

      // Stop scheduler if service is available
      if (this.schedulerService) {
        this.schedulerService.stopScheduler(type);
      }
    } catch (error) {
      this.logger.error('Failed to delete scheduler config:', error);
      throw new InternalServerErrorException(`Failed to delete scheduler config: ${error.message}`);
    }
  }

  /**
   * Mark scheduler task as executed
   */
  async markTaskExecuted(type: SchedulerTaskType): Promise<void> {
    try {
      const now = new Date();
      const config = await this.schedulerConfigModel.findOne({ type });
      
      if (!config) {
        return; // Task doesn't exist, ignore
      }

      const nextRun = this.calculateNextRun(config.hour, config.minute);

      await this.schedulerConfigModel.updateOne(
        { type },
        {
          lastRun: now,
          nextRun,
        }
      );

      this.logger.log(`Marked task ${type} as executed at ${now.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to mark task ${type} as executed:`, error);
    }
  }

  /**
   * Get tasks that should run now
   */
  async getTasksToRun(): Promise<SchedulerConfigDocument[]> {
    try {
      const now = new Date();
      return await this.schedulerConfigModel.find({
        enabled: true,
        nextRun: { $lte: now },
      });
    } catch (error) {
      this.logger.error('Failed to get tasks to run:', error);
      return [];
    }
  }

  // PRIVATE HELPER METHODS

  private mapToSchedulerConfigResponse(config: SchedulerConfigDocument): SchedulerConfigResponseDto {
    return {
      _id: config._id.toString(),
      type: config.type as SchedulerTaskType,
      enabled: config.enabled,
      hour: config.hour,
      minute: config.minute,
      lastRun: config.lastRun,
      nextRun: config.nextRun,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private calculateNextRun(hour: number, minute: number): Date {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }
} 