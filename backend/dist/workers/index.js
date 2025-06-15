"use strict";
/**
 * Worker process entry point
 *
 * This file is used to start the worker processes that handle image processing jobs.
 * It can be run as a separate process to handle jobs in the background.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cropQueue = exports.convertQueue = exports.resizeQueue = exports.compressQueue = void 0;
const imageQueue_1 = require("../queues/imageQueue");
Object.defineProperty(exports, "compressQueue", { enumerable: true, get: function () { return imageQueue_1.compressQueue; } });
Object.defineProperty(exports, "resizeQueue", { enumerable: true, get: function () { return imageQueue_1.resizeQueue; } });
Object.defineProperty(exports, "convertQueue", { enumerable: true, get: function () { return imageQueue_1.convertQueue; } });
Object.defineProperty(exports, "cropQueue", { enumerable: true, get: function () { return imageQueue_1.cropQueue; } });
require("./imageWorker");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
const settingsService_1 = require("../services/settingsService");
const os_1 = __importDefault(require("os"));
// Load environment variables
dotenv_1.default.config();
// Function to get dynamic concurrency settings
async function getDynamicConcurrency() {
    try {
        const dynamicConcurrency = await (0, settingsService_1.getWorkerConcurrency)();
        logger_1.default.info(`Using dynamic concurrency setting: ${dynamicConcurrency}`);
        return dynamicConcurrency;
    }
    catch (error) {
        logger_1.default.warn('Failed to get dynamic concurrency, using calculated default:', error);
        // Fallback calculation
        const cpuCount = os_1.default.cpus().length;
        const defaultConcurrency = Math.max(10, cpuCount * 2); // Minimum 10, or 2x CPU cores
        const maxConcurrency = process.env.NODE_ENV === 'production' ? cpuCount * 4 : cpuCount * 2;
        return Math.min(parseInt(process.env.WORKER_CONCURRENCY || String(defaultConcurrency)), maxConcurrency);
    }
}
// Initialize workers with dynamic concurrency
async function initializeWorkers() {
    const concurrency = await getDynamicConcurrency();
    const cpuCount = os_1.default.cpus().length;
    // Set concurrency for each queue
    // Need to use type assertion since the type definition is incomplete
    imageQueue_1.compressQueue.concurrency = concurrency;
    imageQueue_1.resizeQueue.concurrency = concurrency;
    imageQueue_1.convertQueue.concurrency = concurrency;
    imageQueue_1.cropQueue.concurrency = concurrency;
    // Log worker startup with detailed info
    console.log(`[Worker] Starting image processing workers`);
    console.log(`[Worker] CPU cores detected: ${cpuCount}`);
    console.log(`[Worker] Concurrency per queue: ${concurrency}`);
    console.log(`[Worker] Total concurrent jobs possible: ${concurrency * 4} (across all queues)`);
    console.log(`[Worker] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Worker] Listening for jobs on queues: compression, resize, conversion, crop`);
}
// Initialize workers
initializeWorkers().catch(err => {
    logger_1.default.error('Failed to initialize workers:', err);
    // Continue with defaults if database settings fail
});
// Clean old jobs on startup and then every hour (more frequent cleanup)
const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour instead of 24 hours
(0, imageQueue_1.cleanOldJobs)().catch(err => console.error('Error cleaning old jobs:', err));
setInterval(() => {
    (0, imageQueue_1.cleanOldJobs)().catch(err => console.error('Error cleaning old jobs:', err));
}, CLEANUP_INTERVAL);
// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] Received SIGTERM, shutting down gracefully...');
    // Close all queue connections
    await Promise.all([
        imageQueue_1.compressQueue.close(),
        imageQueue_1.resizeQueue.close(),
        imageQueue_1.convertQueue.close(),
        imageQueue_1.cropQueue.close(),
    ]);
    console.log('[Worker] All queue connections closed, exiting.');
    process.exit(0);
});
//# sourceMappingURL=index.js.map