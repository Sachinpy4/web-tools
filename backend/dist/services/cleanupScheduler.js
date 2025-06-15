"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCleanupScheduler = setupCleanupScheduler;
exports.stopCleanupScheduler = stopCleanupScheduler;
exports.getSchedulerStatus = getSchedulerStatus;
exports.initializeSchedulers = initializeSchedulers;
exports.setupMultipleSchedulers = setupMultipleSchedulers;
const cleanupToolImages_1 = __importDefault(require("../scripts/cleanupToolImages"));
const logger_1 = __importDefault(require("../utils/logger"));
const cleanupExecutor_1 = require("./cleanupExecutor");
const SchedulerConfig_1 = __importDefault(require("../models/SchedulerConfig"));
// Store multiple cleanup intervals
let cleanupIntervals = new Map();
let activeSchedulers = new Set();
// Default schedules for each cleanup type
const defaultSchedules = [
    { type: 'images', hour: 3, minute: 0, enabled: false },
    { type: 'logs', hour: 2, minute: 0, enabled: false },
    { type: 'cache', hour: 1, minute: 0, enabled: false },
    { type: 'database', hour: 4, minute: 0, enabled: false },
    { type: 'memory', hour: 6, minute: 0, enabled: false }
];
let currentSchedules = [...defaultSchedules];
/**
 * Calculate milliseconds until next scheduled time
 */
function msUntilNextSchedule(hour, minute) {
    const now = new Date();
    const nextRun = new Date();
    // Set to scheduled time today
    nextRun.setHours(hour, minute, 0, 0);
    // If scheduled time has passed today, set to tomorrow
    if (now >= nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun.getTime() - now.getTime();
}
/**
 * Calculate next run date
 */
function calculateNextRun(hour, minute) {
    const now = new Date();
    const nextRun = new Date();
    // Set to scheduled time today
    nextRun.setHours(hour, minute, 0, 0);
    // If scheduled time has passed today, set to tomorrow
    if (now >= nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
}
/**
 * Update scheduler config in database
 */
async function updateSchedulerInDB(type, hour, minute, enabled) {
    try {
        const nextRun = enabled ? calculateNextRun(hour, minute) : null;
        await SchedulerConfig_1.default.findOneAndUpdate({ type }, {
            enabled,
            hour,
            minute,
            nextRun,
            updatedAt: new Date()
        }, {
            upsert: true,
            new: true
        });
        logger_1.default.info(`Scheduler config updated in database: ${type}, enabled: ${enabled}`);
    }
    catch (error) {
        logger_1.default.error(`Failed to update scheduler config in database:`, error);
        throw error;
    }
}
/**
 * Load scheduler configurations from database
 */
async function loadSchedulersFromDB() {
    try {
        const configs = await SchedulerConfig_1.default.find({});
        for (const config of configs) {
            // Update in-memory schedule configuration
            const scheduleIndex = currentSchedules.findIndex(s => s.type === config.type);
            if (scheduleIndex >= 0) {
                currentSchedules[scheduleIndex] = {
                    type: config.type,
                    hour: config.hour,
                    minute: config.minute,
                    enabled: config.enabled
                };
            }
            else {
                currentSchedules.push({
                    type: config.type,
                    hour: config.hour,
                    minute: config.minute,
                    enabled: config.enabled
                });
            }
            if (config.enabled) {
                logger_1.default.info(`Restoring scheduler from database: ${config.type} at ${config.hour}:${config.minute.toString().padStart(2, '0')}`);
                // Schedule the cleanup (now only needs the type since config is restored)
                scheduleNextCleanup(config.type);
                activeSchedulers.add(config.type);
            }
        }
        logger_1.default.info(`Restored ${configs.filter(c => c.enabled).length} active schedulers from database`);
    }
    catch (error) {
        logger_1.default.error('Failed to load schedulers from database:', error);
    }
}
/**
 * Perform scheduled cleanup based on type
 */
async function performScheduledCleanup(type) {
    try {
        logger_1.default.info(`Performing scheduled ${type} cleanup`);
        let results;
        switch (type) {
            case 'images':
                results = await (0, cleanupToolImages_1.default)();
                logger_1.default.info(`Scheduled ${type} cleanup completed:`, {
                    totalDeleted: results.totalDeleted,
                    totalSizeRecovered: results.totalSizeRecovered
                });
                break;
            case 'logs':
                results = await (0, cleanupExecutor_1.executeLogCleanup)();
                logger_1.default.info(`Scheduled ${type} cleanup completed:`, {
                    success: results.success,
                    totalDeleted: results.totalDeleted,
                    sizeRecovered: results.sizeRecovered
                });
                break;
            case 'cache':
                results = await (0, cleanupExecutor_1.executeCacheCleanup)();
                logger_1.default.info(`Scheduled ${type} cleanup completed:`, {
                    success: results.success,
                    totalDeleted: results.totalDeleted,
                    sizeRecovered: results.sizeRecovered
                });
                break;
            case 'database':
                results = await (0, cleanupExecutor_1.executeDatabaseCleanup)();
                logger_1.default.info(`Scheduled ${type} cleanup completed:`, {
                    success: results.success,
                    totalDeleted: results.totalDeleted,
                    sizeRecovered: results.sizeRecovered
                });
                break;
            case 'memory':
                results = await (0, cleanupExecutor_1.executeMemoryOptimization)();
                logger_1.default.info(`Scheduled ${type} cleanup completed:`, {
                    success: results.success,
                    totalDeleted: results.totalDeleted,
                    sizeRecovered: results.sizeRecovered
                });
                break;
            default:
                logger_1.default.warn(`Unknown cleanup type: ${type}`);
                return;
        }
        // Reschedule next cleanup
        scheduleNextCleanup(type);
    }
    catch (error) {
        logger_1.default.error(`Scheduled ${type} cleanup failed:`, error);
        // Still reschedule next cleanup even if this one failed
        scheduleNextCleanup(type);
    }
}
/**
 * Schedule the next cleanup for a specific type
 */
function scheduleNextCleanup(type) {
    const schedule = currentSchedules.find(s => s.type === type);
    if (!schedule || !schedule.enabled) {
        return;
    }
    // Clear existing timeout if any
    const existingTimeout = cleanupIntervals.get(type);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }
    const msUntilNext = msUntilNextSchedule(schedule.hour, schedule.minute);
    const hoursUntil = Math.round(msUntilNext / 1000 / 60 / 60);
    logger_1.default.info(`Next ${type} cleanup scheduled in ${hoursUntil} hours (${schedule.hour}:${schedule.minute.toString().padStart(2, '0')})`);
    const timeout = setTimeout(() => {
        performScheduledCleanup(type);
    }, msUntilNext);
    cleanupIntervals.set(type, timeout);
}
/**
 * Set up cleanup scheduler for a specific type
 */
async function setupCleanupScheduler(type = 'images', hour = 3, minute = 0) {
    try {
        if (activeSchedulers.has(type)) {
            return {
                success: true,
                message: `${type} cleanup scheduler already active`
            };
        }
        // Update schedule configuration in memory
        const scheduleIndex = currentSchedules.findIndex(s => s.type === type);
        if (scheduleIndex >= 0) {
            currentSchedules[scheduleIndex] = { type: type, hour, minute, enabled: true };
        }
        else {
            currentSchedules.push({ type: type, hour, minute, enabled: true });
        }
        // Save to database for persistence
        await updateSchedulerInDB(type, hour, minute, true);
        // Schedule first cleanup
        scheduleNextCleanup(type);
        activeSchedulers.add(type);
        logger_1.default.info(`${type} cleanup scheduler activated - next run at ${hour}:${minute.toString().padStart(2, '0')}`);
        return {
            success: true,
            message: `${type} cleanup scheduler activated successfully`
        };
    }
    catch (error) {
        logger_1.default.error(`Failed to setup ${type} cleanup scheduler:`, error);
        return {
            success: false,
            message: error.message || `Unknown ${type} scheduler setup error`
        };
    }
}
/**
 * Stop cleanup scheduler for a specific type
 */
async function stopCleanupScheduler(type) {
    const timeout = cleanupIntervals.get(type);
    if (timeout) {
        clearTimeout(timeout);
        cleanupIntervals.delete(type);
    }
    activeSchedulers.delete(type);
    // Disable in schedule config
    const scheduleIndex = currentSchedules.findIndex(s => s.type === type);
    if (scheduleIndex >= 0) {
        currentSchedules[scheduleIndex].enabled = false;
        // Save to database for persistence
        try {
            await updateSchedulerInDB(type, currentSchedules[scheduleIndex].hour, currentSchedules[scheduleIndex].minute, false);
        }
        catch (error) {
            logger_1.default.error(`Failed to update scheduler in database when stopping ${type}:`, error);
        }
    }
    logger_1.default.info(`${type} cleanup scheduler stopped`);
}
/**
 * Get scheduler status for all types
 */
function getSchedulerStatus() {
    const status = {};
    for (const schedule of currentSchedules) {
        const isActive = activeSchedulers.has(schedule.type);
        if (isActive) {
            const nextRun = new Date();
            nextRun.setHours(schedule.hour, schedule.minute, 0, 0);
            if (new Date() >= nextRun) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
            status[schedule.type] = {
                active: true,
                nextRun: nextRun.toISOString(),
                schedule: `${schedule.hour}:${schedule.minute.toString().padStart(2, '0')}`
            };
        }
        else {
            status[schedule.type] = {
                active: false,
                schedule: `${schedule.hour}:${schedule.minute.toString().padStart(2, '0')}`
            };
        }
    }
    return status;
}
/**
 * Initialize scheduler system - call this on server startup
 */
async function initializeSchedulers() {
    logger_1.default.info('Initializing scheduler system...');
    await loadSchedulersFromDB();
    logger_1.default.info('Scheduler system initialized');
}
/**
 * Setup multiple schedulers at once
 */
async function setupMultipleSchedulers(schedules) {
    const results = [];
    for (const schedule of schedules) {
        const result = await setupCleanupScheduler(schedule.type, schedule.hour, schedule.minute);
        results.push(result);
    }
    return results;
}
//# sourceMappingURL=cleanupScheduler.js.map