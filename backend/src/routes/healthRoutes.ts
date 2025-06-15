import express from 'express';
import { isRedisActuallyAvailable } from '../queues/imageQueue';
import { isDatabaseConnected } from '../config/database';
import { getCircuitBreakerStats } from '../utils/circuitBreaker';
import { getLoadBalancerMetrics, isSystemUnderHighLoad } from '../middleware/loadBalancer';
import os from 'os';
import { memoryUsage } from 'process';
import logger from '../utils/logger';

const router = express.Router();

// Basic health check route
router.get('/', async (req, res) => {
  const redisStatus = await isRedisActuallyAvailable();
  const dbStatus = isDatabaseConnected();
  const highLoad = await isSystemUnderHighLoad();
  
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
    const redisStatus = await isRedisActuallyAvailable();
    const dbStatus = isDatabaseConnected();
    const highLoad = await isSystemUnderHighLoad();
    
    // Get system metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
    
    // Get Node.js process metrics
    const processMemory = memoryUsage();
    
    // Get circuit breaker stats
    const circuitBreakerStats = getCircuitBreakerStats();
    
    // Get load balancer metrics
    const loadBalancerMetrics = getLoadBalancerMetrics();
    
    // Uptime information
    const uptime = process.uptime();
    const systemUptime = os.uptime();
    
    // CPU load
    const cpuUsage = os.loadavg();
    
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
        hostname: os.hostname(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpus: os.cpus().length,
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
  } catch (error: any) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve health metrics',
      error: error.message
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export default router; 