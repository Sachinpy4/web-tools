import cleanupToolImages from '../scripts/cleanupToolImages';
import logger from '../utils/logger';
import { executeLogCleanup, executeCacheCleanup, executeDatabaseCleanup, executeMemoryOptimization } from './cleanupExecutor';
import SchedulerConfig from '../models/SchedulerConfig';

// Store multiple cleanup intervals
let cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();
let activeSchedulers: Set<string> = new Set();

interface SchedulerResult {
  success: boolean;
  message: string;
}

interface ScheduleConfig {
  type: 'images' | 'logs' | 'cache' | 'database' | 'memory';
  hour: number;
  minute: number;
  enabled: boolean;
}

// Default schedules for each cleanup type
const defaultSchedules: ScheduleConfig[] = [
  { type: 'images', hour: 3, minute: 0, enabled: false },
  { type: 'logs', hour: 2, minute: 0, enabled: false },
  { type: 'cache', hour: 1, minute: 0, enabled: false },
  { type: 'database', hour: 4, minute: 0, enabled: false },
  { type: 'memory', hour: 6, minute: 0, enabled: false }
];

let currentSchedules: ScheduleConfig[] = [...defaultSchedules];

/**
 * Calculate milliseconds until next scheduled time
 */
function msUntilNextSchedule(hour: number, minute: number): number {
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
function calculateNextRun(hour: number, minute: number): Date {
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
async function updateSchedulerInDB(type: string, hour: number, minute: number, enabled: boolean): Promise<void> {
  try {
    const nextRun = enabled ? calculateNextRun(hour, minute) : null;
    
    await SchedulerConfig.findOneAndUpdate(
      { type },
      { 
        enabled, 
        hour, 
        minute, 
        nextRun,
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    logger.info(`Scheduler config updated in database: ${type}, enabled: ${enabled}`);
  } catch (error) {
    logger.error(`Failed to update scheduler config in database:`, error);
    throw error;
  }
}

/**
 * Load scheduler configurations from database
 */
async function loadSchedulersFromDB(): Promise<void> {
  try {
    const configs = await SchedulerConfig.find({});
    
    for (const config of configs) {
      // Update in-memory schedule configuration
      const scheduleIndex = currentSchedules.findIndex(s => s.type === config.type);
      if (scheduleIndex >= 0) {
        currentSchedules[scheduleIndex] = {
          type: config.type as any,
          hour: config.hour,
          minute: config.minute,
          enabled: config.enabled
        };
      } else {
        currentSchedules.push({
          type: config.type as any,
          hour: config.hour,
          minute: config.minute,
          enabled: config.enabled
        });
      }
      
      if (config.enabled) {
        logger.info(`Restoring scheduler from database: ${config.type} at ${config.hour}:${config.minute.toString().padStart(2, '0')}`);
        
        // Schedule the cleanup (now only needs the type since config is restored)
        scheduleNextCleanup(config.type);
        activeSchedulers.add(config.type);
      }
    }
    
    logger.info(`Restored ${configs.filter(c => c.enabled).length} active schedulers from database`);
  } catch (error) {
    logger.error('Failed to load schedulers from database:', error);
  }
}

/**
 * Perform scheduled cleanup based on type
 */
async function performScheduledCleanup(type: string): Promise<void> {
  try {
    logger.info(`Performing scheduled ${type} cleanup`);
    
    let results: any;
    
    switch (type) {
      case 'images':
        results = await cleanupToolImages();
        logger.info(`Scheduled ${type} cleanup completed:`, {
          totalDeleted: results.totalDeleted,
          totalSizeRecovered: results.totalSizeRecovered
        });
        break;
      
      case 'logs':
        results = await executeLogCleanup();
        logger.info(`Scheduled ${type} cleanup completed:`, {
          success: results.success,
          totalDeleted: results.totalDeleted,
          sizeRecovered: results.sizeRecovered
        });
        break;
      
      case 'cache':
        results = await executeCacheCleanup();
        logger.info(`Scheduled ${type} cleanup completed:`, {
          success: results.success,
          totalDeleted: results.totalDeleted,
          sizeRecovered: results.sizeRecovered
        });
        break;
      
      case 'database':
        results = await executeDatabaseCleanup();
        logger.info(`Scheduled ${type} cleanup completed:`, {
          success: results.success,
          totalDeleted: results.totalDeleted,
          sizeRecovered: results.sizeRecovered
        });
        break;
      
      case 'memory':
        results = await executeMemoryOptimization();
        logger.info(`Scheduled ${type} cleanup completed:`, {
          success: results.success,
          totalDeleted: results.totalDeleted,
          sizeRecovered: results.sizeRecovered
        });
        break;
      
      default:
        logger.warn(`Unknown cleanup type: ${type}`);
        return;
    }
    
    // Reschedule next cleanup
    scheduleNextCleanup(type);
    
  } catch (error) {
    logger.error(`Scheduled ${type} cleanup failed:`, error);
    
    // Still reschedule next cleanup even if this one failed
    scheduleNextCleanup(type);
  }
}

/**
 * Schedule the next cleanup for a specific type
 */
function scheduleNextCleanup(type: string): void {
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
  
  logger.info(`Next ${type} cleanup scheduled in ${hoursUntil} hours (${schedule.hour}:${schedule.minute.toString().padStart(2, '0')})`);
  
  const timeout = setTimeout(() => {
    performScheduledCleanup(type);
  }, msUntilNext);
  
  cleanupIntervals.set(type, timeout);
}

/**
 * Set up cleanup scheduler for a specific type
 */
export async function setupCleanupScheduler(type: string = 'images', hour: number = 3, minute: number = 0): Promise<SchedulerResult> {
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
      currentSchedules[scheduleIndex] = { type: type as any, hour, minute, enabled: true };
    } else {
      currentSchedules.push({ type: type as any, hour, minute, enabled: true });
    }
    
    // Save to database for persistence
    await updateSchedulerInDB(type, hour, minute, true);
    
    // Schedule first cleanup
    scheduleNextCleanup(type);
    
    activeSchedulers.add(type);
    
    logger.info(`${type} cleanup scheduler activated - next run at ${hour}:${minute.toString().padStart(2, '0')}`);
    
    return {
      success: true,
      message: `${type} cleanup scheduler activated successfully`
    };
    
  } catch (error: any) {
    logger.error(`Failed to setup ${type} cleanup scheduler:`, error);
    
    return {
      success: false,
      message: error.message || `Unknown ${type} scheduler setup error`
    };
  }
}

/**
 * Stop cleanup scheduler for a specific type
 */
export async function stopCleanupScheduler(type: string): Promise<void> {
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
      await updateSchedulerInDB(
        type, 
        currentSchedules[scheduleIndex].hour, 
        currentSchedules[scheduleIndex].minute, 
        false
      );
    } catch (error) {
      logger.error(`Failed to update scheduler in database when stopping ${type}:`, error);
    }
  }
  
  logger.info(`${type} cleanup scheduler stopped`);
}

/**
 * Get scheduler status for all types
 */
export function getSchedulerStatus(): { [key: string]: { active: boolean; nextRun?: string; schedule?: string } } {
  const status: any = {};
  
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
    } else {
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
export async function initializeSchedulers(): Promise<void> {
  logger.info('Initializing scheduler system...');
  await loadSchedulersFromDB();
  logger.info('Scheduler system initialized');
}

/**
 * Setup multiple schedulers at once
 */
export async function setupMultipleSchedulers(schedules: { type: string; hour: number; minute: number }[]): Promise<SchedulerResult[]> {
  const results: SchedulerResult[] = [];
  
  for (const schedule of schedules) {
    const result = await setupCleanupScheduler(schedule.type, schedule.hour, schedule.minute);
    results.push(result);
  }
  
  return results;
}