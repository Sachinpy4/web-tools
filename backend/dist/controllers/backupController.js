"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackupStatus = exports.cleanupOldBackups = exports.getRestorePreview = exports.uploadAndRestore = exports.restoreFromBackup = exports.deleteBackup = exports.downloadBackup = exports.getBackupById = exports.getRestoreHistory = exports.getBackupHistory = exports.createBackup = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const backupService_1 = require("../services/backupService");
const restoreService_1 = require("../services/restoreService");
const BackupHistory_1 = __importDefault(require("../models/BackupHistory"));
const logger_1 = __importDefault(require("../utils/logger"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Create a new backup
 */
exports.createBackup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type = 'full', collections, compress = true, description } = req.body;
    // Get user email from authenticated user (assuming auth middleware sets req.user)
    const createdBy = req.user?.email || 'admin';
    try {
        const backupService = new backupService_1.BackupService();
        const result = await backupService.createBackup({
            type,
            collections,
            compress,
            description,
            createdBy
        });
        if (result.success) {
            logger_1.default.info('Backup created successfully', {
                backupId: result.backupId,
                type,
                createdBy
            });
            res.status(200).json({
                status: 'success',
                data: result
            });
        }
        else {
            res.status(500).json({
                status: 'error',
                message: result.message,
                error: result.error
            });
        }
    }
    catch (error) {
        logger_1.default.error('Backup creation failed:', error);
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
exports.getBackupHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20 } = req.query;
    try {
        const backupService = new backupService_1.BackupService();
        const history = await backupService.getBackupHistory(Number(limit));
        res.status(200).json({
            status: 'success',
            data: {
                backups: history,
                total: history.length
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get backup history:', error);
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
exports.getRestoreHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20 } = req.query;
    try {
        const restoreService = new restoreService_1.RestoreService();
        const history = await restoreService.getRestoreHistory(Number(limit));
        res.status(200).json({
            status: 'success',
            data: {
                restores: history,
                total: history.length
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to get restore history:', error);
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
exports.getBackupById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const backupService = new backupService_1.BackupService();
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
    }
    catch (error) {
        logger_1.default.error('Failed to get backup:', error);
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
exports.downloadBackup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        logger_1.default.info('Download backup requested', { backupId: id });
        const backupService = new backupService_1.BackupService();
        const backup = await backupService.getBackupById(id);
        if (!backup) {
            logger_1.default.warn('Backup not found for download', { backupId: id });
            return res.status(404).json({
                status: 'error',
                message: 'Backup not found'
            });
        }
        logger_1.default.info('Backup found, checking file', { backupId: id, filePath: backup.filePath });
        // Check if file exists
        try {
            await promises_1.default.access(backup.filePath);
            logger_1.default.info('Backup file exists, starting download', { backupId: id, filePath: backup.filePath });
        }
        catch (error) {
            logger_1.default.error('Backup file not found on disk', { backupId: id, filePath: backup.filePath, error });
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
        logger_1.default.info('Backup file downloaded', {
            backupId: id,
            filename: backup.filename,
            downloadedBy: req.user?.email || 'admin'
        });
    }
    catch (error) {
        logger_1.default.error('Failed to download backup:', error);
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
exports.deleteBackup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const backupService = new backupService_1.BackupService();
        const result = await backupService.deleteBackup(id);
        if (result.success) {
            logger_1.default.info('Backup deleted', {
                backupId: id,
                deletedBy: req.user?.email || 'admin'
            });
            res.status(200).json({
                status: 'success',
                data: result
            });
        }
        else {
            res.status(404).json({
                status: 'error',
                message: result.message
            });
        }
    }
    catch (error) {
        logger_1.default.error('Failed to delete backup:', error);
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
exports.restoreFromBackup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { backupId, collections, overwrite = false, createSafetyBackup = true } = req.body;
    const createdBy = req.user?.email || 'admin';
    try {
        const restoreService = new restoreService_1.RestoreService();
        // Create safety backup before restore if requested
        let safetyBackupId = null;
        if (createSafetyBackup && overwrite) {
            logger_1.default.info('Creating safety backup before restore');
            const collectionsToBackup = (collections && collections.length > 0) ? collections : [
                'blogs', 'users', 'comments', 'media', 'systemsettings',
                'scripts', 'pageseo', 'schedulerconfigs'
            ];
            safetyBackupId = await restoreService.createPreRestoreBackup(collectionsToBackup, createdBy);
            if (!safetyBackupId) {
                logger_1.default.warn('Failed to create safety backup, continuing with restore');
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
            logger_1.default.info('Database restore completed', {
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
        }
        else {
            res.status(400).json({
                status: 'error',
                message: result.message,
                error: result.error
            });
        }
    }
    catch (error) {
        logger_1.default.error('Database restore failed:', error);
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
exports.uploadAndRestore = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: 'error',
            message: 'Backup file is required'
        });
    }
    const { collections, overwrite = false, createSafetyBackup = true } = req.body;
    const createdBy = req.user?.email || 'admin';
    try {
        const restoreService = new restoreService_1.RestoreService();
        // Create safety backup before restore if requested
        let safetyBackupId = null;
        if (createSafetyBackup && overwrite) {
            logger_1.default.info('Creating safety backup before restore');
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
            await promises_1.default.unlink(req.file.path);
        }
        catch (cleanupError) {
            logger_1.default.warn('Failed to cleanup uploaded file:', cleanupError);
        }
        if (result.success) {
            logger_1.default.info('Database restore from upload completed', {
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
        }
        else {
            res.status(400).json({
                status: 'error',
                message: result.message,
                error: result.error
            });
        }
    }
    catch (error) {
        logger_1.default.error('Database restore from upload failed:', error);
        // Cleanup uploaded file on error
        try {
            await promises_1.default.unlink(req.file.path);
        }
        catch (cleanupError) {
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
exports.getRestorePreview = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { backupId, collections } = req.query;
    // Validate required parameters
    if (!backupId) {
        logger_1.default.warn('Restore preview request missing backupId', { query: req.query });
        return res.status(400).json({
            status: 'error',
            message: 'Backup ID is required'
        });
    }
    try {
        logger_1.default.info('Getting restore preview', { backupId, collections, query: req.query });
        // First, check if the backup exists in database
        const backup = await BackupHistory_1.default.findById(backupId);
        logger_1.default.info('Backup lookup result', {
            backupId,
            found: !!backup,
            status: backup?.status,
            filePath: backup?.filePath
        });
        const restoreService = new restoreService_1.RestoreService();
        const result = await restoreService.getRestorePreview({
            backupId: backupId,
            collections: collections ? collections.split(',') : undefined
        });
        if (result.success) {
            logger_1.default.info('Restore preview successful', { backupId, preview: result.preview });
            res.status(200).json({
                status: 'success',
                data: result.preview
            });
        }
        else {
            logger_1.default.warn('Restore preview failed', {
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
    }
    catch (error) {
        logger_1.default.error('Failed to generate restore preview:', {
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
exports.cleanupOldBackups = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { retentionDays = 30 } = req.body;
    try {
        logger_1.default.info('Starting backup cleanup operation', {
            retentionDays: Number(retentionDays),
            requestedBy: req.user?.email || 'admin'
        });
        const backupService = new backupService_1.BackupService();
        const result = await backupService.cleanupOldBackups(Number(retentionDays));
        logger_1.default.info('Backup cleanup completed successfully', {
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
    }
    catch (error) {
        logger_1.default.error('Backup cleanup failed:', {
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
exports.getBackupStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const backupService = new backupService_1.BackupService();
        const recentBackups = await backupService.getBackupHistory(5);
        // Calculate storage usage
        const backupDir = path_1.default.join(__dirname, '../../backups');
        let totalSize = 0;
        let totalFiles = 0;
        try {
            const files = await promises_1.default.readdir(backupDir);
            for (const file of files) {
                try {
                    const filePath = path_1.default.join(backupDir, file);
                    const stats = await promises_1.default.stat(filePath);
                    if (stats.isFile()) {
                        totalSize += stats.size;
                        totalFiles++;
                    }
                }
                catch (error) {
                    // Skip files that can't be accessed
                }
            }
        }
        catch (error) {
            // Backup directory doesn't exist or can't be accessed
        }
        const formatFileSize = (bytes) => {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0)
                return '0 Bytes';
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
    }
    catch (error) {
        logger_1.default.error('Failed to get backup status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get backup status',
            error: error.message
        });
    }
});
//# sourceMappingURL=backupController.js.map