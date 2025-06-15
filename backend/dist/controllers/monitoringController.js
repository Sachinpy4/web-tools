"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMongoDBBreaker = exports.getLoadBalancerStatus = exports.getCircuitBreakerStatus = exports.getSystemHealth = exports.getToolUsageStats = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const imageQueue_1 = require("../queues/imageQueue");
const database_1 = require("../config/database");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const loadBalancer_1 = require("../middleware/loadBalancer");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const process_1 = require("process");
const logger_1 = __importDefault(require("../utils/logger"));
const jobTrackingService_1 = require("../services/jobTrackingService");
const circuitBreaker_2 = require("../utils/circuitBreaker");
// Tool usage statistics for the admin panel
exports.getToolUsageStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get time range from query parameter (default to 'today')
        const timeRange = req.query.timeRange || 'today';
        // Calculate the start date based on the time range
        const now = new Date();
        let startDate = new Date(now);
        switch (timeRange) {
            case 'today':
                startDate.setHours(0, 0, 0, 0); // Start of today
                break;
            case '7days':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(now.getDate() - 30);
                break;
            case '1year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setHours(0, 0, 0, 0); // Default to today
        }
        // Calculate yesterday for the 24-hour stats
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        // Default structure for response
        const toolUsage = {
            compress: {
                totalUses: 0,
                last24Hours: 0,
                averageProcessingTime: '0s',
                successRate: 0
            },
            resize: {
                totalUses: 0,
                last24Hours: 0,
                averageProcessingTime: '0s',
                successRate: 0
            },
            convert: {
                totalUses: 0,
                last24Hours: 0,
                averageProcessingTime: '0s',
                successRate: 0
            },
            crop: {
                totalUses: 0,
                last24Hours: 0,
                averageProcessingTime: '0s',
                successRate: 0
            }
        };
        try {
            // Only query the database if connected
            if ((0, database_1.isDatabaseConnected)()) {
                // Get the job tracking model
                const JobTracking = (0, jobTrackingService_1.getJobTrackingModel)();
                // Fetch stats for each job type
                for (const jobType of ['compress', 'resize', 'convert', 'crop']) {
                    // Total uses within the selected time range
                    const totalCount = await JobTracking.countDocuments({
                        jobType,
                        createdAt: { $gte: startDate }
                    });
                    // Last 24 hours uses
                    const recent = await JobTracking.countDocuments({
                        jobType,
                        createdAt: { $gte: yesterday }
                    });
                    // Average processing time within the selected time range
                    const avgTimeResult = await JobTracking.aggregate([
                        {
                            $match: {
                                jobType,
                                createdAt: { $gte: startDate }
                            }
                        },
                        { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
                    ]);
                    // Success rate within the selected time range
                    const successCount = await JobTracking.countDocuments({
                        jobType,
                        status: 'completed',
                        createdAt: { $gte: startDate }
                    });
                    // Calculate success rate if there are any jobs
                    const successRate = totalCount > 0
                        ? ((successCount / totalCount) * 100).toFixed(1)
                        : '0';
                    // Format processing time
                    const avgTime = avgTimeResult.length > 0 && avgTimeResult[0].avgTime
                        ? (avgTimeResult[0].avgTime / 1000).toFixed(1) + 's'
                        : '0s';
                    // Update tool usage object
                    toolUsage[jobType] = {
                        totalUses: totalCount,
                        last24Hours: recent,
                        averageProcessingTime: avgTime,
                        successRate: parseFloat(successRate)
                    };
                }
            }
            else {
                logger_1.default.warn('Database not connected - using fallback data for tool usage stats');
                // If db is not connected, use access logs as fallback (simplified here)
                try {
                    // Read log files to estimate usage
                    const logDir = path_1.default.join(process.cwd(), 'logs');
                    const logFiles = fs_1.default.readdirSync(logDir).filter(f => f.endsWith('.log'));
                    for (const file of logFiles) {
                        const content = fs_1.default.readFileSync(path_1.default.join(logDir, file), 'utf8');
                        // Count occurrences of each job type in logs
                        toolUsage.compress.totalUses += (content.match(/compress job completed/g) || []).length;
                        toolUsage.resize.totalUses += (content.match(/resize job completed/g) || []).length;
                        toolUsage.convert.totalUses += (content.match(/conversion job completed/g) || []).length;
                        toolUsage.crop.totalUses += (content.match(/crop job completed/g) || []).length;
                        // Estimate recent usage - if log is from last 24h
                        const fileStats = fs_1.default.statSync(path_1.default.join(logDir, file));
                        if (fileStats.mtime >= yesterday) {
                            const recentContent = content;
                            toolUsage.compress.last24Hours += (recentContent.match(/compress job completed/g) || []).length;
                            toolUsage.resize.last24Hours += (recentContent.match(/resize job completed/g) || []).length;
                            toolUsage.convert.last24Hours += (recentContent.match(/conversion job completed/g) || []).length;
                            toolUsage.crop.last24Hours += (recentContent.match(/crop job completed/g) || []).length;
                        }
                    }
                    // Set reasonable defaults for processing times and success rates
                    toolUsage.compress.averageProcessingTime = '1.2s';
                    toolUsage.resize.averageProcessingTime = '0.9s';
                    toolUsage.convert.averageProcessingTime = '1.5s';
                    toolUsage.crop.averageProcessingTime = '0.7s';
                    // Set reasonable defaults for success rates based on logs
                    const errorLogs = fs_1.default.readdirSync(logDir).filter(f => f.includes('error'));
                    if (errorLogs.length > 0) {
                        // Assume 95% success rate if there are error logs
                        toolUsage.compress.successRate = 95.0;
                        toolUsage.resize.successRate = 95.0;
                        toolUsage.convert.successRate = 95.0;
                        toolUsage.crop.successRate = 95.0;
                    }
                    else {
                        // Assume 99% success rate if no error logs
                        toolUsage.compress.successRate = 99.0;
                        toolUsage.resize.successRate = 99.0;
                        toolUsage.convert.successRate = 99.0;
                        toolUsage.crop.successRate = 99.0;
                    }
                }
                catch (err) {
                    logger_1.default.error('Failed to read log files for tool usage stats:', err);
                    // Keep default values in toolUsage
                }
            }
        }
        catch (dbError) {
            logger_1.default.error('Error querying database for tool usage stats:', dbError);
            // Continue with default values
        }
        res.status(200).json({
            status: 'success',
            data: toolUsage
        });
    }
    catch (error) {
        logger_1.default.error(`Error fetching tool usage stats: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve tool usage statistics'
        });
    }
});
// System health metrics for the admin panel
exports.getSystemHealth = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Check Redis and database status
        const redisStatus = await (0, imageQueue_1.isRedisActuallyAvailable)();
        const dbStatus = (0, database_1.isDatabaseConnected)();
        // Get system metrics
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
        // Get Node.js process metrics
        const processMemory = (0, process_1.memoryUsage)();
        // Uptime information
        const uptime = process.uptime();
        const systemUptime = os_1.default.uptime();
        // CPU load
        const cpuUsage = os_1.default.loadavg();
        // Disk usage (basic implementation)
        let diskUsage = {
            total: "Unknown",
            free: "Unknown",
            used: "Unknown",
            percentUsed: "Unknown"
        };
        try {
            // This is a simplified approach and may not work on all systems
            // For a production environment, consider using a more robust solution
            const uploadsDirStat = fs_1.default.statSync(path_1.default.join(process.cwd(), "uploads"));
            diskUsage = {
                total: "N/A", // Would require platform-specific tools
                free: "N/A",
                used: formatBytes(uploadsDirStat.size),
                percentUsed: "N/A"
            };
        }
        catch (error) {
            logger_1.default.warn(`Could not determine disk usage: ${error.message}`);
        }
        // Get circuit breaker stats
        const circuitBreakerStats = (0, circuitBreaker_1.getCircuitBreakerStats)();
        // Get load balancer metrics
        const loadBalancerMetrics = (0, loadBalancer_1.getLoadBalancerMetrics)();
        // Response
        res.json({
            status: 'ok',
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
                disk: diskUsage,
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
// Circuit breaker status for the admin panel
exports.getCircuitBreakerStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get circuit breaker stats
        const circuitBreakerStats = (0, circuitBreaker_1.getCircuitBreakerStats)();
        res.status(200).json({
            status: 'success',
            data: circuitBreakerStats
        });
    }
    catch (error) {
        logger_1.default.error(`Error fetching circuit breaker stats: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve circuit breaker statistics'
        });
    }
});
// Load balancer status for the admin panel
exports.getLoadBalancerStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get load balancer metrics
        const loadBalancerMetrics = (0, loadBalancer_1.getLoadBalancerMetrics)();
        // Check if system is under high load
        const highLoad = await (0, loadBalancer_1.isSystemUnderHighLoad)();
        res.status(200).json({
            status: 'success',
            data: {
                ...loadBalancerMetrics,
                highLoad
            }
        });
    }
    catch (error) {
        logger_1.default.error(`Error fetching load balancer stats: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve load balancer statistics'
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
// Test method for MongoDB circuit breaker
exports.testMongoDBBreaker = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        // Get the current stats before the test
        const circuitBreakerStats = (0, circuitBreaker_1.getCircuitBreakerStats)();
        // Use the getBreaker function to get the MongoDB breaker instance
        const mongoBreaker = (0, circuitBreaker_2.getBreaker)('mongodb');
        if (!mongoBreaker) {
            return res.status(404).json({
                status: 'error',
                message: 'MongoDB circuit breaker not found'
            });
        }
        // Fire the breaker with a function that will fail
        // This is only for testing purposes
        try {
            await mongoBreaker.fire(async () => {
                // Simulate a database timeout or error
                await new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Simulated MongoDB error for testing')), 100);
                });
                return null;
            });
        }
        catch (error) {
            // Expected to throw an error
            logger_1.default.info('Test MongoDB error triggered successfully');
        }
        // Get the updated stats after the test
        const updatedStats = (0, circuitBreaker_1.getCircuitBreakerStats)();
        res.status(200).json({
            status: 'success',
            message: 'MongoDB circuit breaker test completed',
            before: circuitBreakerStats,
            after: updatedStats
        });
    }
    catch (error) {
        logger_1.default.error(`Error testing MongoDB circuit breaker: ${error.message}`);
        res.status(500).json({
            status: 'error',
            message: 'Failed to test MongoDB circuit breaker',
            error: error.message
        });
    }
});
//# sourceMappingURL=monitoringController.js.map