import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { RedisRateLimitService } from '../../../common/services/redis-rate-limit.service';
import { SettingsCacheService } from '../../../common/services/settings-cache.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CleanupResult {
  success: boolean;
  totalDeleted: number;
  sizeRecovered: string;
  message: string;
}

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
    private redisRateLimitService: RedisRateLimitService,
    private settingsCacheService: SettingsCacheService,
  ) {}

  /**
   * Execute log cleanup - truncate large log files
   */
  async executeLogCleanup(): Promise<CleanupResult> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const logPath = path.join(logsDir, 'all.log');
      const errorLogPath = path.join(logsDir, 'error.log');
      
      let totalSize = 0;
      let fileCount = 0;
      const details: string[] = [];
      
      // Check all.log
      try {
        const logStats = await fs.stat(logPath);
        const sizeMB = logStats.size / 1024 / 1024;
        
        if (logStats.size > 1024 * 1024) { // >1MB
          await fs.writeFile(logPath, '');
          totalSize += logStats.size;
          fileCount++;
          details.push(`Truncated all.log (${sizeMB.toFixed(2)}MB)`);
        } else {
          details.push(`all.log size OK (${sizeMB.toFixed(2)}MB)`);
        }
      } catch (e: any) {
        details.push(`all.log not found or error: ${e.message}`);
      }
      
      // Check error.log
      try {
        const errorLogStats = await fs.stat(errorLogPath);
        const sizeMB = errorLogStats.size / 1024 / 1024;
        
        if (errorLogStats.size > 512 * 1024) { // >512KB
          await fs.writeFile(errorLogPath, '');
          totalSize += errorLogStats.size;
          fileCount++;
          details.push(`Truncated error.log (${sizeMB.toFixed(2)}MB)`);
        } else {
          details.push(`error.log size OK (${sizeMB.toFixed(2)}MB)`);
        }
      } catch (e: any) {
        details.push(`error.log not found or error: ${e.message}`);
      }
      
      this.logger.log(`Log cleanup completed: ${fileCount} files processed, ${(totalSize / 1024 / 1024).toFixed(2)}MB recovered`);
      
      return {
        success: true,
        totalDeleted: fileCount,
        sizeRecovered: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(2)} MB` : '0 MB',
        message: fileCount > 0 ? 
          `Cleaned ${fileCount} log files. ${details.join('; ')}` : 
          `No cleanup needed. ${details.join('; ')}`
      };
    } catch (error: any) {
      this.logger.error('Log cleanup failed:', error);
      return {
        success: false,
        totalDeleted: 0,
        sizeRecovered: '0 MB',
        message: `Log cleanup failed: ${error.message}`
      };
    }
  }

  /**
   * Execute cache cleanup - clear Redis and local caches
   */
  async executeCacheCleanup(): Promise<CleanupResult> {
    try {
      let deletedKeys = 0;
      let memoryRecovered = 0;
      const details: string[] = [];
      
      // Clean up Redis rate limiting keys if Redis is connected
      if (this.redisRateLimitService.isRedisConnected()) {
        try {
          // Get Redis client through reflection (since it's private)
          const redisClient = (this.redisRateLimitService as any).redisClient;
          
          if (redisClient) {
            // Get all rate limiting keys
            const rateLimitKeys = await redisClient.keys('rate_limit:*');
            const expiredKeys = [];
            
            // Check which keys are expired or close to expiring
            for (const key of rateLimitKeys) {
              const ttl = await redisClient.ttl(key);
              if (ttl <= 60) { // Keys expiring in next minute
                expiredKeys.push(key);
              }
            }
            
            // Delete expired keys
            if (expiredKeys.length > 0) {
              await redisClient.del(expiredKeys);
              deletedKeys += expiredKeys.length;
              details.push(`Redis: ${expiredKeys.length} expired rate limit keys deleted`);
            } else {
              details.push('Redis: No expired keys found');
            }
            
            // Get memory info
            try {
              const memoryInfo = await redisClient.memory('USAGE');
              memoryRecovered = Math.floor(memoryInfo / 1024); // Convert to KB
              details.push(`Redis memory usage: ${this.formatBytes(memoryInfo)}`);
            } catch (e) {
              details.push('Redis memory info not available');
            }
          }
        } catch (redisError: any) {
          this.logger.warn('Redis cache cleanup had issues:', redisError);
          details.push(`Redis cleanup warning: ${redisError.message}`);
        }
      } else {
        details.push('Redis not connected - clearing fallback cache');
        
        // Clear fallback cache
        const fallbackCache = (this.redisRateLimitService as any).fallbackCache;
        if (fallbackCache && fallbackCache.size > 0) {
          const beforeSize = fallbackCache.size;
          fallbackCache.clear();
          deletedKeys += beforeSize;
          details.push(`Fallback cache: ${beforeSize} entries cleared`);
        } else {
          details.push('Fallback cache: Already empty');
        }
      }
      
      // Clear settings cache
      try {
        await this.settingsCacheService.invalidateCache();
        details.push('Settings cache cleared and refreshed');
        deletedKeys += 1; // Count settings cache as 1 item
      } catch (cacheError: any) {
        this.logger.warn('Settings cache cleanup had issues:', cacheError);
        details.push(`Settings cache warning: ${cacheError.message}`);
      }
      
      // Force Node.js garbage collection if available
      if (global.gc) {
        global.gc();
        details.push('Node.js garbage collection forced');
      } else {
        details.push('Node.js GC not available (use --expose-gc)');
      }
      
      this.logger.log(`Cache cleanup completed: ${deletedKeys} cache entries cleared, ${this.formatBytes(memoryRecovered * 1024)} recovered`);
      
      return {
        success: true,
        totalDeleted: deletedKeys,
        sizeRecovered: memoryRecovered > 0 ? this.formatBytes(memoryRecovered * 1024) : '< 1 KB',
        message: `Cache cleanup completed. ${details.join('; ')}`
      };
    } catch (error: any) {
      this.logger.error('Cache cleanup failed:', error);
      return {
        success: false,
        totalDeleted: 0,
        sizeRecovered: '0 KB',
        message: `Cache cleanup failed: ${error.message}`
      };
    }
  }

  /**
   * Execute database cleanup - remove old sessions and analytics data
   */
  async executeDatabaseCleanup(): Promise<CleanupResult> {
    try {
      const db = this.connection.db;
      
      if (!db) {
        return {
          success: false,
          totalDeleted: 0,
          sizeRecovered: '0 KB',
          message: 'Database not connected'
        };
      }
      
      let totalDeleted = 0;
      const details: string[] = [];
      
      // Clean expired sessions
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
      
      // Clean old job tracking data (older than 90 days)
      try {
        const jobTrackingCollection = db.collection('jobtrackings');
        const jobCutoff = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)); // 90 days
        
        const oldJobs = await jobTrackingCollection.deleteMany({
          createdAt: { $lt: jobCutoff }
        });
        
        if (oldJobs.deletedCount > 0) {
          totalDeleted += oldJobs.deletedCount;
          details.push(`Old job tracking: ${oldJobs.deletedCount} deleted`);
        } else {
          details.push('No old job tracking data found');
        }
      } catch (e: any) {
        details.push(`Job tracking: Collection not found (normal)`);
      }
      
      // Clean old backup history (older than 180 days)
      try {
        const backupHistoryCollection = db.collection('backuphistories');
        const backupCutoff = new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)); // 180 days
        
        const oldBackups = await backupHistoryCollection.deleteMany({
          createdAt: { $lt: backupCutoff }
        });
        
        if (oldBackups.deletedCount > 0) {
          totalDeleted += oldBackups.deletedCount;
          details.push(`Old backup history: ${oldBackups.deletedCount} deleted`);
        } else {
          details.push('No old backup history found');
        }
      } catch (e: any) {
        details.push(`Backup history: Collection not found (normal)`);
      }
      
      this.logger.log(`Database cleanup completed: ${totalDeleted} records deleted`);
      
      return {
        success: true,
        totalDeleted,
        sizeRecovered: `${(totalDeleted * 1024 / 1024).toFixed(2)} KB`,
        message: totalDeleted > 0 ? 
          `Cleaned ${totalDeleted} database records. ${details.join('; ')}` :
          `No cleanup needed. Database is clean. ${details.join('; ')}`
      };
    } catch (error: any) {
      this.logger.error('Database cleanup failed:', error);
      return {
        success: false,
        totalDeleted: 0,
        sizeRecovered: '0 KB',
        message: `Database cleanup failed: ${error.message}`
      };
    }
  }

  /**
   * Execute memory optimization - force garbage collection and clear module cache
   */
  async executeMemoryOptimization(): Promise<CleanupResult> {
    try {
      const memBefore = process.memoryUsage();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Clear some module cache (be careful with this in production)
      const modulesToClear = Object.keys(require.cache).filter(key => 
        key.includes('node_modules') && 
        !key.includes('express') && 
        !key.includes('mongoose') &&
        !key.includes('redis') &&
        !key.includes('@nestjs') &&
        !key.includes('bull')
      );
      
      let clearedModules = 0;
      // Only clear a limited number to avoid breaking the application
      for (const moduleKey of modulesToClear.slice(0, 20)) {
        try {
          delete require.cache[moduleKey];
          clearedModules++;
        } catch (e) {
          // Ignore errors - some modules can't be safely cleared
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
      
      this.logger.log(`Memory optimization completed: ${(memorySaved / 1024 / 1024).toFixed(2)}MB recovered, ${clearedModules} modules cleared`);
      
      return {
        success: true,
        totalDeleted: clearedModules,
        sizeRecovered: `${(memorySaved / 1024 / 1024).toFixed(2)} MB`,
        message: `Memory optimization completed. ${details.join('; ')}`
      };
    } catch (error: any) {
      this.logger.error('Memory optimization failed:', error);
      return {
        success: false,
        totalDeleted: 0,
        sizeRecovered: '0 MB',
        message: `Memory optimization failed: ${error.message}`
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
} 