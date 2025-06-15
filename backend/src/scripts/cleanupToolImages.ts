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

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { getCurrentSettings } from '../services/settingsService';
import logger from '../utils/logger';
import { connectDB, isDatabaseConnected } from '../config/database';
import mongoose from 'mongoose';

// Paths
const BASE_DIR = path.resolve(__dirname, '../../uploads');
const PROCESSED_DIR = path.join(BASE_DIR, 'processed');
const ARCHIVES_DIR = path.join(BASE_DIR, 'archives');
const BLOGS_DIR = path.join(BASE_DIR, 'blogs');

// Define return type for cleanup results
export interface CleanupResult {
  directory: string;
  deletedCount: number;
  totalSize: number;
  sizeFormatted: string;
}

/**
 * Ensure database connection for getting admin settings
 */
async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    // Check if already connected
    if (isDatabaseConnected()) {
      return true;
    }
    
    // Try to connect
    await connectDB();
    return isDatabaseConnected();
  } catch (error) {
    logger.warn('Failed to connect to database for cleanup settings:', error);
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
      logger.warn('Database not available, using environment fallbacks');
      throw new Error('Database connection failed');
    }
    
    const settings = await getCurrentSettings();
    
    if (!settings.autoCleanupEnabled) {
      logger.info('Auto cleanup is disabled in admin panel');
      return null; // Don't clean if disabled
    }
    
    logger.info('Successfully loaded retention settings from admin panel:', {
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
  } catch (error) {
    logger.warn('Failed to get retention settings from database, using environment fallbacks:', error);
    
    // Fallback to environment variables
    const autoCleanupEnabled = process.env.AUTO_CLEANUP_ENABLED !== 'false';
    
    if (!autoCleanupEnabled) {
      logger.info('Auto cleanup is disabled via environment variable');
      return null;
    }
    
    const fallbackSettings = {
      processedFileRetentionHours: parseInt(process.env.PROCESSED_FILE_RETENTION_HOURS || '48'),
      archiveFileRetentionHours: parseInt(process.env.ARCHIVE_FILE_RETENTION_HOURS || '24'),
      tempFileRetentionHours: parseFloat(process.env.TEMP_FILE_RETENTION_HOURS || '2'),
      autoCleanupEnabled: true
    };
    
    logger.info('Using environment fallback settings:', fallbackSettings);
    return fallbackSettings;
  }
}

/**
 * Format file size in human readable format
 */
function formatSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if a file is older than the retention period
 */
function isFileOlderThan(filePath: string, retentionHours: number): boolean {
  try {
    const stats = require('fs').statSync(filePath);
    const fileAge = Date.now() - stats.mtime.getTime();
    const retentionMs = retentionHours * 60 * 60 * 1000; // Convert hours to milliseconds
    return fileAge > retentionMs;
  } catch (error) {
    logger.error(`Error checking file age for ${filePath}:`, error);
    return false; // Don't delete if we can't check the age
  }
}

/**
 * Clean a directory based on retention settings
 */
async function cleanDirectory(dirPath: string, prefix: string, retentionHours: number): Promise<CleanupResult> {
  const result: CleanupResult = {
    directory: dirPath,
    deletedCount: 0,
    totalSize: 0,
    sizeFormatted: '0 Bytes'
  };
  
  try {
    if (!existsSync(dirPath)) {
      console.log(`Directory doesn't exist: ${dirPath}`);
      return result;
    }
    
    const files = await fs.readdir(dirPath);
    console.log(`Checking ${files.length} files in ${dirPath} (retention: ${retentionHours} hours)`);
    
    for (const file of files) {
      // Only process files with the specified prefix (e.g., 'tool-')
      if (!file.startsWith(prefix)) {
        continue;
      }
      
      const filePath = path.join(dirPath, file);
      
      try {
        const stats = await fs.stat(filePath);
        
        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }
        
        // Check if file is older than retention period
        if (isFileOlderThan(filePath, retentionHours)) {
          console.log(`Deleting old file: ${file} (${formatSize(stats.size)})`);
          
          await fs.unlink(filePath);
          result.deletedCount++;
          result.totalSize += stats.size;
        } else {
          // File is still within retention period
          const fileAge = Date.now() - stats.mtime.getTime();
          const hoursOld = Math.round(fileAge / (1000 * 60 * 60) * 10) / 10;
          console.log(`Keeping file: ${file} (${hoursOld}h old, retention: ${retentionHours}h)`);
        }
        
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
    
    result.sizeFormatted = formatSize(result.totalSize);
    console.log(`Cleaned ${dirPath}: ${result.deletedCount} files, ${result.sizeFormatted} recovered`);
    
  } catch (error) {
    console.error(`Error cleaning directory ${dirPath}:`, error);
  }
  
  return result;
}

/**
 * Clean main uploads directory (files not in subdirectories)
 */
async function cleanMainDirectory(retentionHours: number): Promise<CleanupResult> {
  const result: CleanupResult = {
    directory: BASE_DIR,
    deletedCount: 0,
    totalSize: 0,
    sizeFormatted: '0 Bytes'
  };
  
  try {
    if (!existsSync(BASE_DIR)) {
      console.log(`Base directory doesn't exist: ${BASE_DIR}`);
      return result;
    }
    
    const items = await fs.readdir(BASE_DIR);
    console.log(`Checking ${items.length} items in main uploads directory (retention: ${retentionHours} hours)`);
    
    for (const item of items) {
      const itemPath = path.join(BASE_DIR, item);
      
      try {
        const stats = await fs.stat(itemPath);
        
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
          
          await fs.unlink(itemPath);
          result.deletedCount++;
          result.totalSize += stats.size;
        } else {
          // File is still within retention period
          const fileAge = Date.now() - stats.mtime.getTime();
          const hoursOld = Math.round(fileAge / (1000 * 60 * 60) * 10) / 10;
          console.log(`Keeping file: ${item} (${hoursOld}h old, retention: ${retentionHours}h)`);
        }
        
      } catch (fileError) {
        console.error(`Error processing item ${item}:`, fileError);
      }
    }
    
    result.sizeFormatted = formatSize(result.totalSize);
    console.log(`Cleaned main directory: ${result.deletedCount} files, ${result.sizeFormatted} recovered`);
    
  } catch (error) {
    console.error(`Error cleaning main directory:`, error);
  }
  
  return result;
}

/**
 * Main function to run the cleanup
 */
async function main(): Promise<{
  processedFiles: CleanupResult;
  archiveFiles: CleanupResult;
  uploadedFiles: CleanupResult;
  totalDeleted: number;
  totalSizeRecovered: string;
}> {
  let shouldCloseConnection = false;
  
  try {
    console.log('Starting tool image cleanup with admin panel settings');
    
    // Track if we need to close the connection at the end
    shouldCloseConnection = !isDatabaseConnected();
    
    // Get retention settings from admin panel
    const retentionSettings = await getRetentionSettings();
    
    if (!retentionSettings) {
      console.log('Cleanup is disabled - skipping all cleanup operations');
      
      // Return empty results
      const emptyResult: CleanupResult = {
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
      if (!existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        await fs.mkdir(dir, { recursive: true });
      }
    }
    
    // Clean processed directory (tool-*.*) - use processedFileRetentionHours
    const processedResult = await cleanDirectory(
      PROCESSED_DIR, 
      'tool-', 
      retentionSettings.processedFileRetentionHours
    );
    
    // Clean archives directory (tool-*.zip) - use archiveFileRetentionHours
    const archivesResult = await cleanDirectory(
      ARCHIVES_DIR, 
      'tool-', 
      retentionSettings.archiveFileRetentionHours
    );
    
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
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  } finally {
    // Close database connection if we opened it in this script
    if (shouldCloseConnection && isDatabaseConnected()) {
      try {
        await mongoose.disconnect();
        console.log('Database connection closed');
      } catch (error) {
        logger.warn('Error closing database connection:', error);
      }
    }
  }
}

// Export the main function for use by other modules
export default main;

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