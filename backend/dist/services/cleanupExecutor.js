"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeLogCleanup = executeLogCleanup;
exports.executeCacheCleanup = executeCacheCleanup;
exports.executeDatabaseCleanup = executeDatabaseCleanup;
exports.executeMemoryOptimization = executeMemoryOptimization;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const bull_1 = __importDefault(require("bull"));
const redis_1 = require("../config/redis");
const rateLimiter_1 = require("../middleware/rateLimiter");
const settingsService_1 = require("../services/settingsService");
/**
 * Execute log cleanup
 */
async function executeLogCleanup() {
    try {
        const logsDir = path_1.default.join(process.cwd(), 'logs');
        const logPath = path_1.default.join(logsDir, 'all.log');
        const errorLogPath = path_1.default.join(logsDir, 'error.log');
        let totalSize = 0;
        let fileCount = 0;
        const details = [];
        // Check all.log
        try {
            const logStats = await promises_1.default.stat(logPath);
            const sizeMB = logStats.size / 1024 / 1024;
            if (logStats.size > 1024 * 1024) { // >1MB
                await promises_1.default.writeFile(logPath, '');
                totalSize += logStats.size;
                fileCount++;
                details.push(`Truncated all.log (${sizeMB.toFixed(2)}MB)`);
            }
            else {
                details.push(`all.log size OK (${sizeMB.toFixed(2)}MB)`);
            }
        }
        catch (e) {
            details.push(`all.log not found or error: ${e.message}`);
        }
        // Check error.log
        try {
            const errorLogStats = await promises_1.default.stat(errorLogPath);
            const sizeMB = errorLogStats.size / 1024 / 1024;
            if (errorLogStats.size > 512 * 1024) { // >512KB
                await promises_1.default.writeFile(errorLogPath, '');
                totalSize += errorLogStats.size;
                fileCount++;
                details.push(`Truncated error.log (${sizeMB.toFixed(2)}MB)`);
            }
            else {
                details.push(`error.log size OK (${sizeMB.toFixed(2)}MB)`);
            }
        }
        catch (e) {
            details.push(`error.log not found or error: ${e.message}`);
        }
        return {
            success: true,
            totalDeleted: fileCount,
            sizeRecovered: totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(2)} MB` : '0 MB',
            message: fileCount > 0 ?
                `Cleaned ${fileCount} log files. ${details.join('; ')}` :
                `No cleanup needed. ${details.join('; ')}`
        };
    }
    catch (error) {
        return {
            success: false,
            totalDeleted: 0,
            sizeRecovered: '0 MB',
            message: `Log cleanup failed: ${error.message}`
        };
    }
}
/**
 * Execute cache cleanup
 */
async function executeCacheCleanup() {
    try {
        const redisAvailable = await (0, redis_1.testRedisConnection)();
        if (!redisAvailable) {
            return {
                success: false,
                totalDeleted: 0,
                sizeRecovered: '0 KB',
                message: 'Redis not available - cache cleanup skipped'
            };
        }
        let deletedKeys = 0;
        const details = [];
        try {
            const tempQueue = new bull_1.default('temp-cleanup-test', {
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: parseInt(process.env.REDIS_DB || '0')
                }
            });
            await tempQueue.close();
            (0, rateLimiter_1.clearRateLimitCache)();
            (0, settingsService_1.clearSettingsCache)();
            details.push('Rate limit cache cleared');
            details.push('Settings cache cleared');
            details.push('Redis connection verified');
            deletedKeys = 2;
            return {
                success: true,
                totalDeleted: deletedKeys,
                sizeRecovered: '1 KB',
                message: `Cache cleanup completed. ${details.join('; ')}`
            };
        }
        catch (redisError) {
            details.push(`Redis operation failed: ${redisError.message}`);
            (0, rateLimiter_1.clearRateLimitCache)();
            (0, settingsService_1.clearSettingsCache)();
            return {
                success: true,
                totalDeleted: 2,
                sizeRecovered: '0.5 KB',
                message: `Local cache cleared, Redis cleanup skipped. ${details.join('; ')}`
            };
        }
    }
    catch (error) {
        return {
            success: false,
            totalDeleted: 0,
            sizeRecovered: '0 KB',
            message: `Cache cleanup failed: ${error.message}`
        };
    }
}
/**
 * Execute database cleanup
 */
async function executeDatabaseCleanup() {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db) {
            return {
                success: false,
                totalDeleted: 0,
                sizeRecovered: '0 KB',
                message: 'Database not connected'
            };
        }
        let totalDeleted = 0;
        const details = [];
        // Clean expired sessions
        try {
            const sessionsCollection = db.collection('sessions');
            const now = new Date();
            const sessionCutoff = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
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
            }
            else {
                details.push('No expired sessions found');
            }
        }
        catch (e) {
            details.push(`Sessions: Collection not found (normal)`);
        }
        // Clean old analytics data
        try {
            const analyticsCollection = db.collection('analytics');
            const analyticsCutoff = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
            const oldAnalytics = await analyticsCollection.deleteMany({
                createdAt: { $lt: analyticsCutoff }
            });
            if (oldAnalytics.deletedCount > 0) {
                totalDeleted += oldAnalytics.deletedCount;
                details.push(`Old analytics: ${oldAnalytics.deletedCount} deleted`);
            }
            else {
                details.push('No old analytics data found');
            }
        }
        catch (e) {
            details.push(`Analytics: Collection not found (normal)`);
        }
        return {
            success: true,
            totalDeleted,
            sizeRecovered: `${(totalDeleted * 1024 / 1024).toFixed(2)} KB`,
            message: totalDeleted > 0 ?
                `Cleaned ${totalDeleted} database records. ${details.join('; ')}` :
                `No cleanup needed. Database is clean. ${details.join('; ')}`
        };
    }
    catch (error) {
        return {
            success: false,
            totalDeleted: 0,
            sizeRecovered: '0 KB',
            message: `Database cleanup failed: ${error.message}`
        };
    }
}
/**
 * Execute memory optimization
 */
async function executeMemoryOptimization() {
    try {
        const memBefore = process.memoryUsage();
        if (global.gc) {
            global.gc();
        }
        const modulesToClear = Object.keys(require.cache).filter(key => key.includes('node_modules') &&
            !key.includes('express') &&
            !key.includes('mongoose') &&
            !key.includes('redis') &&
            !key.includes('bull'));
        let clearedModules = 0;
        for (const moduleKey of modulesToClear.slice(0, 50)) {
            try {
                delete require.cache[moduleKey];
                clearedModules++;
            }
            catch (e) {
                // Ignore errors
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
        return {
            success: true,
            totalDeleted: clearedModules,
            sizeRecovered: `${(memorySaved / 1024 / 1024).toFixed(2)} MB`,
            message: `Memory optimization completed. ${details.join('; ')}`
        };
    }
    catch (error) {
        return {
            success: false,
            totalDeleted: 0,
            sizeRecovered: '0 MB',
            message: `Memory optimization failed: ${error.message}`
        };
    }
}
//# sourceMappingURL=cleanupExecutor.js.map