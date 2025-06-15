"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestoreService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const BackupHistory_1 = __importDefault(require("../models/BackupHistory"));
const RestoreHistory_1 = __importDefault(require("../models/RestoreHistory"));
const logger_1 = __importDefault(require("../utils/logger"));
const child_process_1 = require("child_process");
// Import all models for restore
const Blog_1 = __importDefault(require("../models/Blog"));
const User_1 = __importDefault(require("../models/User"));
const Comment_1 = __importDefault(require("../models/Comment"));
const Media_1 = __importDefault(require("../models/Media"));
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
const Script_1 = __importDefault(require("../models/Script"));
const PageSeo_1 = __importDefault(require("../models/PageSeo"));
const SchedulerConfig_1 = __importDefault(require("../models/SchedulerConfig"));
class RestoreService {
    /**
     * Get mongoose model by collection name
     * Note: BackupHistory is included for restore operations but is protected from being overwritten
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
            'schedulerconfigs': SchedulerConfig_1.default,
            'backuphistory': BackupHistory_1.default,
            'restorehistory': RestoreHistory_1.default
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
    async extractBackupFile(filePath) {
        if (filePath.endsWith('.zip')) {
            logger_1.default.info('Extracting ZIP backup file', { filePath });
            // Create a temporary directory for extraction
            const tempDir = path_1.default.join(__dirname, '../../temp', `extract_${Date.now()}`);
            await promises_1.default.mkdir(tempDir, { recursive: true });
            try {
                // For Windows, try using PowerShell to extract ZIP
                if (process.platform === 'win32') {
                    const extractCommand = `powershell -command "Expand-Archive -Path '${filePath}' -DestinationPath '${tempDir}' -Force"`;
                    (0, child_process_1.execSync)(extractCommand);
                }
                else {
                    // For Unix systems, use unzip command
                    (0, child_process_1.execSync)(`unzip -o "${filePath}" -d "${tempDir}"`);
                }
                // Find the JSON file in the extracted directory
                const files = await promises_1.default.readdir(tempDir);
                const jsonFile = files.find(f => f.endsWith('.json'));
                if (!jsonFile) {
                    throw new Error('No JSON file found in backup ZIP');
                }
                const jsonPath = path_1.default.join(tempDir, jsonFile);
                const content = await promises_1.default.readFile(jsonPath, 'utf8');
                // Cleanup temp directory
                await promises_1.default.rm(tempDir, { recursive: true, force: true });
                logger_1.default.info('ZIP extraction successful', { originalFile: filePath, jsonFile });
                return content;
            }
            catch (error) {
                // Cleanup temp directory on error
                try {
                    await promises_1.default.rm(tempDir, { recursive: true, force: true });
                }
                catch { }
                throw error;
            }
        }
        else {
            // Read JSON file directly
            return await promises_1.default.readFile(filePath, 'utf8');
        }
    }
    /**
     * Validate backup file format and structure
     */
    async validateBackupFile(filePath) {
        try {
            const fileContent = await this.extractBackupFile(filePath);
            const backupData = JSON.parse(fileContent);
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
                    logger_1.default.warn(`Collection ${collectionName} not found in backup data`);
                    continue;
                }
                const collectionData = backupData.data[collectionName];
                if (typeof collectionData.count !== 'number' || !Array.isArray(collectionData.documents)) {
                    throw new Error(`Invalid data structure for collection: ${collectionName}`);
                }
            }
            logger_1.default.info('Backup file validation successful', {
                version: backupData.metadata.version,
                type: backupData.metadata.type,
                collections: backupData.metadata.collections.length,
                timestamp: backupData.metadata.timestamp
            });
            return backupData;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error('Invalid backup file: not a valid JSON file');
            }
            throw error;
        }
    }
    /**
     * Restore database from backup
     */
    async restoreFromBackup(options) {
        let backupFilePath;
        let backupData;
        let restoreRecord = null;
        try {
            // Determine backup file path
            if (options.backupId) {
                const backup = await BackupHistory_1.default.findById(options.backupId);
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
            }
            else if (options.backupFilePath) {
                backupFilePath = options.backupFilePath;
            }
            else {
                return {
                    success: false,
                    message: 'Either backupId or backupFilePath must be provided'
                };
            }
            // Check if backup file exists
            try {
                await promises_1.default.access(backupFilePath);
            }
            catch (error) {
                return {
                    success: false,
                    message: `Backup file not found: ${backupFilePath}`
                };
            }
            logger_1.default.info('Starting database restore', {
                backupFilePath,
                overwrite: options.overwrite,
                collections: options.collections,
                createdBy: options.createdBy
            });
            // Validate and parse backup file
            backupData = await this.validateBackupFile(backupFilePath);
            // Create restore history record
            try {
                let sourceBackupId;
                let sourceBackupName;
                let sourceType;
                let uploadedFileName;
                if (options.backupId) {
                    const backup = await BackupHistory_1.default.findById(options.backupId);
                    sourceBackupId = backup?._id;
                    sourceBackupName = backup?.filename;
                    sourceType = 'existing_backup';
                }
                else {
                    sourceType = 'uploaded_file';
                    uploadedFileName = path_1.default.basename(backupFilePath);
                }
                restoreRecord = await RestoreHistory_1.default.create({
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
                logger_1.default.info('Restore record created', { restoreId: restoreRecord?._id });
            }
            catch (error) {
                logger_1.default.error('Failed to create restore record:', error);
                restoreRecord = null; // Explicitly set to null on error
                // Continue with restore even if history tracking fails
            }
            // Determine which collections to restore
            const collectionsToRestore = (options.collections && options.collections.length > 0)
                ? options.collections
                : backupData.metadata.collections;
            logger_1.default.info('Collections analysis', {
                requested: options.collections,
                fromBackup: backupData.metadata.collections,
                toRestore: collectionsToRestore,
                availableInData: Object.keys(backupData.data)
            });
            const validCollections = collectionsToRestore.filter(col => {
                const isInMetadata = backupData.metadata.collections.includes(col);
                const hasData = backupData.data[col];
                const isValid = isInMetadata && hasData;
                logger_1.default.info(`Collection ${col}`, {
                    inMetadata: isInMetadata,
                    hasData: !!hasData,
                    dataCount: hasData ? hasData.count : 0,
                    isValid
                });
                return isValid;
            });
            if (validCollections.length === 0) {
                logger_1.default.error('No valid collections found', {
                    collectionsToRestore,
                    backupMetadataCollections: backupData.metadata.collections,
                    backupDataKeys: Object.keys(backupData.data),
                    collectionsWithData: Object.keys(backupData.data).filter(key => backupData.data[key] && backupData.data[key].count > 0)
                });
                return {
                    success: false,
                    message: `No valid collections found to restore. Available collections in backup: ${backupData.metadata.collections.join(', ')}`
                };
            }
            const restoredCollections = [];
            const skippedCollections = [];
            const errors = [];
            // Restore each collection
            for (const collectionName of validCollections) {
                try {
                    const collectionData = backupData.data[collectionName];
                    if (collectionData.error) {
                        logger_1.default.warn(`Skipping collection ${collectionName}: ${collectionData.error}`);
                        skippedCollections.push(collectionName);
                        continue;
                    }
                    if (collectionData.count === 0) {
                        logger_1.default.info(`Skipping empty collection: ${collectionName}`);
                        skippedCollections.push(collectionName);
                        continue;
                    }
                    // Check if this is a system collection that should be skipped
                    if (collectionName === 'backuphistory' || collectionName === 'restorehistory') {
                        logger_1.default.info(`Skipping system collection: ${collectionName} (${collectionData.count} documents) - System collections are protected from restoration to prevent data corruption`);
                        skippedCollections.push(collectionName);
                        continue;
                    }
                    await this.restoreCollection(collectionName, collectionData.documents, options.overwrite);
                    restoredCollections.push(collectionName);
                    logger_1.default.info(`Successfully restored collection: ${collectionName}, documents: ${collectionData.count}`);
                }
                catch (error) {
                    logger_1.default.error(`Failed to restore collection ${collectionName}:`, error);
                    errors.push(`${collectionName}: ${error.message}`);
                    skippedCollections.push(collectionName);
                }
            }
            const success = restoredCollections.length > 0;
            const message = success
                ? `Restore completed: ${restoredCollections.length} collections restored${skippedCollections.length > 0 ? `, ${skippedCollections.length} skipped` : ''}${errors.length > 0 ? `, ${errors.length} errors` : ''}`
                : 'Restore failed: no collections were restored';
            logger_1.default.info('Database restore completed', {
                success,
                restoredCollections: restoredCollections.length,
                skippedCollections: skippedCollections.length,
                errors: errors.length
            });
            // Update restore history record
            const totalDocuments = restoredCollections.reduce((sum, col) => sum + (backupData.data[col]?.count || 0), 0);
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
                    }
                    else {
                        await restoreRecord.markFailed(message);
                    }
                }
                catch (error) {
                    logger_1.default.error('Failed to update restore record:', error);
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
        }
        catch (error) {
            logger_1.default.error('Database restore failed:', error);
            // Update restore history record on error
            if (restoreRecord) {
                try {
                    await restoreRecord.markFailed(error.message || 'Restore operation failed');
                }
                catch (historyError) {
                    logger_1.default.error('Failed to update restore record on error:', historyError);
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
    async restoreCollection(collectionName, documents, overwrite) {
        // CRITICAL: Prevent restoration of system collections to avoid data corruption
        // Restoring backup/restore history would overwrite current records with old data from backup files
        if (collectionName === 'backuphistory' || collectionName === 'restorehistory') {
            logger_1.default.warn(`Skipping restoration of ${collectionName} collection to prevent data corruption`);
            return;
        }
        logger_1.default.info(`Restoring collection: ${collectionName}, documents: ${documents.length}, overwrite: ${overwrite}`);
        if (documents.length === 0) {
            logger_1.default.info(`No documents to restore for collection: ${collectionName}`);
            return;
        }
        const Model = this.getModelByCollection(collectionName);
        if (overwrite) {
            // Clear existing collection first
            await Model.deleteMany({});
            logger_1.default.info(`Cleared existing data for collection: ${collectionName}`);
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
                }
                else {
                    // Update or insert documents (upsert)
                    for (const doc of cleanedBatch) {
                        await Model.findByIdAndUpdate(doc._id, doc, {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true
                        });
                        insertedCount++;
                    }
                }
                logger_1.default.info(`Restored batch for ${collectionName}: ${Math.min(i + batchSize, documents.length)}/${documents.length}`);
            }
            catch (error) {
                logger_1.default.error(`Failed to restore batch for ${collectionName}:`, error);
                // Continue with next batch for non-critical errors
                if (error.name !== 'ValidationError' && error.code !== 11000) {
                    throw error;
                }
            }
        }
        logger_1.default.info(`Collection restore completed: ${collectionName}, inserted: ${insertedCount}/${documents.length}`);
    }
    /**
     * Create a backup before restore (safety measure)
     */
    async createPreRestoreBackup(collections, createdBy) {
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
                logger_1.default.info('Pre-restore backup created', { backupId: result.backupId });
                return result.backupId;
            }
            return null;
        }
        catch (error) {
            logger_1.default.error('Failed to create pre-restore backup:', error);
            return null;
        }
    }
    /**
     * Get restore preview (what would be restored without actually doing it)
     */
    async getRestorePreview(options) {
        try {
            logger_1.default.info('RestoreService.getRestorePreview called', { options });
            let backupFilePath;
            if (options.backupId) {
                logger_1.default.info('Looking up backup by ID', { backupId: options.backupId });
                const backup = await BackupHistory_1.default.findById(options.backupId);
                logger_1.default.info('Backup lookup result', {
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
                    logger_1.default.warn('Backup not found in database', { backupId: options.backupId });
                    return {
                        success: false,
                        message: 'Backup not found'
                    };
                }
                if (backup.status === 'deleted') {
                    logger_1.default.warn('Attempted to preview deleted backup', { backupId: options.backupId });
                    return {
                        success: false,
                        message: 'Cannot preview deleted backup'
                    };
                }
                backupFilePath = backup.filePath;
                logger_1.default.info('Using backup file path', { backupFilePath });
            }
            else if (options.backupFilePath) {
                backupFilePath = options.backupFilePath;
                logger_1.default.info('Using provided file path', { backupFilePath });
            }
            else {
                logger_1.default.error('No backup ID or file path provided');
                return {
                    success: false,
                    message: 'Either backupId or backupFilePath must be provided'
                };
            }
            // Check if backup file exists first
            try {
                await promises_1.default.access(backupFilePath);
                logger_1.default.info('Backup file exists', { backupFilePath });
            }
            catch (error) {
                logger_1.default.error('Backup file not found', { backupFilePath, error: error.message });
                return {
                    success: false,
                    message: `Backup file not found: ${backupFilePath}`,
                    error: error.message
                };
            }
            // Validate backup file
            logger_1.default.info('Validating backup file', { backupFilePath });
            const backupData = await this.validateBackupFile(backupFilePath);
            logger_1.default.info('Backup file validated successfully', {
                type: backupData.metadata.type,
                collections: backupData.metadata.collections.length
            });
            // Calculate what would be restored
            const collectionsToRestore = (options.collections && options.collections.length > 0)
                ? options.collections
                : backupData.metadata.collections;
            logger_1.default.info('Preview collections analysis', {
                requested: options.collections,
                fromBackup: backupData.metadata.collections,
                toRestore: collectionsToRestore,
                availableInData: Object.keys(backupData.data)
            });
            const validCollections = collectionsToRestore.filter(col => {
                const isInMetadata = backupData.metadata.collections.includes(col);
                const hasData = backupData.data[col];
                const isValid = isInMetadata && hasData;
                logger_1.default.info(`Preview collection ${col}`, {
                    inMetadata: isInMetadata,
                    hasData: !!hasData,
                    dataCount: hasData ? hasData.count : 0,
                    isValid
                });
                return isValid;
            });
            logger_1.default.info('Collections to restore', { collectionsToRestore, validCollections });
            const totalDocuments = validCollections.reduce((sum, col) => sum + (backupData.data[col]?.count || 0), 0);
            // Estimate size
            const backupSize = await promises_1.default.stat(backupFilePath);
            const estimatedSize = this.formatFileSize(backupSize.size);
            logger_1.default.info('Restore preview calculated', {
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
        }
        catch (error) {
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
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    /**
     * Get restore history
     */
    async getRestoreHistory(limit = 20) {
        return await RestoreHistory_1.default.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sourceBackupId', 'filename originalName type')
            .populate('safetyBackupId', 'filename originalName')
            .lean();
    }
}
exports.RestoreService = RestoreService;
//# sourceMappingURL=restoreService.js.map