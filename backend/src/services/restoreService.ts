import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import BackupHistory, { IBackupHistory } from '../models/BackupHistory';
import RestoreHistory, { IRestoreHistory } from '../models/RestoreHistory';
import logger from '../utils/logger';
import { execSync } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';

// Import all models for restore
import Blog from '../models/Blog';
import User from '../models/User';
import Comment from '../models/Comment';
import Media from '../models/Media';
import SystemSettings from '../models/SystemSettings';
import Script from '../models/Script';
import PageSeo from '../models/PageSeo';
import SchedulerConfig from '../models/SchedulerConfig';

interface RestoreOptions {
  backupId?: string;
  backupFilePath?: string;
  collections?: string[];
  overwrite: boolean;
  createdBy: string;
}

interface RestoreResult {
  success: boolean;
  message: string;
  restoredCollections?: string[];
  skippedCollections?: string[];
  error?: string;
  details?: any;
}

interface BackupData {
  metadata: {
    version: string;
    type: string;
    timestamp: string;
    collections: string[];
    totalCollections: number;
  };
  data: {
    [collectionName: string]: {
      count: number;
      documents: any[];
      error?: string;
    };
  };
}

export class RestoreService {
  
  /**
   * Get mongoose model by collection name
   * Note: BackupHistory is included for restore operations but is protected from being overwritten
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
      'schedulerconfigs': SchedulerConfig,
      'backuphistory': BackupHistory,
      'restorehistory': RestoreHistory
    };
    
    const model = modelMap[collectionName];
    if (!model) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }
    
    return model;
  }
  
  /**
   * Extract ZIP file and return the JSON content
   */
  private async extractBackupFile(filePath: string): Promise<string> {
    if (filePath.endsWith('.zip')) {
      logger.info('Extracting ZIP backup file', { filePath });
      
      // Create a temporary directory for extraction
      const tempDir = path.join(__dirname, '../../temp', `extract_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });
      
      try {
        // For Windows, try using PowerShell to extract ZIP
        if (process.platform === 'win32') {
          const extractCommand = `powershell -command "Expand-Archive -Path '${filePath}' -DestinationPath '${tempDir}' -Force"`;
          execSync(extractCommand);
        } else {
          // For Unix systems, use unzip command
          execSync(`unzip -o "${filePath}" -d "${tempDir}"`);
        }
        
        // Find the JSON file in the extracted directory
        const files = await fs.readdir(tempDir);
        const jsonFile = files.find(f => f.endsWith('.json'));
        
        if (!jsonFile) {
          throw new Error('No JSON file found in backup ZIP');
        }
        
        const jsonPath = path.join(tempDir, jsonFile);
        const content = await fs.readFile(jsonPath, 'utf8');
        
        // Cleanup temp directory
        await fs.rm(tempDir, { recursive: true, force: true });
        
        logger.info('ZIP extraction successful', { originalFile: filePath, jsonFile });
        return content;
        
      } catch (error) {
        // Cleanup temp directory on error
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {}
        throw error;
      }
    } else {
      // Read JSON file directly
      return await fs.readFile(filePath, 'utf8');
    }
  }

  /**
   * Validate backup file format and structure
   */
  private async validateBackupFile(filePath: string): Promise<BackupData> {
    try {
      const fileContent = await this.extractBackupFile(filePath);
      const backupData: BackupData = JSON.parse(fileContent);
      
      // Validate backup structure
      if (!backupData.metadata || !backupData.data) {
        throw new Error('Invalid backup file structure: missing metadata or data');
      }
      
      if (!backupData.metadata.version || !backupData.metadata.type) {
        throw new Error('Invalid backup file: missing version or type in metadata');
      }
      
      if (!backupData.metadata.collections || !Array.isArray(backupData.metadata.collections)) {
        throw new Error('Invalid backup file: missing or invalid collections list');
      }
      
      // Validate each collection data
      for (const collectionName of backupData.metadata.collections) {
        if (!backupData.data[collectionName]) {
          logger.warn(`Collection ${collectionName} not found in backup data`);
          continue;
        }
        
        const collectionData = backupData.data[collectionName];
        if (typeof collectionData.count !== 'number' || !Array.isArray(collectionData.documents)) {
          throw new Error(`Invalid data structure for collection: ${collectionName}`);
        }
      }
      
      logger.info('Backup file validation successful', {
        version: backupData.metadata.version,
        type: backupData.metadata.type,
        collections: backupData.metadata.collections.length,
        timestamp: backupData.metadata.timestamp
      });
      
      return backupData;
      
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid backup file: not a valid JSON file');
      }
      throw error;
    }
  }
  
  /**
   * Restore database from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<RestoreResult> {
    let backupFilePath: string;
    let backupData: BackupData;
    let restoreRecord: IRestoreHistory | null = null;
    
    try {
      // Determine backup file path
      if (options.backupId) {
        const backup = await BackupHistory.findById(options.backupId);
        if (!backup) {
          return {
            success: false,
            message: 'Backup not found'
          };
        }
        
        if (backup.status === 'deleted') {
          return {
            success: false,
            message: 'Cannot restore from deleted backup'
          };
        }
        
        if (backup.status !== 'completed') {
          return {
            success: false,
            message: `Cannot restore from backup with status: ${backup.status}`
          };
        }
        
        backupFilePath = backup.filePath;
      } else if (options.backupFilePath) {
        backupFilePath = options.backupFilePath;
      } else {
        return {
          success: false,
          message: 'Either backupId or backupFilePath must be provided'
        };
      }
      
      // Check if backup file exists
      try {
        await fs.access(backupFilePath);
      } catch (error) {
        return {
          success: false,
          message: `Backup file not found: ${backupFilePath}`
        };
      }
      
      logger.info('Starting database restore', {
        backupFilePath,
        overwrite: options.overwrite,
        collections: options.collections,
        createdBy: options.createdBy
      });
      
      // Validate and parse backup file
      backupData = await this.validateBackupFile(backupFilePath);
      
      // Create restore history record
      try {
        let sourceBackupId: mongoose.Types.ObjectId | undefined;
        let sourceBackupName: string | undefined;
        let sourceType: 'existing_backup' | 'uploaded_file';
        let uploadedFileName: string | undefined;

        if (options.backupId) {
          const backup = await BackupHistory.findById(options.backupId);
          sourceBackupId = backup?._id;
          sourceBackupName = backup?.filename;
          sourceType = 'existing_backup';
        } else {
          sourceType = 'uploaded_file';
          uploadedFileName = path.basename(backupFilePath);
        }

        restoreRecord = await RestoreHistory.create({
          sourceBackupId,
          sourceBackupName,
          sourceType,
          uploadedFileName,
          restoreType: options.collections && options.collections.length > 0 ? 'selective' : 'full',
          collectionsRestored: [],
          collectionsSkipped: [],
          overwriteMode: options.overwrite,
          totalDocumentsRestored: 0,
          status: 'in_progress',
          restoredBy: options.createdBy
        });

        logger.info('Restore record created', { restoreId: restoreRecord?._id });
      } catch (error: any) {
        logger.error('Failed to create restore record:', error);
        restoreRecord = null; // Explicitly set to null on error
        // Continue with restore even if history tracking fails
      }
      
      // Determine which collections to restore
      const collectionsToRestore = (options.collections && options.collections.length > 0) 
        ? options.collections 
        : backupData.metadata.collections;
      
      logger.info('Collections analysis', {
        requested: options.collections,
        fromBackup: backupData.metadata.collections,
        toRestore: collectionsToRestore,
        availableInData: Object.keys(backupData.data)
      });
      
      const validCollections = collectionsToRestore.filter(col => {
        const isInMetadata = backupData.metadata.collections.includes(col);
        const hasData = backupData.data[col];
        const isValid = isInMetadata && hasData;
        
        logger.info(`Collection ${col}`, {
          inMetadata: isInMetadata,
          hasData: !!hasData,
          dataCount: hasData ? hasData.count : 0,
          isValid
        });
        
        return isValid;
      });
      
      if (validCollections.length === 0) {
        logger.error('No valid collections found', {
          collectionsToRestore,
          backupMetadataCollections: backupData.metadata.collections,
          backupDataKeys: Object.keys(backupData.data),
          collectionsWithData: Object.keys(backupData.data).filter(key => 
            backupData.data[key] && backupData.data[key].count > 0
          )
        });
        
        return {
          success: false,
          message: `No valid collections found to restore. Available collections in backup: ${backupData.metadata.collections.join(', ')}`
        };
      }
      
      const restoredCollections: string[] = [];
      const skippedCollections: string[] = [];
      const errors: string[] = [];
      
      // Restore each collection
      for (const collectionName of validCollections) {
        try {
          const collectionData = backupData.data[collectionName];
          
          if (collectionData.error) {
            logger.warn(`Skipping collection ${collectionName}: ${collectionData.error}`);
            skippedCollections.push(collectionName);
            continue;
          }
          
          if (collectionData.count === 0) {
            logger.info(`Skipping empty collection: ${collectionName}`);
            skippedCollections.push(collectionName);
            continue;
          }

          // Check if this is a system collection that should be skipped
          if (collectionName === 'backuphistory' || collectionName === 'restorehistory') {
            logger.info(`Skipping system collection: ${collectionName} (${collectionData.count} documents) - System collections are protected from restoration to prevent data corruption`);
            skippedCollections.push(collectionName);
            continue;
          }
          
          await this.restoreCollection(collectionName, collectionData.documents, options.overwrite);
          restoredCollections.push(collectionName);
          
          logger.info(`Successfully restored collection: ${collectionName}, documents: ${collectionData.count}`);
          
        } catch (error: any) {
          logger.error(`Failed to restore collection ${collectionName}:`, error);
          errors.push(`${collectionName}: ${error.message}`);
          skippedCollections.push(collectionName);
        }
      }
      
      const success = restoredCollections.length > 0;
      const message = success 
        ? `Restore completed: ${restoredCollections.length} collections restored${skippedCollections.length > 0 ? `, ${skippedCollections.length} skipped` : ''}${errors.length > 0 ? `, ${errors.length} errors` : ''}`
        : 'Restore failed: no collections were restored';
      
      logger.info('Database restore completed', {
        success,
        restoredCollections: restoredCollections.length,
        skippedCollections: skippedCollections.length,
        errors: errors.length
      });

      // Update restore history record
      const totalDocuments = restoredCollections.reduce((sum, col) => 
        sum + (backupData.data[col]?.count || 0), 0
      );

      if (restoreRecord) {
        try {
          if (success) {
            await restoreRecord.markCompleted({
              collectionsRestored: restoredCollections,
              collectionsSkipped: skippedCollections,
              totalDocumentsRestored: totalDocuments,
              details: {
                backupType: backupData.metadata.type,
                backupTimestamp: backupData.metadata.timestamp,
                errors: errors.length > 0 ? errors : undefined
              }
            });
          } else {
            await restoreRecord.markFailed(message);
          }
        } catch (error: any) {
          logger.error('Failed to update restore record:', error);
        }
      }
      
      return {
        success,
        message,
        restoredCollections,
        skippedCollections,
        details: {
          backupType: backupData.metadata.type,
          backupTimestamp: backupData.metadata.timestamp,
          totalDocuments,
          errors: errors.length > 0 ? errors : undefined
        }
      };
      
    } catch (error: any) {
      logger.error('Database restore failed:', error);
      
      // Update restore history record on error
      if (restoreRecord) {
        try {
          await restoreRecord.markFailed(error.message || 'Restore operation failed');
        } catch (historyError: any) {
          logger.error('Failed to update restore record on error:', historyError);
        }
      }
      
      return {
        success: false,
        message: 'Restore operation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Restore a single collection from backup
   */
  private async restoreCollection(
    collectionName: string, 
    documents: any[], 
    overwrite: boolean
  ): Promise<void> {
    
    // CRITICAL: Prevent restoration of system collections to avoid data corruption
    // Restoring backup/restore history would overwrite current records with old data from backup files
    if (collectionName === 'backuphistory' || collectionName === 'restorehistory') {
      logger.warn(`Skipping restoration of ${collectionName} collection to prevent data corruption`);
      return;
    }
    
    logger.info(`Restoring collection: ${collectionName}, documents: ${documents.length}, overwrite: ${overwrite}`);
    
    if (documents.length === 0) {
      logger.info(`No documents to restore for collection: ${collectionName}`);
      return;
    }
    
    const Model = this.getModelByCollection(collectionName);
    
    if (overwrite) {
      // Clear existing collection first
      await Model.deleteMany({});
      logger.info(`Cleared existing data for collection: ${collectionName}`);
    }
    
    // Process in batches to avoid memory issues
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      try {
        // Clean the documents (remove version keys, etc.)
        const cleanedBatch = batch.map(doc => {
          // Remove version key if it exists
          const { __v, ...cleanDoc } = doc;
          return cleanDoc;
        });
        
        if (overwrite) {
          // Insert new documents
          await Model.insertMany(cleanedBatch, { 
            ordered: false, // Continue on duplicate key errors
            rawResult: false 
          });
          insertedCount += cleanedBatch.length;
        } else {
          // Update or insert documents (upsert)
          for (const doc of cleanedBatch) {
            await Model.findByIdAndUpdate(
              doc._id,
              doc,
              { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true 
              }
            );
            insertedCount++;
          }
        }
        
        logger.info(`Restored batch for ${collectionName}: ${Math.min(i + batchSize, documents.length)}/${documents.length}`);
        
      } catch (error: any) {
        logger.error(`Failed to restore batch for ${collectionName}:`, error);
        // Continue with next batch for non-critical errors
        if (error.name !== 'ValidationError' && error.code !== 11000) {
          throw error;
        }
      }
    }
    
    logger.info(`Collection restore completed: ${collectionName}, inserted: ${insertedCount}/${documents.length}`);
  }
  
  /**
   * Create a backup before restore (safety measure)
   */
  async createPreRestoreBackup(collections: string[], createdBy: string): Promise<string | null> {
    try {
             const { BackupService } = await import('./backupService.js');
      const backupService = new BackupService();
      
      const result = await backupService.createBackup({
        type: 'selective',
        collections,
        compress: true,
        description: 'Pre-restore safety backup',
        createdBy
      });
      
      if (result.success && result.backupId) {
        logger.info('Pre-restore backup created', { backupId: result.backupId });
        return result.backupId;
      }
      
      return null;
    } catch (error: any) {
      logger.error('Failed to create pre-restore backup:', error);
      return null;
    }
  }
  
  /**
   * Get restore preview (what would be restored without actually doing it)
   */
  async getRestorePreview(options: Omit<RestoreOptions, 'overwrite' | 'createdBy'>): Promise<{
    success: boolean;
    message: string;
    preview?: {
      backupInfo: any;
      collectionsToRestore: string[];
      totalDocuments: number;
      estimatedSize: string;
    };
    error?: string;
  }> {
    try {
      logger.info('RestoreService.getRestorePreview called', { options });
      let backupFilePath: string;
      
      if (options.backupId) {
        logger.info('Looking up backup by ID', { backupId: options.backupId });
        const backup = await BackupHistory.findById(options.backupId);
        logger.info('Backup lookup result', { 
          found: !!backup, 
          backupId: options.backupId,
          backup: backup ? {
            id: backup._id,
            filename: backup.filename,
            filePath: backup.filePath,
            status: backup.status
          } : null
        });
        
        if (!backup) {
          logger.warn('Backup not found in database', { backupId: options.backupId });
          return {
            success: false,
            message: 'Backup not found'
          };
        }
        
        if (backup.status === 'deleted') {
          logger.warn('Attempted to preview deleted backup', { backupId: options.backupId });
          return {
            success: false,
            message: 'Cannot preview deleted backup'
          };
        }
        backupFilePath = backup.filePath;
        logger.info('Using backup file path', { backupFilePath });
      } else if (options.backupFilePath) {
        backupFilePath = options.backupFilePath;
        logger.info('Using provided file path', { backupFilePath });
      } else {
        logger.error('No backup ID or file path provided');
        return {
          success: false,
          message: 'Either backupId or backupFilePath must be provided'
        };
      }
      
      // Check if backup file exists first
      try {
        await fs.access(backupFilePath);
        logger.info('Backup file exists', { backupFilePath });
      } catch (error: any) {
        logger.error('Backup file not found', { backupFilePath, error: error.message });
        return {
          success: false,
          message: `Backup file not found: ${backupFilePath}`,
          error: error.message
        };
      }
      
      // Validate backup file
      logger.info('Validating backup file', { backupFilePath });
      const backupData = await this.validateBackupFile(backupFilePath);
      logger.info('Backup file validated successfully', { 
        type: backupData.metadata.type,
        collections: backupData.metadata.collections.length 
      });
      
      // Calculate what would be restored
      const collectionsToRestore = (options.collections && options.collections.length > 0) 
        ? options.collections 
        : backupData.metadata.collections;
      
      logger.info('Preview collections analysis', {
        requested: options.collections,
        fromBackup: backupData.metadata.collections,
        toRestore: collectionsToRestore,
        availableInData: Object.keys(backupData.data)
      });
      
      const validCollections = collectionsToRestore.filter(col => {
        const isInMetadata = backupData.metadata.collections.includes(col);
        const hasData = backupData.data[col];
        const isValid = isInMetadata && hasData;
        
        logger.info(`Preview collection ${col}`, {
          inMetadata: isInMetadata,
          hasData: !!hasData,
          dataCount: hasData ? hasData.count : 0,
          isValid
        });
        
        return isValid;
      });
      
      logger.info('Collections to restore', { collectionsToRestore, validCollections });
      
      const totalDocuments = validCollections.reduce((sum, col) => 
        sum + (backupData.data[col]?.count || 0), 0
      );
      
      // Estimate size
      const backupSize = await fs.stat(backupFilePath);
      const estimatedSize = this.formatFileSize(backupSize.size);
      
      logger.info('Restore preview calculated', { 
        totalDocuments, 
        estimatedSize, 
        validCollections: validCollections.length 
      });
      
      return {
        success: true,
        message: 'Restore preview generated successfully',
        preview: {
          backupInfo: {
            type: backupData.metadata.type,
            timestamp: backupData.metadata.timestamp,
            version: backupData.metadata.version
          },
          collectionsToRestore: validCollections,
          totalDocuments,
          estimatedSize
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to generate restore preview',
        error: error.message
      };
    }
  }
  
  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get restore history
   */
  async getRestoreHistory(limit: number = 20): Promise<IRestoreHistory[]> {
    return await RestoreHistory.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sourceBackupId', 'filename originalName type')
      .populate('safetyBackupId', 'filename originalName')
      .lean();
  }
} 