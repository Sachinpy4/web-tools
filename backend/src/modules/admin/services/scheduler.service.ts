import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchedulerConfig, SchedulerConfigDocument } from '../schemas/scheduler-config.schema';
import { AdminService } from './admin.service';
import { CleanupService } from './cleanup.service';
import { CleanupOptionsDto } from '../dto/admin.dto';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private schedulerIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeSchedulers: Set<string> = new Set();

  constructor(
    @InjectModel(SchedulerConfig.name) private schedulerConfigModel: Model<SchedulerConfigDocument>,
    @Inject(forwardRef(() => AdminService)) private adminService: AdminService,
    private cleanupService: CleanupService,
  ) {}

  async onModuleInit() {
    this.logger.log('Scheduler service initializing...');
    // Set up circular dependency
    this.adminService.setSchedulerService(this);
    await this.initializeSchedulers();
  }

  async onModuleDestroy() {
    this.logger.log('Scheduler service shutting down...');
    this.stopAllSchedulers();
  }

  /**
   * Initialize all schedulers from database
   */
  async initializeSchedulers(): Promise<void> {
    try {
      const configs = await this.schedulerConfigModel.find({ enabled: true });
      
      for (const config of configs) {
        await this.startScheduler(config.type, config.hour, config.minute);
      }
      
      this.logger.log(`Initialized ${configs.length} active schedulers`);
    } catch (error) {
      this.logger.error('Failed to initialize schedulers:', error);
    }
  }

  /**
   * Start a scheduler for a specific task type
   */
  async startScheduler(type: string, hour: number, minute: number): Promise<void> {
    try {
      // Stop existing scheduler if running
      this.stopScheduler(type);

      const msUntilNext = this.calculateMsUntilNext(hour, minute);
      
      const timeout = setTimeout(async () => {
        await this.executeScheduledTask(type);
      }, msUntilNext);

      this.schedulerIntervals.set(type, timeout);
      this.activeSchedulers.add(type);

      const nextRun = new Date(Date.now() + msUntilNext);
      this.logger.log(`Scheduler started for ${type} - next run: ${nextRun.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to start scheduler for ${type}:`, error);
    }
  }

  /**
   * Stop a scheduler for a specific task type
   */
  stopScheduler(type: string): void {
    const timeout = this.schedulerIntervals.get(type);
    if (timeout) {
      clearTimeout(timeout);
      this.schedulerIntervals.delete(type);
      this.activeSchedulers.delete(type);
      this.logger.log(`Scheduler stopped for ${type}`);
    }
  }

  /**
   * Stop all schedulers
   */
  stopAllSchedulers(): void {
    for (const type of this.activeSchedulers) {
      this.stopScheduler(type);
    }
  }

  /**
   * Restart a scheduler (used when config changes)
   */
  async restartScheduler(type: string): Promise<void> {
    try {
      const config = await this.schedulerConfigModel.findOne({ type, enabled: true });
      if (config) {
        await this.startScheduler(type, config.hour, config.minute);
      } else {
        this.stopScheduler(type);
      }
    } catch (error) {
      this.logger.error(`Failed to restart scheduler for ${type}:`, error);
    }
  }

  /**
   * Execute a scheduled task
   */
  private async executeScheduledTask(type: string): Promise<void> {
    try {
      this.logger.log(`Executing scheduled ${type} cleanup`);

      let result: any;

      switch (type) {
        case 'images':
          result = await this.adminService.cleanupImages({ 
            type: 'images', 
            setupAutoCleanup: false, 
            emergencyMode: false 
          } as CleanupOptionsDto);
          break;

        case 'logs':
          result = await this.cleanupService.executeLogCleanup();
          break;

        case 'cache':
          result = await this.cleanupService.executeCacheCleanup();
          break;

        case 'database':
          result = await this.cleanupService.executeDatabaseCleanup();
          break;

        case 'memory':
          result = await this.cleanupService.executeMemoryOptimization();
          break;

        case 'files':
          result = await this.cleanupService.executeFileCleanup();
          break;

        default:
          this.logger.warn(`Unknown cleanup type: ${type}`);
          return;
      }

      // Mark task as executed in database
      await this.adminService.markTaskExecuted(type as any);

      this.logger.log(`Scheduled ${type} cleanup completed:`, {
        success: result?.success || false,
        totalDeleted: result?.totalDeleted || 0,
        sizeRecovered: result?.sizeRecovered || '0 MB'
      });

      // Schedule next execution
      const config = await this.schedulerConfigModel.findOne({ type, enabled: true });
      if (config) {
        await this.startScheduler(type, config.hour, config.minute);
      }

    } catch (error) {
      this.logger.error(`Scheduled ${type} cleanup failed:`, error);
      
      // Still reschedule even if this execution failed
      const config = await this.schedulerConfigModel.findOne({ type, enabled: true });
      if (config) {
        await this.startScheduler(type, config.hour, config.minute);
      }
    }
  }



  /**
   * Calculate milliseconds until next scheduled time
   */
  private calculateMsUntilNext(hour: number, minute: number): number {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime() - now.getTime();
  }

  /**
   * Get scheduler status for monitoring
   */
  getSchedulerStatus(): { [key: string]: { active: boolean; nextRun?: string; schedule?: string } } {
    const status: { [key: string]: { active: boolean; nextRun?: string; schedule?: string } } = {};
    
    for (const type of ['images', 'logs', 'cache', 'database', 'memory', 'files']) {
      status[type] = {
        active: this.activeSchedulers.has(type),
        nextRun: undefined,
        schedule: undefined
      };
    }

    return status;
  }
} 