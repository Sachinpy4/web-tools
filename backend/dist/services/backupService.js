"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const archiver_1 = __importDefault(require("archiver"));
const BackupHistory_1 = __importDefault(require("../models/BackupHistory"));
const logger_1 = __importDefault(require("../utils/logger"));
// Import all models for backup
const Blog_1 = __importDefault(require("../models/Blog"));
const User_1 = __importDefault(require("../models/User"));
const Comment_1 = __importDefault(require("../models/Comment"));
const Media_1 = __importDefault(require("../models/Media"));
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
const Script_1 = __importDefault(require("../models/Script"));
const PageSeo_1 = __importDefault(require("../models/PageSeo"));
const SchedulerConfig_1 = __importDefault(require("../models/SchedulerConfig"));
class BackupService {
    backupDir;
    constructor() {
        this.backupDir = path_1.default.join(__dirname, '../../backups');
        this.ensureBackupDirectory();
    }
    async ensureBackupDirectory() {
        try {
            await promises_1.default.mkdir(this.backupDir, { recursive: true });
        }
        catch (error) {
            logger_1.default.error('Failed to create backup directory:', error);
        }
    }
    /**
     * Get all available collection names
     */
    /**
     * Get available collections for backup
     * Excludes system collections like backup history and restore history to prevent circular dependencies
     */
    getAvailableCollections() {
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
    getModelByCollection(collectionName) {
        const modelMap = {
            'blogs': Blog_1.default,
            'users': User_1.default,
            'comments': Comment_1.default,
            'media': Media_1.default,
            'systemsettings': SystemSettings_1.default,
            'scripts': Script_1.default,
            'pageseo': PageSeo_1.default,
            'schedulerconfigs': SchedulerConfig_1.default
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
    async createBackup(options) {
        const backupId = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${options.type}_${timestamp}.json`;
        const filePath = path_1.default.join(this.backupDir, filename);
        // Create backup history record
        let backupRecord;
        try {
            const collections = options.collections || this.getAvailableCollections();
            backupRecord = await BackupHistory_1.default.create({
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
            logger_1.default.info(`Starting ${options.type} backup`, { backupId, collections, createdBy: options.createdBy });
        }
        catch (error) {
            logger_1.default.error('Failed to create backup record:', error);
            return {
                success: false,
                message: 'Failed to initialize backup',
                error: error.message
            };
        }
        try {
            // Create backup based on type
            let backupData;
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
            await promises_1.default.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');
            // Get file size
            const stats = await promises_1.default.stat(filePath);
            const size = stats.size;
            // Compress if requested
            let finalFilePath = filePath;
            let finalSize = size;
            if (options.compress) {
                const compressedPath = filePath.replace('.json', '.zip');
                await this.compressBackup(filePath, compressedPath);
                // Remove original JSON file
                await promises_1.default.unlink(filePath);
                // Update paths and size
                finalFilePath = compressedPath;
                const compressedStats = await promises_1.default.stat(compressedPath);
                finalSize = compressedStats.size;
                // Update backup record
                backupRecord.filename = path_1.default.basename(compressedPath);
                backupRecord.filePath = compressedPath;
            }
            // Mark backup as completed
            await backupRecord.markCompleted(finalSize);
            logger_1.default.info(`Backup completed successfully`, {
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
        }
        catch (error) {
            logger_1.default.error('Backup failed:', error);
            // Mark backup as failed
            await backupRecord.markFailed(error.message);
            // Cleanup partial files
            try {
                await promises_1.default.unlink(filePath);
            }
            catch (cleanupError) {
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
    async createFullBackup() {
        const collections = this.getAvailableCollections();
        const backupData = {
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
                logger_1.default.info(`Backed up collection: ${collectionName}, documents: ${data.length}`);
            }
            catch (error) {
                logger_1.default.error(`Failed to backup collection ${collectionName}:`, error);
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
    async createSelectiveBackup(collections) {
        const availableCollections = this.getAvailableCollections();
        const validCollections = collections.filter(col => availableCollections.includes(col));
        if (validCollections.length === 0) {
            throw new Error('No valid collections specified for selective backup');
        }
        const backupData = {
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
                logger_1.default.info(`Backed up collection: ${collectionName}, documents: ${data.length}`);
            }
            catch (error) {
                logger_1.default.error(`Failed to backup collection ${collectionName}:`, error);
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
    async createIncrementalBackup() {
        // Get last backup timestamp
        const lastBackup = await BackupHistory_1.default.findOne({
            status: 'completed',
            type: { $in: ['full', 'incremental'] }
        }).sort({ createdAt: -1 });
        const sinceDate = lastBackup ? lastBackup.createdAt : new Date(0);
        const collections = this.getAvailableCollections();
        const backupData = {
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
                logger_1.default.info(`Incremental backup for ${collectionName}: ${data.length} changed documents`);
            }
            catch (error) {
                logger_1.default.error(`Failed to backup collection ${collectionName}:`, error);
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
    async compressBackup(sourcePath, targetPath) {
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(targetPath);
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            output.on('close', () => resolve());
            archive.on('error', (err) => reject(err));
            archive.pipe(output);
            archive.file(sourcePath, { name: path_1.default.basename(sourcePath) });
            archive.finalize();
        });
    }
    /**
     * Get backup history
     */
    async getBackupHistory(limit = 20, includeDeleted = false) {
        const query = includeDeleted ? {} : { status: { $ne: 'deleted' } };
        return await BackupHistory_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }
    /**
     * Get backup by ID
     */
    async getBackupById(backupId, includeDeleted = false) {
        const backup = await BackupHistory_1.default.findById(backupId).lean();
        // If backup is deleted and we don't want to include deleted ones, return null
        if (backup && backup.status === 'deleted' && !includeDeleted) {
            return null;
        }
        return backup;
    }
    /**
     * Delete a backup file and record
     */
    async deleteBackup(backupId) {
        try {
            const backup = await BackupHistory_1.default.findById(backupId);
            if (!backup) {
                logger_1.default.warn(`Backup deletion failed: backup not found`, { backupId });
                return {
                    success: false,
                    message: 'Backup not found'
                };
            }
            logger_1.default.info(`Starting backup deletion`, {
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
                await promises_1.default.access(backup.filePath);
                await promises_1.default.unlink(backup.filePath);
                fileDeleted = true;
                logger_1.default.info(`Backup file deleted successfully`, {
                    filePath: backup.filePath,
                    filename: backup.filename
                });
            }
            catch (fileError) {
                if (fileError.code === 'ENOENT') {
                    logger_1.default.warn(`Backup file not found (already deleted?): ${backup.filePath}`, { backupId });
                    fileDeleted = true; // Consider it deleted if it doesn't exist
                }
                else {
                    logger_1.default.error(`Failed to delete backup file: ${backup.filePath}`, {
                        backupId,
                        error: fileError.message,
                        code: fileError.code
                    });
                    // Don't fail the operation - we'll still clean up the database record
                }
            }
            // Update database record to mark as deleted (for audit trail) 
            // instead of completely removing it
            await BackupHistory_1.default.findByIdAndUpdate(backupId, {
                status: 'deleted',
                deletedAt: new Date(),
                size: 0 // Reset size since file is gone
            });
            logger_1.default.info(`Backup marked as deleted in database`, {
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
        }
        catch (error) {
            logger_1.default.error('Failed to delete backup:', {
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
    async cleanupOldBackups(retentionDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            logger_1.default.info(`Starting backup cleanup`, {
                retentionDays,
                cutoffDate: cutoffDate.toISOString()
            });
            // Find old backups that haven't been deleted yet
            const oldBackups = await BackupHistory_1.default.find({
                createdAt: { $lt: cutoffDate },
                status: { $in: ['completed', 'failed'] } // Don't clean up already deleted ones
            });
            logger_1.default.info(`Found ${oldBackups.length} old backups to clean up`);
            // Handle case when no old backups found
            if (oldBackups.length === 0) {
                const message = `No backups older than ${retentionDays} days found. Nothing to clean up.`;
                logger_1.default.info(message);
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
                    }
                    else {
                        logger_1.default.warn(`Failed to cleanup backup ${backup._id}: ${result.message}`);
                    }
                }
                catch (error) {
                    logger_1.default.error(`Error during cleanup of backup ${backup._id}:`, error);
                }
            }
            logger_1.default.info(`Cleanup completed`, {
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
        }
        catch (error) {
            logger_1.default.error('Backup cleanup failed:', error);
            return {
                deletedCount: 0,
                message: `Cleanup failed: ${error.message}`
            };
        }
    }
}
exports.BackupService = BackupService;
//# sourceMappingURL=backupService.js.map