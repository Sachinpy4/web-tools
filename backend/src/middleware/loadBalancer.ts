import { Request, Response, NextFunction } from 'express';
import os from 'os';
import logger from '../utils/logger';
import { getLoadBalancerSettings } from '../services/settingsService';

// Constants for load management
const MAX_LOAD_THRESHOLD = process.env.MAX_LOAD_THRESHOLD ? parseFloat(process.env.MAX_LOAD_THRESHOLD) : 0.9;
const MAX_MEMORY_USAGE_PERCENT = process.env.MAX_MEMORY_USAGE_PERCENT ? parseFloat(process.env.MAX_MEMORY_USAGE_PERCENT) : 90;
const DEGRADATION_COOLDOWN_MS = process.env.DEGRADATION_COOLDOWN_MS ? parseInt(process.env.DEGRADATION_COOLDOWN_MS) : 15000;
// Add stability to high load detection
const HIGH_LOAD_STABILITY_COUNT = 2;

// Track request metrics
let activeRequests = 0;
let totalRequests = 0;
let rejectedRequests = 0;
let lastDegradationTime = 0;
let isInDegradationMode = false;
// Track state change timestamps to avoid conflicts
let lastModeChangeTime = 0;
let consecutiveHighLoadChecks = 0;
let consecutiveNormalLoadChecks = 0;
let lastEmergencyCleanup = 0;

// Priority paths that should always be processed
const PRIORITY_PATHS = [
  '/api/health',
  '/api/health/detailed',
  '/api/images/status',
];

// Paths to exclude from request counting (monitoring dashboard and health checks)
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/health/detailed',
  '/api/monitoring/tool-usage',
  '/api/monitoring/system-health',
  '/api/monitoring/circuit-breakers',
  '/api/monitoring/load-balancer'
];

// Low priority paths that can be rejected first under heavy load
const LOW_PRIORITY_PATHS = [
  '/api/images/compress',
  '/api/images/convert',
  '/api/images/resize',
  '/api/images/crop',
  '/api/media/process',
  '/api/images/archive'
];

/**
 * Check if the system is under high load
 */
export async function isSystemUnderHighLoad(): Promise<boolean> {
  try {
    // Get current settings from database
    const { maxLoadThreshold, maxMemoryUsagePercent } = await getLoadBalancerSettings();
    
    // Check CPU load
    const cpuLoad = os.loadavg()[0] / os.cpus().length; // Normalize by CPU count
    
    // Check memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    // Check active requests - increased threshold for higher concurrency
    const requestPressure = activeRequests > 200;
    
    // High load if CPU or memory is above threshold
    return (
      cpuLoad > maxLoadThreshold ||
      memoryUsagePercent > maxMemoryUsagePercent ||
      requestPressure
    );
  } catch (error) {
    logger.error('Error getting load balancer settings, using fallback values:', error);
    
    // Fallback to environment variables if database is unavailable
    const maxLoadThreshold = parseFloat(process.env.MAX_LOAD_THRESHOLD || '0.9');
    const maxMemoryUsagePercent = parseInt(process.env.MAX_MEMORY_USAGE_PERCENT || '90');
    
    const cpuLoad = os.loadavg()[0] / os.cpus().length;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    const requestPressure = activeRequests > 200;
    
    return (
      cpuLoad > maxLoadThreshold ||
      memoryUsagePercent > maxMemoryUsagePercent ||
      requestPressure
    );
  }
}

/**
 * Update degradation mode based on system load with debounce logic
 */
async function updateDegradationMode() {
  const now = Date.now();
  const highLoad = await isSystemUnderHighLoad();
  
  // Add stability - track consecutive high/normal load measurements
  if (highLoad) {
    consecutiveHighLoadChecks++;
    consecutiveNormalLoadChecks = 0;
  } else {
    consecutiveHighLoadChecks = 0;
    consecutiveNormalLoadChecks++;
  }
  
  // Prevent rapid mode changes by requiring minimum time between changes (1 second)
  const MIN_MODE_CHANGE_INTERVAL = 1000; // 1 second
  const canChangeMode = (now - lastModeChangeTime) > MIN_MODE_CHANGE_INTERVAL;
  
  // Check if we should exit degradation mode
  // Require multiple consecutive normal load checks and cooldown period elapsed
  if (isInDegradationMode && consecutiveNormalLoadChecks >= HIGH_LOAD_STABILITY_COUNT && 
      (now - lastDegradationTime > DEGRADATION_COOLDOWN_MS) && canChangeMode) {
    isInDegradationMode = false;
    lastModeChangeTime = now;
    logger.info('Exiting degradation mode - system load has normalized');
  } 
  // Check if we should enter degradation mode
  // Require multiple consecutive high load checks
  else if (!isInDegradationMode && consecutiveHighLoadChecks >= HIGH_LOAD_STABILITY_COUNT && canChangeMode) {
    isInDegradationMode = true;
    lastDegradationTime = now;
    lastModeChangeTime = now;
    logger.warn('Entering degradation mode - system under high load');
    
    // Trigger emergency cleanup if we haven't done it recently
    const CLEANUP_COOLDOWN = 5 * 60 * 1000; // 5 minutes
    if (now - lastEmergencyCleanup > CLEANUP_COOLDOWN) {
      lastEmergencyCleanup = now;
      logger.warn('Triggering emergency file cleanup due to high load');
    }
  }
}

/**
 * Check if the request path should be excluded from counting
 */
function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATHS.some(excludedPath => path.startsWith(excludedPath));
}

/**
 * Middleware to handle load balancing and graceful degradation
 */
export const loadBalancer = (req: Request, res: Response, next: NextFunction) => {
  // Always allow health check routes
  if (PRIORITY_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Only track the request if it's not from monitoring or health checks
  if (!isExcludedPath(req.path)) {
    // Track request
    activeRequests++;
    totalRequests++;
    
    // Add response finish listener to decrement counter
    res.on('finish', () => {
      activeRequests--;
    });
  }
  
  // Update degradation mode based on current system load (non-blocking)
  updateDegradationMode().catch(error => {
    logger.error('Error updating degradation mode:', error);
  });
  
  // Handle request based on current mode
  if (isInDegradationMode) {
    // Check if this is a low priority request
    const isLowPriority = LOW_PRIORITY_PATHS.some(path => req.path.startsWith(path));
    
    if (isLowPriority) {
      // Reject low priority requests during degradation
      rejectedRequests++;
      return res.status(503).json({
        status: 'error',
        message: 'Service temporarily unavailable due to high load. Please try again later.',
        retryAfter: Math.ceil(DEGRADATION_COOLDOWN_MS / 1000),
        queueStatus: 'Please wait and try again in a few minutes'
      });
    } else {
      // For regular requests, continue but with warning
      logger.info(`Processing non-priority request during degradation: ${req.method} ${req.path}`);
      return next();
    }
  }
  
  // Normal processing
  next();
};

/**
 * Get load balancer metrics
 */
export function getLoadBalancerMetrics() {
  return {
    activeRequests,
    totalRequests,
    rejectedRequests,
    isInDegradationMode,
    systemLoad: {
      cpuLoad: os.loadavg()[0] / os.cpus().length,
      memoryUsage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      cpuCount: os.cpus().length
    },
    thresholds: {
      maxLoadThreshold: MAX_LOAD_THRESHOLD,
      maxMemoryUsagePercent: MAX_MEMORY_USAGE_PERCENT,
      degradationCooldownMs: DEGRADATION_COOLDOWN_MS
    },
    stability: {
      consecutiveHighLoadChecks,
      consecutiveNormalLoadChecks,
      highLoadStabilityThreshold: HIGH_LOAD_STABILITY_COUNT
    }
  };
} 