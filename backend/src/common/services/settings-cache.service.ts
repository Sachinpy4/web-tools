import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemSettings, SystemSettingsDocument } from '../../modules/admin/schemas/system-settings.schema';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CachedSettings {
  // Rate limiting settings
  apiMaxRequests: number;
  apiWindowMs: number;
  imageProcessingMaxRequests: number;
  imageProcessingWindowMs: number;
  batchOperationMaxRequests: number;
  batchOperationWindowMs: number;

  // Worker & Processing settings
  workerConcurrency: number;
  maxLoadThreshold: number;
  maxMemoryUsagePercent: number;
  degradationCooldownMs: number;

  // File upload settings
  maxFileSize: number;
  maxFiles: number;

  // Cleanup settings
  processedFileRetentionHours: number;
  archiveFileRetentionHours: number;
  tempFileRetentionHours: number;
  autoCleanupEnabled: boolean;
  cleanupIntervalHours: number;

  // System settings
  nodeMemoryLimit: number;
  jobTimeoutMs: number;
  jobRetryAttempts: number;

  // Polling configuration settings
  jobStatusPollingIntervalMs: number;
  processingModePollingIntervalMs: number;
  processingModeMaxPollingIntervalMs: number;
  maxPollingAttempts: number;
  enableAdaptivePolling: boolean;

  // Cache metadata
  lastUpdated: Date;
  version: number;
}

@Injectable()
export class SettingsCacheService implements OnModuleInit {
  private readonly logger = new Logger(SettingsCacheService.name);
  private settingsCache: CachedSettings | null = null;
  private cacheVersion = 0;
  private lastCacheUpdate: Date | null = null;
  private cacheUpdateInProgress = false;

  // Default settings fallback (optimized for 10K+ traffic)
  private readonly defaultSettings: Partial<CachedSettings> = {
    apiMaxRequests: 1000,
    apiWindowMs: 900000, // 15 minutes
    imageProcessingMaxRequests: 100, // Increased for 10K+ daily requests
    imageProcessingWindowMs: 300000, // 5 minutes
    batchOperationMaxRequests: 25, // Increased for higher traffic
    batchOperationWindowMs: 600000, // 10 minutes
    workerConcurrency: 30, // Increased for 10K+ traffic handling
    maxLoadThreshold: 0.9,
    maxMemoryUsagePercent: 85, // More conservative for high traffic
    degradationCooldownMs: 15000,
    maxFileSize: 52428800, // 50MB
    maxFiles: 10,
    processedFileRetentionHours: 24, // Reduced for high traffic storage management
    archiveFileRetentionHours: 24,
    tempFileRetentionHours: 2,
    autoCleanupEnabled: true,
    cleanupIntervalHours: 3, // More frequent for high traffic
    nodeMemoryLimit: 4096,
    jobTimeoutMs: 180000,
    jobRetryAttempts: 3,
    jobStatusPollingIntervalMs: 2000, // 2 seconds
    processingModePollingIntervalMs: 30000, // 30 seconds
    processingModeMaxPollingIntervalMs: 300000, // 5 minutes
    maxPollingAttempts: 60, // 60 attempts
    enableAdaptivePolling: true,
  };

  constructor(
    @InjectModel(SystemSettings.name) private systemSettingsModel: Model<SystemSettingsDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize cache on module startup
    await this.refreshCache();
    this.logger.log('Settings cache initialized');
  }

  /**
   * Get cached settings with fallback to database
   */
  async getSettings(): Promise<CachedSettings> {
    // Return cached settings if available and not stale
    if (this.settingsCache && this.isCacheValid()) {
      return this.settingsCache;
    }

    // If cache is stale or empty, refresh it
    if (!this.cacheUpdateInProgress) {
      // Don't wait for cache refresh to avoid blocking requests
      this.refreshCache().catch(error => {
        this.logger.error('Failed to refresh settings cache:', error);
      });
    }

    // Return cached settings (even if stale) or defaults
    return this.settingsCache || this.createDefaultSettings();
  }

  /**
   * Force refresh the settings cache
   */
  async refreshCache(): Promise<void> {
    if (this.cacheUpdateInProgress) {
      return;
    }

    this.cacheUpdateInProgress = true;

    try {
      const settings = await this.fetchSettingsFromDatabase();
      
      if (settings) {
        this.settingsCache = this.mapToCache(settings);
        this.cacheVersion++;
        this.lastCacheUpdate = new Date();
        
        this.logger.debug(`Settings cache refreshed (version ${this.cacheVersion})`);
      } else {
        // No settings in database, create default settings
        await this.createDefaultSystemSettings();
        this.settingsCache = this.createDefaultSettings();
        this.cacheVersion++;
        this.lastCacheUpdate = new Date();
        
        this.logger.log('Created default system settings');
      }
    } catch (error) {
      this.logger.error('Failed to refresh settings cache:', error);
      
      // Fall back to defaults if cache is empty
      if (!this.settingsCache) {
        this.settingsCache = this.createDefaultSettings();
        this.cacheVersion++;
        this.lastCacheUpdate = new Date();
      }
    } finally {
      this.cacheUpdateInProgress = false;
    }
  }

  /**
   * Invalidate cache and force refresh
   */
  async invalidateCache(): Promise<void> {
    this.settingsCache = null;
    this.lastCacheUpdate = null;
    await this.refreshCache();
    this.logger.log('Settings cache invalidated and refreshed');
  }

  /**
   * Get specific setting value with type safety
   */
  async getSetting<K extends keyof CachedSettings>(key: K): Promise<CachedSettings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  /**
   * Check if cache is valid (not stale)
   */
  private isCacheValid(): boolean {
    if (!this.lastCacheUpdate) {
      return false;
    }

    const cacheMaxAge = this.configService.get<number>('cache.settingsMaxAge') || 60000; // 1 minute default (optimized)
    const age = Date.now() - this.lastCacheUpdate.getTime();
    
    return age < cacheMaxAge;
  }

  /**
   * Fetch settings from database
   */
  private async fetchSettingsFromDatabase(): Promise<SystemSettingsDocument | null> {
    try {
      return await (this.systemSettingsModel as any).getCurrentSettings();
    } catch (error) {
      this.logger.error('Failed to fetch settings from database:', error);
      return null;
    }
  }

  /**
   * Map database settings to cache format
   */
  private mapToCache(settings: SystemSettingsDocument): CachedSettings {
    return {
      // Rate limiting settings
      apiMaxRequests: settings.apiMaxRequests || this.defaultSettings.apiMaxRequests,
      apiWindowMs: settings.apiWindowMs || this.defaultSettings.apiWindowMs,
      imageProcessingMaxRequests: settings.imageProcessingMaxRequests || this.defaultSettings.imageProcessingMaxRequests,
      imageProcessingWindowMs: settings.imageProcessingWindowMs || this.defaultSettings.imageProcessingWindowMs,
      batchOperationMaxRequests: settings.batchOperationMaxRequests || this.defaultSettings.batchOperationMaxRequests,
      batchOperationWindowMs: settings.batchOperationWindowMs || this.defaultSettings.batchOperationWindowMs,

      // Worker & Processing settings
      workerConcurrency: settings.workerConcurrency || this.defaultSettings.workerConcurrency,
      maxLoadThreshold: settings.maxLoadThreshold || this.defaultSettings.maxLoadThreshold,
      maxMemoryUsagePercent: settings.maxMemoryUsagePercent || this.defaultSettings.maxMemoryUsagePercent,
      degradationCooldownMs: settings.degradationCooldownMs || this.defaultSettings.degradationCooldownMs,

      // File upload settings
      maxFileSize: settings.maxFileSize || this.defaultSettings.maxFileSize,
      maxFiles: settings.maxFiles || this.defaultSettings.maxFiles,

      // Cleanup settings
      processedFileRetentionHours: settings.processedFileRetentionHours || this.defaultSettings.processedFileRetentionHours,
      archiveFileRetentionHours: settings.archiveFileRetentionHours || this.defaultSettings.archiveFileRetentionHours,
      tempFileRetentionHours: settings.tempFileRetentionHours || this.defaultSettings.tempFileRetentionHours,
      autoCleanupEnabled: settings.autoCleanupEnabled ?? this.defaultSettings.autoCleanupEnabled,
      cleanupIntervalHours: settings.cleanupIntervalHours || this.defaultSettings.cleanupIntervalHours,

      // System settings
      nodeMemoryLimit: settings.nodeMemoryLimit || this.defaultSettings.nodeMemoryLimit,
      jobTimeoutMs: settings.jobTimeoutMs || this.defaultSettings.jobTimeoutMs,
      jobRetryAttempts: settings.jobRetryAttempts || this.defaultSettings.jobRetryAttempts,

      // Polling configuration settings
      jobStatusPollingIntervalMs: settings.jobStatusPollingIntervalMs || this.defaultSettings.jobStatusPollingIntervalMs,
      processingModePollingIntervalMs: settings.processingModePollingIntervalMs || this.defaultSettings.processingModePollingIntervalMs,
      processingModeMaxPollingIntervalMs: settings.processingModeMaxPollingIntervalMs || this.defaultSettings.processingModeMaxPollingIntervalMs,
      maxPollingAttempts: settings.maxPollingAttempts || this.defaultSettings.maxPollingAttempts,
      enableAdaptivePolling: settings.enableAdaptivePolling ?? this.defaultSettings.enableAdaptivePolling,

      // Cache metadata
      lastUpdated: new Date(),
      version: this.cacheVersion,
    };
  }

  /**
   * Create default settings object
   */
  private createDefaultSettings(): CachedSettings {
    return {
      ...this.defaultSettings,
      lastUpdated: new Date(),
      version: this.cacheVersion,
    } as CachedSettings;
  }

  /**
   * Create default system settings in database if none exist
   */
  private async createDefaultSystemSettings(): Promise<void> {
    try {
      const existingSettings = await this.systemSettingsModel.findOne();
      
      if (!existingSettings) {
        const defaultSettings = new this.systemSettingsModel(this.defaultSettings);
        await defaultSettings.save();
        this.logger.log('Created default system settings in database');
      }
    } catch (error) {
      this.logger.error('Failed to create default system settings:', error);
    }
  }

  /**
   * Scheduled cache refresh every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledCacheRefresh(): Promise<void> {
    if (this.configService.get<boolean>('cache.enableScheduledRefresh') !== false) {
      this.logger.debug('Running scheduled settings cache refresh');
      await this.refreshCache();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    isCached: boolean;
    version: number;
    lastUpdated: Date | null;
    isValid: boolean;
    updateInProgress: boolean;
  } {
    return {
      isCached: !!this.settingsCache,
      version: this.cacheVersion,
      lastUpdated: this.lastCacheUpdate,
      isValid: this.isCacheValid(),
      updateInProgress: this.cacheUpdateInProgress,
    };
  }
} 