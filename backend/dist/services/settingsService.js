"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSettings = getCurrentSettings;
exports.clearSettingsCache = clearSettingsCache;
exports.getSetting = getSetting;
exports.getWorkerConcurrency = getWorkerConcurrency;
exports.getRateLimitSettings = getRateLimitSettings;
exports.getLoadBalancerSettings = getLoadBalancerSettings;
exports.getFileUploadSettings = getFileUploadSettings;
const SystemSettings_1 = __importDefault(require("../models/SystemSettings"));
const logger_1 = __importDefault(require("../utils/logger"));
// Cache for settings to avoid database hits on every request
let settingsCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 60000; // 1 minute cache
/**
 * Get current settings with caching and fallback to environment variables
 */
async function getCurrentSettings() {
    const now = Date.now();
    // Return cached settings if still valid
    if (settingsCache && (now - lastCacheUpdate) < CACHE_DURATION) {
        return settingsCache;
    }
    try {
        // Try to get settings from database
        const settings = await SystemSettings_1.default.getCurrentSettings();
        // Update cache
        settingsCache = settings;
        lastCacheUpdate = now;
        return settings;
    }
    catch (error) {
        logger_1.default.warn('Failed to get settings from database, using environment variables:', error);
        // Fallback to environment variables with defaults
        const fallbackSettings = {
            // Worker & Processing Settings
            workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '25'),
            maxLoadThreshold: parseFloat(process.env.MAX_LOAD_THRESHOLD || '0.9'),
            maxMemoryUsagePercent: parseInt(process.env.MAX_MEMORY_USAGE_PERCENT || '90'),
            degradationCooldownMs: parseInt(process.env.DEGRADATION_COOLDOWN_MS || '15000'),
            // Rate Limiting Settings
            imageProcessingMaxRequests: parseInt(process.env.IMAGE_PROCESSING_MAX_REQUESTS || '50'),
            imageProcessingWindowMs: parseInt(process.env.IMAGE_PROCESSING_WINDOW_MS || '300000'),
            batchOperationMaxRequests: parseInt(process.env.BATCH_OPERATION_MAX_REQUESTS || '15'),
            batchOperationWindowMs: parseInt(process.env.BATCH_OPERATION_WINDOW_MS || '600000'),
            apiMaxRequests: parseInt(process.env.API_MAX_REQUESTS || '1000'),
            apiWindowMs: parseInt(process.env.API_WINDOW_MS || '900000'),
            // File Upload Settings
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
            maxFiles: parseInt(process.env.MAX_FILES || '10'),
            // Cleanup Settings
            processedFileRetentionHours: parseInt(process.env.PROCESSED_FILE_RETENTION_HOURS || '48'),
            archiveFileRetentionHours: parseInt(process.env.ARCHIVE_FILE_RETENTION_HOURS || '24'),
            tempFileRetentionHours: parseFloat(process.env.TEMP_FILE_RETENTION_HOURS || '2'),
            autoCleanupEnabled: process.env.AUTO_CLEANUP_ENABLED !== 'false',
            cleanupIntervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS || '6'),
            // System Settings
            nodeMemoryLimit: parseInt(process.env.NODE_MEMORY_LIMIT || '4096'),
            jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS || '180000'),
            jobRetryAttempts: parseInt(process.env.JOB_RETRY_ATTEMPTS || '3'),
        };
        return fallbackSettings;
    }
}
/**
 * Clear settings cache (call this when settings are updated)
 */
function clearSettingsCache() {
    settingsCache = null;
    lastCacheUpdate = 0;
    logger_1.default.info('Settings cache cleared');
}
/**
 * Get specific setting with type safety
 */
async function getSetting(key) {
    const settings = await getCurrentSettings();
    return settings[key];
}
/**
 * Helper functions for commonly used settings
 */
async function getWorkerConcurrency() {
    return await getSetting('workerConcurrency');
}
async function getRateLimitSettings() {
    const settings = await getCurrentSettings();
    return {
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
    };
}
async function getLoadBalancerSettings() {
    const settings = await getCurrentSettings();
    return {
        maxLoadThreshold: settings.maxLoadThreshold,
        maxMemoryUsagePercent: settings.maxMemoryUsagePercent,
        degradationCooldownMs: settings.degradationCooldownMs
    };
}
async function getFileUploadSettings() {
    const settings = await getCurrentSettings();
    return {
        maxFileSize: settings.maxFileSize,
        maxFiles: settings.maxFiles
    };
}
//# sourceMappingURL=settingsService.js.map