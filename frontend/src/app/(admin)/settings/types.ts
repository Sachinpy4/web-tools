// Type definitions for the admin settings system

export interface CleanupResult {
  processedFiles: {
    deletedCount: number;
    sizeFormatted: string;
  };
  archiveFiles: {
    deletedCount: number;
    sizeFormatted: string;
  };
  uploadedFiles: {
    deletedCount: number;
    sizeFormatted: string;
  };
  totalDeleted: number;
  totalSizeRecovered: string;
}

export interface ScheduledTaskResult {
  success: boolean;
  message: string;
}

export interface ApiResponse {
  status: string;
  data: {
    cleanup: CleanupResult;
    scheduledTask: ScheduledTaskResult | null;
  };
}

export interface SystemSettings {
  workerConcurrency: number;
  maxLoadThreshold: number;
  maxMemoryUsagePercent: number;
  degradationCooldownMs: number;
  imageProcessingMaxRequests: number;
  imageProcessingWindowMs: number;
  batchOperationMaxRequests: number;
  batchOperationWindowMs: number;
  apiMaxRequests: number;
  apiWindowMs: number;
  maxFileSize: number;
  maxFiles: number;
  processedFileRetentionHours: number;
  archiveFileRetentionHours: number;
  tempFileRetentionHours: number;
  autoCleanupEnabled: boolean;
  cleanupIntervalHours: number;
  nodeMemoryLimit: number;
  jobTimeoutMs: number;
  jobRetryAttempts: number;
  jobStatusPollingIntervalMs: number;
  processingModePollingIntervalMs: number;
  processingModeMaxPollingIntervalMs: number;
  maxPollingAttempts: number;
  enableAdaptivePolling: boolean;
}

export interface SystemStatus {
  logs: { 
    size: string; 
    lines: number; 
    errorSize: string; 
  };
  memory: { 
    used: number; 
    total: number; 
    percentage: number; 
  };
  database: { 
    collections: number; 
    totalSize: string; 
    documents: number; 
  };
  cache: { 
    connected: boolean; 
    keys: number; 
    memory: string; 
  };
  disk: { 
    used: string; 
    available: string; 
    percentage: number; 
  };
}

export interface SchedulerStates {
  images: boolean;
  logs: boolean;
  cache: boolean;
  database: boolean;
  memory: boolean;
}

export interface SchedulerInfo {
  [key: string]: { 
    active: boolean; 
    nextRun?: string; 
    schedule?: string 
  };
}

export type CleanupType = 'images' | 'logs' | 'cache' | 'database' | 'memory'; 