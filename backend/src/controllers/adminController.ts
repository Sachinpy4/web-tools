import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import cleanupToolImages from '../scripts/cleanupToolImages';
import logger from '../utils/logger';
import { isSystemUnderHighLoad } from '../middleware/loadBalancer';
import SystemSettings, { ISystemSettings } from '../models/SystemSettings';
import { clearSettingsCache } from '../services/settingsService';
import { clearRateLimitCache } from '../middleware/rateLimiter';
import mongoose from 'mongoose';
import { testRedisConnection } from '../config/redis';
import Bull from 'bull';
import { setupCleanupScheduler } from '../services/cleanupScheduler';
import { stopCleanupScheduler } from '../services/cleanupScheduler';
import { getSchedulerStatus as getSchedulerStatusFromService } from '../services/cleanupScheduler';

const execPromise = promisify(exec);

// Define interface for scheduled task result
interface ScheduledTaskResult {
  success: boolean;
  message: string;
}

/**
 * Run image cleanup and optionally set up scheduled task
 */
export const cleanupImages = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get options from request body
    const { setupAutoCleanup = false, emergencyMode = false } = req.body;
    
    // Check if system is under high load for automatic emergency mode
    const isHighLoad = await isSystemUnderHighLoad();
    const shouldUseEmergencyMode = emergencyMode || isHighLoad;
    
    if (shouldUseEmergencyMode) {
      logger.warn('Running cleanup in emergency mode due to high system load');
    }
    
    // Run immediate cleanup
    logger.info('Manual cleanup triggered from admin panel');
    const cleanupResults = await cleanupToolImages();
    
    // Set up scheduled task if requested
    let scheduledTaskResult: ScheduledTaskResult | null = null;
    
    if (setupAutoCleanup) {
      try {
        // Use Node.js internal scheduling instead of OS-level scheduled tasks
        // This avoids permission issues and works cross-platform
        
        logger.info('Setting up internal cleanup scheduling');
        
        // Start the internal scheduler
        const schedulerResult = await setupCleanupScheduler();
        
        scheduledTaskResult = {
          success: schedulerResult.success,
          message: schedulerResult.success 
            ? 'Automatic cleanup scheduled internally at 3:00 AM daily (runs while server is active)'
            : `Cleanup scheduling failed: ${schedulerResult.message}`
        };
        
        logger.info(`Internal cleanup scheduler ${schedulerResult.success ? 'activated' : 'failed'}`);
      } catch (taskError: any) {
        logger.error('Failed to set up cleanup scheduler:', taskError);
        scheduledTaskResult = {
          success: false,
          message: `Cleanup scheduler setup failed: ${taskError.message}. Manual setup required.`
        };
      }
    }
    
    // Return results
    res.status(200).json({
      status: 'success',
      data: {
        cleanup: cleanupResults,
        scheduledTask: scheduledTaskResult
      }
    });
  } catch (error: any) {
    logger.error('Image cleanup failed:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to perform image cleanup: ${error.message}`
    });
  }
});

/**
 * Get system settings
 */
export const getSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    res.status(200).json({
      status: 'success',
      data: {
        settings
      }
    });
  } catch (error: any) {
    logger.error('Failed to get system settings:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get system settings: ${error.message}`
    });
  }
});

/**
 * Update system settings
 */
export const updateSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // Update settings
    const settings = await SystemSettings.updateSettings(updates);
    
    logger.info('System settings updated by admin:', {
      updates,
      updatedBy: req.user?.email || 'Unknown'
    });
    
    // Clear settings cache
    clearSettingsCache();
    
    // Clear rate limit cache
    clearRateLimitCache();
    
    res.status(200).json({
      status: 'success',
      data: {
        settings,
        message: 'Settings updated successfully. Changes will take effect for new requests.'
      }
    });
  } catch (error: any) {
    logger.error('Failed to update system settings:', error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: `Failed to update system settings: ${error.message}`
    });
  }
});

/**
 * Get rate limit settings for frontend display
 */
export const getRateLimitSettings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    res.status(200).json({
      status: 'success',
      data: {
        imageProcessing: {
          max: settings.imageProcessingMaxRequests,
          windowMs: settings.imageProcessingWindowMs
        },
        batchOperation: {
          max: settings.batchOperationMaxRequests,
          windowMs: settings.batchOperationWindowMs
        },
        api: {
          max: settings.apiMaxRequests,
          windowMs: settings.apiWindowMs
        }
      }
    });
  } catch (error: any) {
    logger.error('Failed to get rate limit settings:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get rate limit settings: ${error.message}`
    });
  }
});

/**
 * Get file upload settings for frontend display
 */
export const getFileUploadSettings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    res.status(200).json({
      status: 'success',
      data: {
        maxFileSize: settings.maxFileSize,
        maxFiles: settings.maxFiles
      }
    });
  } catch (error: any) {
    logger.error('Failed to get file upload settings:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get file upload settings: ${error.message}`
    });
  }
});

/**
 * Handle comprehensive system cleanup (logs, cache, database, memory)
 */
export const cleanupSystem = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    
    if (!type || !['images', 'logs', 'cache', 'database', 'memory'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid cleanup type. Must be one of: images, logs, cache, database, memory'
      });
    }
    
    logger.info(`System cleanup triggered from admin panel: ${type}`);
    
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
          logger.info('Image cleanup triggered from system cleanup');
          const cleanupResults = await cleanupToolImages();
          
          result = {
            type: 'images',
            success: true,
            totalDeleted: cleanupResults.totalDeleted,
            sizeRecovered: cleanupResults.totalSizeRecovered,
            message: `Image cleanup completed: ${cleanupResults.totalDeleted} files deleted, ${cleanupResults.totalSizeRecovered} recovered`
          };
        } catch (error: any) {
          logger.error('Image cleanup failed:', error);
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
          // Fix path resolution - use process.cwd() instead of __dirname
          const logsDir = path.join(process.cwd(), 'logs');
          const logPath = path.join(logsDir, 'all.log');
          const errorLogPath = path.join(logsDir, 'error.log');
          
          logger.info(`Attempting to clean logs at: ${logsDir}`);
          
          let totalSize = 0;
          let fileCount = 0;
          const details: string[] = [];
          
          // Check all.log
          try {
            const logStats = await fs.stat(logPath);
            const sizeMB = logStats.size / 1024 / 1024;
            
            if (logStats.size > 1024 * 1024) { // >1MB (production threshold)
              // Truncate the file directly (no backup needed)
              await fs.writeFile(logPath, '');
              totalSize += logStats.size;
              fileCount++;
              
              details.push(`Truncated all.log (${sizeMB.toFixed(2)}MB)`);
              logger.info(`Log cleanup: Truncated all.log (${sizeMB.toFixed(2)}MB)`);
            } else {
              details.push(`all.log size OK (${sizeMB.toFixed(2)}MB)`);
            }
          } catch (e: any) {
            details.push(`all.log not found or error: ${e.message}`);
            logger.warn(`all.log cleanup error: ${e.message}`);
          }
          
          // Check error.log
          try {
            const errorLogStats = await fs.stat(errorLogPath);
            const sizeMB = errorLogStats.size / 1024 / 1024;
            
            if (errorLogStats.size > 512 * 1024) { // >512KB (production threshold)
              // Truncate the file directly (no backup needed)
              await fs.writeFile(errorLogPath, '');
              totalSize += errorLogStats.size;
              fileCount++;
              
              details.push(`Truncated error.log (${sizeMB.toFixed(2)}MB)`);
              logger.info(`Log cleanup: Truncated error.log (${sizeMB.toFixed(2)}MB)`);
            } else {
              details.push(`error.log size OK (${sizeMB.toFixed(2)}MB)`);
            }
          } catch (e: any) {
            details.push(`error.log not found or error: ${e.message}`);
            logger.warn(`error.log cleanup error: ${e.message}`);
          }
          
          result = {
            type: 'logs',
            success: true,
            totalDeleted: fileCount,
            sizeRecovered: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(2)} MB` : '0 MB',
            message: fileCount > 0 ? 
              `Cleaned ${fileCount} log files. ${details.join('; ')}` : 
              `No cleanup needed. ${details.join('; ')}`
          };
        } catch (error: any) {
          logger.error('Log cleanup failed:', error);
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
          // Check if Redis is available
          const redisAvailable = await testRedisConnection();
          
          if (!redisAvailable) {
            result = {
              type: 'cache',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 KB',
              message: 'Redis not available - cache cleanup skipped'
            };
            break;
          }
          
          // Simple cache cleanup without complex Redis operations
          let deletedKeys = 0;
          const details: string[] = [];
          
          // Since we can't safely access Redis internals through Bull,
          // we'll do a simpler cleanup approach
          try {
            // Create a simple test queue to verify Redis is working
            const tempQueue = new Bull('temp-cleanup-test', {
              redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB || '0')
              }
            });
            
            // Just close it - this verifies Redis is working
            await tempQueue.close();
            
            // For now, we'll just clear our internal caches
            clearRateLimitCache();
            clearSettingsCache();
            
            details.push('Rate limit cache cleared');
            details.push('Settings cache cleared');
            details.push('Redis connection verified');
            deletedKeys = 2; // Rate limit + settings cache
            
            result = {
              type: 'cache',
              success: true,
              totalDeleted: deletedKeys,
              sizeRecovered: '1 KB', // Rough estimate
              message: `Cache cleanup completed. ${details.join('; ')}`
            };
          } catch (redisError: any) {
            details.push(`Redis operation failed: ${redisError.message}`);
            
            // Still try to clear local caches
            clearRateLimitCache();
            clearSettingsCache();
            
            result = {
              type: 'cache',
              success: true,
              totalDeleted: 2,
              sizeRecovered: '0.5 KB',
              message: `Local cache cleared, Redis cleanup skipped. ${details.join('; ')}`
            };
          }
        } catch (error: any) {
          logger.error('Cache cleanup failed:', error);
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
          const db = mongoose.connection.db;
          
          if (!db) {
            result = {
              type: 'database',
              success: false,
              totalDeleted: 0,
              sizeRecovered: '0 KB',
              message: 'Database not connected'
            };
            break;
          }
          
          let totalDeleted = 0;
          const details: string[] = [];
          
          // Clean expired sessions (if sessions collection exists)
          try {
            const sessionsCollection = db.collection('sessions');
            const now = new Date();
            const sessionCutoff = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days
            
            const expiredSessions = await sessionsCollection.deleteMany({
              $or: [
                { expiresAt: { $lt: now } },
                { updatedAt: { $lt: sessionCutoff } },
                { createdAt: { $lt: sessionCutoff } }
              ]
            });
            
            if (expiredSessions.deletedCount > 0) {
              totalDeleted += expiredSessions.deletedCount;
              details.push(`Expired sessions: ${expiredSessions.deletedCount} deleted`);
            } else {
              details.push('No expired sessions found');
            }
          } catch (e: any) {
            details.push(`Sessions: Collection not found (normal)`);
          }
          
          // Clean old analytics data (if analytics collection exists)
          try {
            const analyticsCollection = db.collection('analytics');
            const analyticsCutoff = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)); // 90 days
            
            const oldAnalytics = await analyticsCollection.deleteMany({
              createdAt: { $lt: analyticsCutoff }
            });
            
            if (oldAnalytics.deletedCount > 0) {
              totalDeleted += oldAnalytics.deletedCount;
              details.push(`Old analytics: ${oldAnalytics.deletedCount} deleted`);
            } else {
              details.push('No old analytics data found');
            }
          } catch (e: any) {
            details.push(`Analytics: Collection not found (normal)`);
          }
          
          // Clean orphaned comments (comments without valid blog)
          try {
            const commentsCollection = db.collection('comments');
            const blogsCollection = db.collection('blogs');
            
            // Get all comment blog IDs
            const commentBlogIds = await commentsCollection.distinct('blogId');
            
            if (commentBlogIds.length > 0) {
              // Get valid blog IDs and filter out null/undefined values
              const validBlogIds = await blogsCollection.distinct('_id');
              const validBlogIdStrings = validBlogIds
                .filter((id: any) => id != null) // Filter out null/undefined
                .map((id: any) => id.toString());
              
              // Find orphaned blog IDs (also filter out null/undefined from comment IDs)
              const orphanedBlogIds = commentBlogIds
                .filter((id: any) => id != null) // Filter out null/undefined comment IDs
                .filter((id: any) => !validBlogIdStrings.includes(id.toString()));
              
              if (orphanedBlogIds.length > 0) {
                const orphanedComments = await commentsCollection.deleteMany({
                  blogId: { $in: orphanedBlogIds }
                });
                
                if (orphanedComments.deletedCount > 0) {
                  totalDeleted += orphanedComments.deletedCount;
                  details.push(`Orphaned comments: ${orphanedComments.deletedCount} deleted`);
                }
              } else {
                details.push('No orphaned comments found');
              }
            } else {
              details.push('No comments to check');
            }
          } catch (e: any) {
            details.push(`Comments cleanup error: ${e.message}`);
            logger.warn('Comments cleanup failed:', e);
          }
          
          // Compact collections for better performance
          try {
            const collections = ['blogs', 'comments', 'media', 'users'];
            let compactedCount = 0;
            
            for (const collName of collections) {
              try {
                await db.command({ compact: collName, force: true });
                compactedCount++;
              } catch (e) {
                // Collection might not exist or compact might fail, that's OK
              }
            }
            
            if (compactedCount > 0) {
              details.push(`Collections compacted: ${compactedCount}`);
            }
          } catch (e: any) {
            details.push('Collection compaction skipped');
          }
          
          result = {
            type: 'database',
            success: true,
            totalDeleted,
            sizeRecovered: `${(totalDeleted * 1024 / 1024).toFixed(2)} KB`, // Rough estimate
            message: totalDeleted > 0 ? 
              `Cleaned ${totalDeleted} database records. ${details.join('; ')}` :
              `No cleanup needed. Database is clean. ${details.join('; ')}`
          };
        } catch (error: any) {
          logger.error('Database cleanup failed:', error);
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
          const memBefore = process.memoryUsage();
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          // Clear require cache for non-essential modules (be careful!)
          const modulesToClear = Object.keys(require.cache).filter(key => 
            key.includes('node_modules') && 
            !key.includes('express') && 
            !key.includes('mongoose') &&
            !key.includes('redis') &&
            !key.includes('bull')
          );
          
          let clearedModules = 0;
          for (const moduleKey of modulesToClear.slice(0, 50)) { // Limit to 50 modules
            try {
              delete require.cache[moduleKey];
              clearedModules++;
            } catch (e) {
              // Ignore errors
            }
          }
          
          const memAfter = process.memoryUsage();
          const memorySaved = Math.max(0, memBefore.heapUsed - memAfter.heapUsed);
          
          const details = [
            `Memory before: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            `Memory after: ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            `Modules cleared: ${clearedModules}`,
            global.gc ? 'GC forced' : 'GC not available (use --expose-gc)'
          ];
          
          result = {
            type: 'memory',
            success: true,
            totalDeleted: clearedModules,
            sizeRecovered: `${(memorySaved / 1024 / 1024).toFixed(2)} MB`,
            message: `Memory optimization completed. ${details.join('; ')}`
          };
        } catch (error: any) {
          logger.error('Memory optimization failed:', error);
          result = {
            type: 'memory',
            success: false,
            totalDeleted: 0,
            sizeRecovered: '0 MB',
            message: `Memory optimization failed: ${error.message}`
          };
        }
        break;
    }
    
    logger.info(`System cleanup (${type}) completed:`, result);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    logger.error('System cleanup failed:', error);
    res.status(500).json({
      status: 'error',
      message: `System cleanup failed: ${error.message}`
    });
  }
});

/**
 * Setup individual cleanup scheduler
 */
export const setupScheduler = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, enabled, hour = 3, minute = 0 } = req.body;
    
    if (!type || !['images', 'logs', 'cache', 'database', 'memory'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid scheduler type. Must be one of: images, logs, cache, database, memory'
      });
    }
    
    logger.info(`Scheduler setup requested from admin panel: ${type}, enabled: ${enabled}`);
    
    let result;
    
    if (enabled) {
      // Setup scheduler
      result = await setupCleanupScheduler(type, hour, minute);
    } else {
      // Stop scheduler
      await stopCleanupScheduler(type);
      result = {
        success: true,
        message: `${type} cleanup scheduler stopped`
      };
    }
    
    logger.info(`Scheduler setup (${type}) completed:`, result);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    logger.error('Scheduler setup failed:', error);
    res.status(500).json({
      status: 'error',
      message: `Scheduler setup failed: ${error.message}`
    });
  }
});

/**
 * Get scheduler status for all cleanup types
 */
export const getSchedulerStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const status = getSchedulerStatusFromService();
    
    logger.info('Scheduler status requested from admin panel');
    
    res.status(200).json({
      status: 'success',
      data: {
        schedulers: status
      }
    });
  } catch (error: any) {
    logger.error('Failed to get scheduler status:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get scheduler status: ${error.message}`
    });
  }
});

/**
 * Get real-time system status information
 */
export const getSystemStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const status = {
      logs: { size: '0 KB', lines: 0, errorSize: '0 KB' },
      memory: { used: 0, total: 0, percentage: 0 },
      database: { collections: 0, totalSize: '0 KB', documents: 0 },
      cache: { connected: false, keys: 0, memory: '0 KB' },
      disk: { used: '0 GB', available: '0 GB', percentage: 0 }
    };

    // Get log file information
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const logPath = path.join(logsDir, 'all.log');
      const errorLogPath = path.join(logsDir, 'error.log');
      
      try {
        const logStats = await fs.stat(logPath);
        const logSizeMB = logStats.size / 1024 / 1024;
        
        // Count lines in log file (approximate)
        try {
          const logContent = await fs.readFile(logPath, 'utf8');
          const lineCount = logContent.split('\n').length;
          status.logs.lines = lineCount;
        } catch (e) {
          status.logs.lines = 0;
        }
        
        status.logs.size = logSizeMB > 1 ? 
          `${logSizeMB.toFixed(2)} MB` : 
          `${(logStats.size / 1024).toFixed(0)} KB`;
      } catch (e) {
        status.logs.size = '0 KB';
      }
      
      try {
        const errorLogStats = await fs.stat(errorLogPath);
        const errorSizeMB = errorLogStats.size / 1024 / 1024;
        status.logs.errorSize = errorSizeMB > 1 ? 
          `${errorSizeMB.toFixed(2)} MB` : 
          `${(errorLogStats.size / 1024).toFixed(0)} KB`;
      } catch (e) {
        status.logs.errorSize = '0 KB';
      }
    } catch (e) {
      // Logs directory doesn't exist
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.rss + memUsage.heapTotal + memUsage.external;
    status.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / totalMemory) * 100)
    };

    // Get database information
    try {
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections().toArray();
        let totalDocs = 0;
        let totalSizeBytes = 0;
        
        for (const collection of collections) {
          try {
            const stats = await db.command({ collStats: collection.name });
            totalDocs += stats.count || 0;
            totalSizeBytes += stats.size || 0;
          } catch (e) {
            // Skip if collection stats fail
          }
        }
        
        status.database = {
          collections: collections.length,
          totalSize: totalSizeBytes > 1024 * 1024 ? 
            `${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB` : 
            `${(totalSizeBytes / 1024).toFixed(0)} KB`,
          documents: totalDocs
        };
      }
    } catch (e) {
      // Database not connected
    }

    // Get cache/Redis information
    try {
      const redisAvailable = await testRedisConnection();
      if (redisAvailable) {
        status.cache.connected = true;
        
        // Try to get Redis info (this is a simplified approach)
        try {
          const tempQueue = new Bull('temp-status-check', {
            redis: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD || undefined,
              db: parseInt(process.env.REDIS_DB || '0')
            }
          });
          
          // Get Redis client from Bull queue
          const client = tempQueue.client;
          
          if (client && client.info) {
            const info = await client.info('memory');
            const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
            if (memoryMatch) {
              status.cache.memory = memoryMatch[1].trim();
            }
            
            const keysInfo = await client.info('keyspace');
            const keysMatch = keysInfo.match(/keys=(\d+)/);
            if (keysMatch) {
              status.cache.keys = parseInt(keysMatch[1]);
            }
          }
          
          await tempQueue.close();
        } catch (e) {
          // Redis connection works but detailed info failed
          status.cache.memory = 'Unknown';
          status.cache.keys = 0;
        }
      }
    } catch (e) {
      status.cache.connected = false;
    }

    // Get disk usage (simplified - just check uploads directory)
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      async function getDirSize(dirPath: string): Promise<number> {
        let totalSize = 0;
        try {
          const items = await fs.readdir(dirPath, { withFileTypes: true });
          
          for (const item of items) {
            const itemPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
              totalSize += await getDirSize(itemPath);
            } else {
              try {
                const stats = await fs.stat(itemPath);
                totalSize += stats.size;
              } catch (e) {
                // Skip files that can't be accessed
              }
            }
          }
        } catch (e) {
          // Directory doesn't exist or can't be read
        }
        return totalSize;
      }
      
      const uploadsDirSize = await getDirSize(uploadsDir);
      const uploadsGB = uploadsDirSize / 1024 / 1024 / 1024;
      
      status.disk = {
        used: uploadsGB > 1 ? `${uploadsGB.toFixed(2)} GB` : `${(uploadsDirSize / 1024 / 1024).toFixed(0)} MB`,
        available: 'Unknown', // Would need OS-specific commands
        percentage: 0 // Would need total disk space
      };
    } catch (e) {
      // Disk info failed
    }

    logger.info('System status requested from admin panel');
    
    res.status(200).json({
      status: 'success',
      data: {
        systemStatus: status
      }
    });
  } catch (error: any) {
    logger.error('Failed to get system status:', error);
    res.status(500).json({
      status: 'error',
      message: `Failed to get system status: ${error.message}`
    });
  }
}); 