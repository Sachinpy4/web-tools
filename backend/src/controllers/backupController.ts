import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { BackupService } from '../services/backupService';
import { RestoreService } from '../services/restoreService';
import BackupHistory from '../models/BackupHistory';
import logger from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

/**
 * Create a new backup
 */
export const createBackup = asyncHandler(async (req: Request, res: Response) => {
  const {
    type = 'full',
    collections,
    compress = true,
    description
  } = req.body;

  // Get user email from authenticated user (assuming auth middleware sets req.user)
  const createdBy = req.user?.email || 'admin';

  try {
    const backupService = new BackupService();
    const result = await backupService.createBackup({
      type,
      collections,
      compress,
      description,
      createdBy
    });

    if (result.success) {
      logger.info('Backup created successfully', {
        backupId: result.backupId,
        type,
        createdBy
      });

      res.status(200).json({
        status: 'success',
        data: result
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: result.message,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('Backup creation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Backup creation failed',
      error: error.message
    });
  }
});

/**
 * Get backup history
 */
export const getBackupHistory = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20 } = req.query;

  try {
    const backupService = new BackupService();
    const history = await backupService.getBackupHistory(Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        backups: history,
        total: history.length
      }
    });
  } catch (error: any) {
    logger.error('Failed to get backup history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get backup history',
      error: error.message
    });
  }
});

/**
 * Get restore history
 */
export const getRestoreHistory = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20 } = req.query;

  try {
    const restoreService = new RestoreService();
    const history = await restoreService.getRestoreHistory(Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        restores: history,
        total: history.length
      }
    });
  } catch (error: any) {
    logger.error('Failed to get restore history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get restore history',
      error: error.message
    });
  }
});

/**
 * Get backup by ID
 */
export const getBackupById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const backupService = new BackupService();
    const backup = await backupService.getBackupById(id);

    if (!backup) {
      return res.status(404).json({
        status: 'error',
        message: 'Backup not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: backup
    });
  } catch (error: any) {
    logger.error('Failed to get backup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get backup',
      error: error.message
    });
  }
});

/**
 * Download backup file
 */
export const downloadBackup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    logger.info('Download backup requested', { backupId: id });
    
    const backupService = new BackupService();
    const backup = await backupService.getBackupById(id);

    if (!backup) {
      logger.warn('Backup not found for download', { backupId: id });
      return res.status(404).json({
        status: 'error',
        message: 'Backup not found'
      });
    }

    logger.info('Backup found, checking file', { backupId: id, filePath: backup.filePath });

    // Check if file exists
    try {
      await fs.access(backup.filePath);
      logger.info('Backup file exists, starting download', { backupId: id, filePath: backup.filePath });
    } catch (error) {
      logger.error('Backup file not found on disk', { backupId: id, filePath: backup.filePath, error });
      return res.status(404).json({
        status: 'error',
        message: `Backup file not found: ${backup.filePath}`
      });
    }

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = require('fs').createReadStream(backup.filePath);
    fileStream.pipe(res);

    logger.info('Backup file downloaded', {
      backupId: id,
      filename: backup.filename,
      downloadedBy: req.user?.email || 'admin'
    });

  } catch (error: any) {
    logger.error('Failed to download backup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download backup',
      error: error.message
    });
  }
});

/**
 * Delete backup
 */
export const deleteBackup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const backupService = new BackupService();
    const result = await backupService.deleteBackup(id);

    if (result.success) {
      logger.info('Backup deleted', {
        backupId: id,
        deletedBy: req.user?.email || 'admin'
      });

      res.status(200).json({
        status: 'success',
        data: result
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: result.message
      });
    }
  } catch (error: any) {
    logger.error('Failed to delete backup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete backup',
      error: error.message
    });
  }
});

/**
 * Restore from backup
 */
export const restoreFromBackup = asyncHandler(async (req: Request, res: Response) => {
  const {
    backupId,
    collections,
    overwrite = false,
    createSafetyBackup = true
  } = req.body;

  const createdBy = req.user?.email || 'admin';

  try {
    const restoreService = new RestoreService();

    // Create safety backup before restore if requested
    let safetyBackupId: string | null = null;
    if (createSafetyBackup && overwrite) {
      logger.info('Creating safety backup before restore');
      const collectionsToBackup = (collections && collections.length > 0) ? collections : [
        'blogs', 'users', 'comments', 'media', 'systemsettings',
        'scripts', 'pageseo', 'schedulerconfigs'
      ];
      
      safetyBackupId = await restoreService.createPreRestoreBackup(collectionsToBackup, createdBy);
      
      if (!safetyBackupId) {
        logger.warn('Failed to create safety backup, continuing with restore');
      }
    }

    // Perform restore
    const result = await restoreService.restoreFromBackup({
      backupId,
      collections,
      overwrite,
      createdBy
    });

    if (result.success) {
      logger.info('Database restore completed', {
        backupId,
        restoredCollections: result.restoredCollections?.length,
        safetyBackupId,
        restoredBy: createdBy
      });

      res.status(200).json({
        status: 'success',
        data: {
          ...result,
          safetyBackupId
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('Database restore failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database restore failed',
      error: error.message
    });
  }
});

/**
 * Upload and restore from backup file
 */
export const uploadAndRestore = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'Backup file is required'
    });
  }

  const {
    collections,
    overwrite = false,
    createSafetyBackup = true
  } = req.body;

  const createdBy = req.user?.email || 'admin';

  try {
    const restoreService = new RestoreService();

    // Create safety backup before restore if requested
    let safetyBackupId: string | null = null;
    if (createSafetyBackup && overwrite) {
      logger.info('Creating safety backup before restore');
      const collectionsToBackup = collections ? collections.split(',') : [
        'blogs', 'users', 'comments', 'media', 'systemsettings',
        'scripts', 'pageseo', 'schedulerconfigs'
      ];
      
      safetyBackupId = await restoreService.createPreRestoreBackup(collectionsToBackup, createdBy);
    }

    // Parse collections if provided as string
    const collectionsArray = collections ? 
      (typeof collections === 'string' ? collections.split(',') : collections) : 
      undefined;

    // Perform restore from uploaded file
    const result = await restoreService.restoreFromBackup({
      backupFilePath: req.file.path,
      collections: collectionsArray,
      overwrite,
      createdBy
    });

    // Cleanup uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      logger.warn('Failed to cleanup uploaded file:', cleanupError);
    }

    if (result.success) {
      logger.info('Database restore from upload completed', {
        originalFilename: req.file.originalname,
        restoredCollections: result.restoredCollections?.length,
        safetyBackupId,
        restoredBy: createdBy
      });

      res.status(200).json({
        status: 'success',
        data: {
          ...result,
          safetyBackupId
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: result.message,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('Database restore from upload failed:', error);
    
    // Cleanup uploaded file on error
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    res.status(500).json({
      status: 'error',
      message: 'Database restore failed',
      error: error.message
    });
  }
});

/**
 * Get restore preview
 */
export const getRestorePreview = asyncHandler(async (req: Request, res: Response) => {
  const { backupId, collections } = req.query;

  // Validate required parameters
  if (!backupId) {
    logger.warn('Restore preview request missing backupId', { query: req.query });
    return res.status(400).json({
      status: 'error',
      message: 'Backup ID is required'
    });
  }

  try {
    logger.info('Getting restore preview', { backupId, collections, query: req.query });
    
    // First, check if the backup exists in database
    const backup = await BackupHistory.findById(backupId);
    logger.info('Backup lookup result', { 
      backupId, 
      found: !!backup, 
      status: backup?.status,
      filePath: backup?.filePath 
    });
    
    const restoreService = new RestoreService();
    const result = await restoreService.getRestorePreview({
      backupId: backupId as string,
      collections: collections ? (collections as string).split(',') : undefined
    });

    if (result.success) {
      logger.info('Restore preview successful', { backupId, preview: result.preview });
      res.status(200).json({
        status: 'success',
        data: result.preview
      });
    } else {
      logger.warn('Restore preview failed', { 
        backupId, 
        message: result.message, 
        error: result.error,
        collections 
      });
      res.status(400).json({
        status: 'error',
        message: result.message,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('Failed to generate restore preview:', { 
      backupId, 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate restore preview',
      error: error.message
    });
  }
});

/**
 * Cleanup old backups
 */
export const cleanupOldBackups = asyncHandler(async (req: Request, res: Response) => {
  const { retentionDays = 30 } = req.body;

  try {
    logger.info('Starting backup cleanup operation', {
      retentionDays: Number(retentionDays),
      requestedBy: req.user?.email || 'admin'
    });

    const backupService = new BackupService();
    const result = await backupService.cleanupOldBackups(Number(retentionDays));

    logger.info('Backup cleanup completed successfully', {
      retentionDays: Number(retentionDays),
      deletedCount: result.deletedCount,
      message: result.message,
      cleanedBy: req.user?.email || 'admin'
    });

    // Ensure consistent response format
    const response = {
      status: 'success',
      data: {
        deletedCount: result.deletedCount || 0,
        message: result.message || `Cleanup completed. ${result.deletedCount || 0} old backups removed.`
      }
    };

    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Backup cleanup failed:', {
      error: error.message,
      stack: error.stack,
      retentionDays: Number(retentionDays),
      requestedBy: req.user?.email || 'admin'
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Backup cleanup failed',
      error: error.message
    });
  }
});

/**
 * Get backup system status
 */
export const getBackupStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const backupService = new BackupService();
    const recentBackups = await backupService.getBackupHistory(5);
    
    // Calculate storage usage
    const backupDir = path.join(__dirname, '../../backups');
    let totalSize = 0;
    let totalFiles = 0;
    
    try {
      const files = await fs.readdir(backupDir);
      for (const file of files) {
        try {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
            totalFiles++;
          }
        } catch (error) {
          // Skip files that can't be accessed
        }
      }
    } catch (error) {
      // Backup directory doesn't exist or can't be accessed
    }

    const formatFileSize = (bytes: number): string => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    res.status(200).json({
      status: 'success',
      data: {
        recentBackups,
        storage: {
          totalSize: formatFileSize(totalSize),
          totalFiles,
          directory: backupDir
        },
        lastBackup: recentBackups.length > 0 ? recentBackups[0] : null
      }
    });
  } catch (error: any) {
    logger.error('Failed to get backup status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get backup status',
      error: error.message
    });
  }
}); 