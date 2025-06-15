import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import archiver from 'archiver';
import BackupHistory, { IBackupHistory } from '../models/BackupHistory';
import logger from '../utils/logger';

// Import all models for backup
import Blog from '../models/Blog';
import User from '../models/User';
import Comment from '../models/Comment';
import Media from '../models/Media';
import SystemSettings from '../models/SystemSettings';
import Script from '../models/Script';
import PageSeo from '../models/PageSeo';
import SchedulerConfig from '../models/SchedulerConfig';

interface BackupOptions {
  type: 'full' | 'incremental' | 'selective';
  collections?: string[];
  compress?: boolean;
  description?: string;
  createdBy: string;
}

interface BackupResult {
  success: boolean;
  backupId?: string;
  filename?: string;
  size?: number;
  message: string;
  error?: string;
}

export class BackupService {
  private backupDir: string;
  
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDirectory();
  }
  
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create backup directory:', error);
    }
  }
  
  /**
   * Get all available collection names
   */
  /**
   * Get available collections for backup
   * Excludes system collections like backup history and restore history to prevent circular dependencies
   */
  private getAvailableCollections(): string[] {
    return [
      'blogs',
      'users', 
      'comments',
      'media',
      'systemsettings',
      'scripts',
      'pageseo',
      'schedulerconfigs'
      // Excluded: 'backuphistory', 'restorehistory' - System collections that shouldn't be backed up
    ];
  }
  
  /**
   * Get mongoose model by collection name
   */
  private getModelByCollection(collectionName: string): mongoose.Model<any> {
    const modelMap: { [key: string]: mongoose.Model<any> } = {
      'blogs': Blog,
      'users': User,
      'comments': Comment,
      'media': Media,
      'systemsettings': SystemSettings,
      'scripts': Script,
      'pageseo': PageSeo,
      'schedulerconfigs': SchedulerConfig
    };
    
    const model = modelMap[collectionName];
    if (!model) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }
    
    return model;
  }
  
  /**
   * Create a new backup
   */
  async createBackup(options: BackupOptions): Promise<BackupResult> {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${options.type}_${timestamp}.json`;
    const filePath = path.join(this.backupDir, filename);
    
    // Create backup history record
    let backupRecord: IBackupHistory;
    try {
      const collections = options.collections || this.getAvailableCollections();
      
      backupRecord = await BackupHistory.create({
        filename,
        filePath,
        originalName: filename,
        type: options.type,
        collections,
        size: 0, // Will be updated when completed
        status: 'creating',
        createdBy: options.createdBy,
        description: options.description,
        compression: options.compress || false,
        encryption: false
      });
      
      logger.info(`Starting ${options.type} backup`, { backupId, collections, createdBy: options.createdBy });
      
    } catch (error: any) {
      logger.error('Failed to create backup record:', error);
      return {
        success: false,
        message: 'Failed to initialize backup',
        error: error.message
      };
    }
    
    try {
      // Create backup based on type
      let backupData: any;
      
      switch (options.type) {
        case 'full':
          backupData = await this.createFullBackup();
          break;
        case 'selective':
          backupData = await this.createSelectiveBackup(options.collections || []);
          break;
        case 'incremental':
          backupData = await this.createIncrementalBackup();
          break;
        default:
          throw new Error(`Invalid backup type: ${options.type}`);
      }
      
      // Save backup to file
      await fs.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');
      
      // Get file size
      const stats = await fs.stat(filePath);
      const size = stats.size;
      
      // Compress if requested
      let finalFilePath = filePath;
      let finalSize = size;
      
      if (options.compress) {
        const compressedPath = filePath.replace('.json', '.zip');
        await this.compressBackup(filePath, compressedPath);
        
        // Remove original JSON file
        await fs.unlink(filePath);
        
        // Update paths and size
        finalFilePath = compressedPath;
        const compressedStats = await fs.stat(compressedPath);
        finalSize = compressedStats.size;
        
        // Update backup record
        backupRecord.filename = path.basename(compressedPath);
        backupRecord.filePath = compressedPath;
      }
      
      // Mark backup as completed
      await backupRecord.markCompleted(finalSize);
      
      logger.info(`Backup completed successfully`, { 
        backupId: backupRecord._id, 
        size: finalSize,
        compressed: options.compress 
      });
      
      return {
        success: true,
        backupId: backupRecord._id.toString(),
        filename: backupRecord.filename,
        size: finalSize,
        message: `${options.type} backup created successfully`
      };
      
    } catch (error: any) {
      logger.error('Backup failed:', error);
      
      // Mark backup as failed
      await backupRecord.markFailed(error.message);
      
      // Cleanup partial files
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return {
        success: false,
        message: 'Backup creation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Create a full backup of all collections
   */
  private async createFullBackup(): Promise<any> {
    const collections = this.getAvailableCollections();
    const backupData: any = {
      metadata: {
        version: '1.0.0',
        type: 'full',
        timestamp: new Date().toISOString(),
        collections: collections,
        totalCollections: collections.length
      },
      data: {}
    };
    
    for (const collectionName of collections) {
      try {
        const Model = this.getModelByCollection(collectionName);
        const data = await Model.find({}).lean();
        
        backupData.data[collectionName] = {
          count: data.length,
          documents: data
        };
        
        logger.info(`Backed up collection: ${collectionName}, documents: ${data.length}`);
      } catch (error: any) {
        logger.error(`Failed to backup collection ${collectionName}:`, error);
        backupData.data[collectionName] = {
          count: 0,
          documents: [],
          error: error.message
        };
      }
    }
    
    return backupData;
  }
  
  /**
   * Create a selective backup of specific collections
   */
  private async createSelectiveBackup(collections: string[]): Promise<any> {
    const availableCollections = this.getAvailableCollections();
    const validCollections = collections.filter(col => availableCollections.includes(col));
    
    if (validCollections.length === 0) {
      throw new Error('No valid collections specified for selective backup');
    }
    
    const backupData: any = {
      metadata: {
        version: '1.0.0',
        type: 'selective',
        timestamp: new Date().toISOString(),
        collections: validCollections,
        totalCollections: validCollections.length
      },
      data: {}
    };
    
    for (const collectionName of validCollections) {
      try {
        const Model = this.getModelByCollection(collectionName);
        const data = await Model.find({}).lean();
        
        backupData.data[collectionName] = {
          count: data.length,
          documents: data
        };
        
        logger.info(`Backed up collection: ${collectionName}, documents: ${data.length}`);
      } catch (error: any) {
        logger.error(`Failed to backup collection ${collectionName}:`, error);
        backupData.data[collectionName] = {
          count: 0,
          documents: [],
          error: error.message
        };
      }
    }
    
    return backupData;
  }
  
  /**
   * Create an incremental backup (only changed documents since last backup)
   */
  private async createIncrementalBackup(): Promise<any> {
    // Get last backup timestamp
    const lastBackup = await BackupHistory.findOne({ 
      status: 'completed',
      type: { $in: ['full', 'incremental'] }
    }).sort({ createdAt: -1 });
    
    const sinceDate = lastBackup ? lastBackup.createdAt : new Date(0);
    const collections = this.getAvailableCollections();
    
    const backupData: any = {
      metadata: {
        version: '1.0.0',
        type: 'incremental',
        timestamp: new Date().toISOString(),
        sinceDate: sinceDate.toISOString(),
        collections: collections,
        totalCollections: collections.length
      },
      data: {}
    };
    
    for (const collectionName of collections) {
      try {
        const Model = this.getModelByCollection(collectionName);
        
        // Find documents updated since last backup
        const data = await Model.find({
          updatedAt: { $gt: sinceDate }
        }).lean();
        
        backupData.data[collectionName] = {
          count: data.length,
          documents: data
        };
        
        logger.info(`Incremental backup for ${collectionName}: ${data.length} changed documents`);
      } catch (error: any) {
        logger.error(`Failed to backup collection ${collectionName}:`, error);
        backupData.data[collectionName] = {
          count: 0,
          documents: [],
          error: error.message
        };
      }
    }
    
    return backupData;
  }
  
  /**
   * Compress backup file
   */
  private async compressBackup(sourcePath: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(targetPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => resolve());
      archive.on('error', (err: any) => reject(err));
      
      archive.pipe(output);
      archive.file(sourcePath, { name: path.basename(sourcePath) });
      archive.finalize();
    });
  }
  
  /**
   * Get backup history
   */
  async getBackupHistory(limit: number = 20, includeDeleted: boolean = false): Promise<IBackupHistory[]> {
    const query = includeDeleted ? {} : { status: { $ne: 'deleted' } };
    
    return await BackupHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
  
  /**
   * Get backup by ID
   */
  async getBackupById(backupId: string, includeDeleted: boolean = false): Promise<IBackupHistory | null> {
    const backup = await BackupHistory.findById(backupId).lean();
    
    // If backup is deleted and we don't want to include deleted ones, return null
    if (backup && backup.status === 'deleted' && !includeDeleted) {
      return null;
    }
    
    return backup;
  }
  
  /**
   * Delete a backup file and record
   */
  async deleteBackup(backupId: string): Promise<BackupResult> {
    try {
      const backup = await BackupHistory.findById(backupId);
      
      if (!backup) {
        logger.warn(`Backup deletion failed: backup not found`, { backupId });
        return {
          success: false,
          message: 'Backup not found'
        };
      }
      
      logger.info(`Starting backup deletion`, {
        backupId,
        filename: backup.filename,
        filePath: backup.filePath,
        size: backup.size,
        type: backup.type
      });
      
      let fileDeleted = false;
      
      // Delete physical file if it exists
      try {
        // Check if file exists first
        await fs.access(backup.filePath);
        await fs.unlink(backup.filePath);
        fileDeleted = true;
        logger.info(`Backup file deleted successfully`, { 
          filePath: backup.filePath,
          filename: backup.filename
        });
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          logger.warn(`Backup file not found (already deleted?): ${backup.filePath}`, { backupId });
          fileDeleted = true; // Consider it deleted if it doesn't exist
        } else {
          logger.error(`Failed to delete backup file: ${backup.filePath}`, {
            backupId,
            error: fileError.message,
            code: fileError.code
          });
          // Don't fail the operation - we'll still clean up the database record
        }
      }
      
      // Update database record to mark as deleted (for audit trail) 
      // instead of completely removing it
      await BackupHistory.findByIdAndUpdate(backupId, {
        status: 'deleted',
        deletedAt: new Date(),
        size: 0 // Reset size since file is gone
      });
      
      logger.info(`Backup marked as deleted in database`, {
        backupId,
        filename: backup.filename,
        fileDeleted,
        originalSize: backup.size
      });
      
      return {
        success: true,
        message: fileDeleted 
          ? 'Backup file and record deleted successfully'
          : 'Backup record deleted (file was already missing)',
        filename: backup.filename,
        size: backup.size
      };
      
    } catch (error: any) {
      logger.error('Failed to delete backup:', {
        backupId,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: 'Failed to delete backup',
        error: error.message
      };
    }
  }
  
  /**
   * Cleanup old backups
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<{ deletedCount: number; message: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      logger.info(`Starting backup cleanup`, {
        retentionDays,
        cutoffDate: cutoffDate.toISOString()
      });
      
      // Find old backups that haven't been deleted yet
      const oldBackups = await BackupHistory.find({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['completed', 'failed'] } // Don't clean up already deleted ones
      });
      
      logger.info(`Found ${oldBackups.length} old backups to clean up`);
      
      // Handle case when no old backups found
      if (oldBackups.length === 0) {
        const message = `No backups older than ${retentionDays} days found. Nothing to clean up.`;
        logger.info(message);
        return {
          deletedCount: 0,
          message
        };
      }
      
      let deletedCount = 0;
      let fileDeletedCount = 0;
      
      // Delete each backup using the proper delete method
      for (const backup of oldBackups) {
        try {
          const result = await this.deleteBackup(backup._id.toString());
          if (result.success) {
            deletedCount++;
            if (result.message.includes('file')) {
              fileDeletedCount++;
            }
          } else {
            logger.warn(`Failed to cleanup backup ${backup._id}: ${result.message}`);
          }
        } catch (error: any) {
          logger.error(`Error during cleanup of backup ${backup._id}:`, error);
        }
      }
      
      logger.info(`Cleanup completed`, {
        totalProcessed: oldBackups.length,
        deletedCount,
        fileDeletedCount,
        retentionDays
      });
      
      const message = deletedCount > 0 
        ? `Successfully cleaned up ${deletedCount} old backups (${fileDeletedCount} files deleted)`
        : `Processed ${oldBackups.length} old backups but none were successfully deleted`;
      
      return {
        deletedCount,
        message
      };
      
    } catch (error: any) {
      logger.error('Backup cleanup failed:', error);
      return {
        deletedCount: 0,
        message: `Cleanup failed: ${error.message}`
      };
    }
  }
} 