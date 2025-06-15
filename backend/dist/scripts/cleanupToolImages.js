"use strict";
/**
 * Script to clean up temporary tool images
 *
 * This script is designed to be run as a cron job periodically to remove
 * tool-generated images that are no longer needed. It preserves blog images
 * which are now stored in the /uploads/blogs directory.
 *
 * Usage:
 * - Manual run: ts-node src/scripts/cleanupToolImages.ts
 * - Or set up as a cron job
 *
 * Configuration:
 * - Uses admin panel retention settings from SystemSettings
 * - Falls back to environment variables if database is unavailable
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const settingsService_1 = require("../services/settingsService");
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = require("../config/database");
const mongoose_1 = __importDefault(require("mongoose"));
// Paths
const BASE_DIR = path_1.default.resolve(__dirname, '../../uploads');
const PROCESSED_DIR = path_1.default.join(BASE_DIR, 'processed');
const ARCHIVES_DIR = path_1.default.join(BASE_DIR, 'archives');
const BLOGS_DIR = path_1.default.join(BASE_DIR, 'blogs');
/**
 * Ensure database connection for getting admin settings
 */
async function ensureDatabaseConnection() {
    try {
        // Check if already connected
        if ((0, database_1.isDatabaseConnected)()) {
            return true;
        }
        // Try to connect
        await (0, database_1.connectDB)();
        return (0, database_1.isDatabaseConnected)();
    }
    catch (error) {
        logger_1.default.warn('Failed to connect to database for cleanup settings:', error);
        return false;
    }
}
/**
 * Get retention settings from admin panel
 */
async function getRetentionSettings() {
    try {
        // Ensure database connection
        const dbConnected = await ensureDatabaseConnection();
        if (!dbConnected) {
            logger_1.default.warn('Database not available, using environment fallbacks');
            throw new Error('Database connection failed');
        }
        const settings = await (0, settingsService_1.getCurrentSettings)();
        if (!settings.autoCleanupEnabled) {
            logger_1.default.info('Auto cleanup is disabled in admin panel');
            return null; // Don't clean if disabled
        }
        logger_1.default.info('Successfully loaded retention settings from admin panel:', {
            processedFileRetentionHours: settings.processedFileRetentionHours,
            archiveFileRetentionHours: settings.archiveFileRetentionHours,
            tempFileRetentionHours: settings.tempFileRetentionHours,
            autoCleanupEnabled: settings.autoCleanupEnabled
        });
        return {
            processedFileRetentionHours: settings.processedFileRetentionHours,
            archiveFileRetentionHours: settings.archiveFileRetentionHours,
            tempFileRetentionHours: settings.tempFileRetentionHours,
            autoCleanupEnabled: settings.autoCleanupEnabled
        };
    }
    catch (error) {
        logger_1.default.warn('Failed to get retention settings from database, using environment fallbacks:', error);
        // Fallback to environment variables
        const autoCleanupEnabled = process.env.AUTO_CLEANUP_ENABLED !== 'false';
        if (!autoCleanupEnabled) {
            logger_1.default.info('Auto cleanup is disabled via environment variable');
            return null;
        }
        const fallbackSettings = {
            processedFileRetentionHours: parseInt(process.env.PROCESSED_FILE_RETENTION_HOURS || '48'),
            archiveFileRetentionHours: parseInt(process.env.ARCHIVE_FILE_RETENTION_HOURS || '24'),
            tempFileRetentionHours: parseFloat(process.env.TEMP_FILE_RETENTION_HOURS || '2'),
            autoCleanupEnabled: true
        };
        logger_1.default.info('Using environment fallback settings:', fallbackSettings);
        return fallbackSettings;
    }
}
/**
 * Format file size in human readable format
 */
function formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
/**
 * Check if a file is older than the retention period
 */
function isFileOlderThan(filePath, retentionHours) {
    try {
        const stats = require('fs').statSync(filePath);
        const fileAge = Date.now() - stats.mtime.getTime();
        const retentionMs = retentionHours * 60 * 60 * 1000; // Convert hours to milliseconds
        return fileAge > retentionMs;
    }
    catch (error) {
        logger_1.default.error(`Error checking file age for ${filePath}:`, error);
        return false; // Don't delete if we can't check the age
    }
}
/**
 * Clean a directory based on retention settings
 */
async function cleanDirectory(dirPath, prefix, retentionHours) {
    const result = {
        directory: dirPath,
        deletedCount: 0,
        totalSize: 0,
        sizeFormatted: '0 Bytes'
    };
    try {
        if (!(0, fs_1.existsSync)(dirPath)) {
            console.log(`Directory doesn't exist: ${dirPath}`);
            return result;
        }
        const files = await promises_1.default.readdir(dirPath);
        console.log(`Checking ${files.length} files in ${dirPath} (retention: ${retentionHours} hours)`);
        for (const file of files) {
            // Only process files with the specified prefix (e.g., 'tool-')
            if (!file.startsWith(prefix)) {
                continue;
            }
            const filePath = path_1.default.join(dirPath, file);
            try {
                const stats = await promises_1.default.stat(filePath);
                // Skip directories
                if (stats.isDirectory()) {
                    continue;
                }
                // Check if file is older than retention period
                if (isFileOlderThan(filePath, retentionHours)) {
                    console.log(`Deleting old file: ${file} (${formatSize(stats.size)})`);
                    await promises_1.default.unlink(filePath);
                    result.deletedCount++;
                    result.totalSize += stats.size;
                }
                else {
                    // File is still within retention period
                    const fileAge = Date.now() - stats.mtime.getTime();
                    const hoursOld = Math.round(fileAge / (1000 * 60 * 60) * 10) / 10;
                    console.log(`Keeping file: ${file} (${hoursOld}h old, retention: ${retentionHours}h)`);
                }
            }
            catch (fileError) {
                console.error(`Error processing file ${file}:`, fileError);
            }
        }
        result.sizeFormatted = formatSize(result.totalSize);
        console.log(`Cleaned ${dirPath}: ${result.deletedCount} files, ${result.sizeFormatted} recovered`);
    }
    catch (error) {
        console.error(`Error cleaning directory ${dirPath}:`, error);
    }
    return result;
}
/**
 * Clean main uploads directory (files not in subdirectories)
 */
async function cleanMainDirectory(retentionHours) {
    const result = {
        directory: BASE_DIR,
        deletedCount: 0,
        totalSize: 0,
        sizeFormatted: '0 Bytes'
    };
    try {
        if (!(0, fs_1.existsSync)(BASE_DIR)) {
            console.log(`Base directory doesn't exist: ${BASE_DIR}`);
            return result;
        }
        const items = await promises_1.default.readdir(BASE_DIR);
        console.log(`Checking ${items.length} items in main uploads directory (retention: ${retentionHours} hours)`);
        for (const item of items) {
            const itemPath = path_1.default.join(BASE_DIR, item);
            try {
                const stats = await promises_1.default.stat(itemPath);
                // Skip directories (like processed/, archives/, blogs/)
                if (stats.isDirectory()) {
                    continue;
                }
                // Skip blog images (they should be in blogs/ directory, but just in case)
                if (item.startsWith('blog-')) {
                    console.log(`Skipping blog image: ${item}`);
                    continue;
                }
                // Check if file is older than retention period
                if (isFileOlderThan(itemPath, retentionHours)) {
                    console.log(`Deleting old file: ${item} (${formatSize(stats.size)})`);
                    await promises_1.default.unlink(itemPath);
                    result.deletedCount++;
                    result.totalSize += stats.size;
                }
                else {
                    // File is still within retention period
                    const fileAge = Date.now() - stats.mtime.getTime();
                    const hoursOld = Math.round(fileAge / (1000 * 60 * 60) * 10) / 10;
                    console.log(`Keeping file: ${item} (${hoursOld}h old, retention: ${retentionHours}h)`);
                }
            }
            catch (fileError) {
                console.error(`Error processing item ${item}:`, fileError);
            }
        }
        result.sizeFormatted = formatSize(result.totalSize);
        console.log(`Cleaned main directory: ${result.deletedCount} files, ${result.sizeFormatted} recovered`);
    }
    catch (error) {
        console.error(`Error cleaning main directory:`, error);
    }
    return result;
}
/**
 * Main function to run the cleanup
 */
async function main() {
    let shouldCloseConnection = false;
    try {
        console.log('Starting tool image cleanup with admin panel settings');
        // Track if we need to close the connection at the end
        shouldCloseConnection = !(0, database_1.isDatabaseConnected)();
        // Get retention settings from admin panel
        const retentionSettings = await getRetentionSettings();
        if (!retentionSettings) {
            console.log('Cleanup is disabled - skipping all cleanup operations');
            // Return empty results
            const emptyResult = {
                directory: '',
                deletedCount: 0,
                totalSize: 0,
                sizeFormatted: '0 Bytes'
            };
            return {
                processedFiles: emptyResult,
                archiveFiles: emptyResult,
                uploadedFiles: emptyResult,
                totalDeleted: 0,
                totalSizeRecovered: '0 Bytes'
            };
        }
        console.log('Retention settings:', {
            processedFiles: `${retentionSettings.processedFileRetentionHours} hours`,
            archiveFiles: `${retentionSettings.archiveFileRetentionHours} hours`,
            tempFiles: `${retentionSettings.tempFileRetentionHours} hours`
        });
        // Ensure all required directories exist
        for (const dir of [BASE_DIR, PROCESSED_DIR, ARCHIVES_DIR, BLOGS_DIR]) {
            if (!(0, fs_1.existsSync)(dir)) {
                console.log(`Creating directory: ${dir}`);
                await promises_1.default.mkdir(dir, { recursive: true });
            }
        }
        // Clean processed directory (tool-*.*) - use processedFileRetentionHours
        const processedResult = await cleanDirectory(PROCESSED_DIR, 'tool-', retentionSettings.processedFileRetentionHours);
        // Clean archives directory (tool-*.zip) - use archiveFileRetentionHours
        const archivesResult = await cleanDirectory(ARCHIVES_DIR, 'tool-', retentionSettings.archiveFileRetentionHours);
        // Clean main uploads directory - use tempFileRetentionHours for temp files
        const uploadsResult = await cleanMainDirectory(retentionSettings.tempFileRetentionHours);
        // Calculate totals
        const totalDeletedCount = processedResult.deletedCount + archivesResult.deletedCount + uploadsResult.deletedCount;
        const totalSize = processedResult.totalSize + archivesResult.totalSize + uploadsResult.totalSize;
        console.log(`Total files deleted: ${totalDeletedCount}`);
        console.log(`Total space recovered: ${formatSize(totalSize)}`);
        console.log('Cleanup completed successfully');
        return {
            processedFiles: processedResult,
            archiveFiles: archivesResult,
            uploadedFiles: uploadsResult,
            totalDeleted: totalDeletedCount,
            totalSizeRecovered: formatSize(totalSize)
        };
    }
    catch (error) {
        console.error('Cleanup failed:', error);
        throw error;
    }
    finally {
        // Close database connection if we opened it in this script
        if (shouldCloseConnection && (0, database_1.isDatabaseConnected)()) {
            try {
                await mongoose_1.default.disconnect();
                console.log('Database connection closed');
            }
            catch (error) {
                logger_1.default.warn('Error closing database connection:', error);
            }
        }
    }
}
// Export the main function for use by other modules
exports.default = main;
// Run cleanup if this script is executed directly
if (require.main === module) {
    main()
        .then((results) => {
        console.log('Cleanup completed:', results);
        process.exit(0);
    })
        .catch((error) => {
        console.error('Cleanup failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=cleanupToolImages.js.map