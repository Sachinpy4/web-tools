"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const imageQueue_1 = require("../queues/imageQueue");
const database_1 = require("../config/database");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const loadBalancer_1 = require("../middleware/loadBalancer");
const os_1 = __importDefault(require("os"));
const process_1 = require("process");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
// Basic health check route
router.get('/', async (req, res) => {
    const redisStatus = await (0, imageQueue_1.isRedisActuallyAvailable)();
    const dbStatus = (0, database_1.isDatabaseConnected)();
    const highLoad = await (0, loadBalancer_1.isSystemUnderHighLoad)();
    res.json({
        status: highLoad ? 'degraded' : 'ok',
        timestamp: new Date().toISOString(),
        redis: redisStatus ? 'connected' : 'unavailable',
        database: dbStatus ? 'connected' : 'unavailable',
        mode: redisStatus ? 'queued' : 'direct',
        load: highLoad ? 'high' : 'normal',
        message: highLoad
            ? 'System under high load, some features may be temporarily unavailable'
            : 'System operating normally',
        uptime: process.uptime()
    });
});
// Detailed health check with metrics
router.get('/detailed', async (req, res) => {
    try {
        // Check Redis and database status
        const redisStatus = await (0, imageQueue_1.isRedisActuallyAvailable)();
        const dbStatus = (0, database_1.isDatabaseConnected)();
        const highLoad = await (0, loadBalancer_1.isSystemUnderHighLoad)();
        // Get system metrics
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
        // Get Node.js process metrics
        const processMemory = (0, process_1.memoryUsage)();
        // Get circuit breaker stats
        const circuitBreakerStats = (0, circuitBreaker_1.getCircuitBreakerStats)();
        // Get load balancer metrics
        const loadBalancerMetrics = (0, loadBalancer_1.getLoadBalancerMetrics)();
        // Uptime information
        const uptime = process.uptime();
        const systemUptime = os_1.default.uptime();
        // CPU load
        const cpuUsage = os_1.default.loadavg();
        // Response
        res.json({
            status: highLoad ? 'degraded' : 'ok',
            timestamp: new Date().toISOString(),
            services: {
                redis: {
                    status: redisStatus ? 'connected' : 'unavailable',
                    mode: redisStatus ? 'queued' : 'direct',
                },
                database: {
                    status: dbStatus ? 'connected' : 'unavailable',
                }
            },
            system: {
                hostname: os_1.default.hostname(),
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                cpus: os_1.default.cpus().length,
                loadAverage: cpuUsage,
                memory: {
                    total: formatBytes(totalMemory),
                    free: formatBytes(freeMemory),
                    used: formatBytes(usedMemory),
                    usagePercentage: memoryUsagePercentage.toFixed(2) + '%'
                },
                uptime: formatUptime(systemUptime)
            },
            process: {
                pid: process.pid,
                uptime: formatUptime(uptime),
                memory: {
                    rss: formatBytes(processMemory.rss),
                    heapTotal: formatBytes(processMemory.heapTotal),
                    heapUsed: formatBytes(processMemory.heapUsed),
                    external: formatBytes(processMemory.external)
                }
            },
            circuitBreakers: circuitBreakerStats,
            loadBalancer: loadBalancerMetrics
        });
    }
    catch (error) {
        logger_1.default.error(`Health check error: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve health metrics',
            error: error.message
        });
    }
});
// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}
exports.default = router;
//# sourceMappingURL=healthRoutes.js.map