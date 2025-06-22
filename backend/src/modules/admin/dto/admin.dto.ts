import { IsNumber, IsBoolean, IsOptional, Min, Max, IsString, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemSettingsDto {
  // Worker & Processing Settings
  @ApiPropertyOptional({
    description: 'Number of concurrent workers',
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Worker concurrency must be at least 1' })
  @Max(100, { message: 'Worker concurrency cannot exceed 100' })
  workerConcurrency?: number;

  @ApiPropertyOptional({
    description: 'Maximum load threshold (0.1-1.0)',
    example: 0.9,
    minimum: 0.1,
    maximum: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Load threshold must be at least 0.1' })
  @Max(1.0, { message: 'Load threshold cannot exceed 1.0' })
  maxLoadThreshold?: number;

  @ApiPropertyOptional({
    description: 'Maximum memory usage percentage (50-99%)',
    example: 90,
    minimum: 50,
    maximum: 99,
  })
  @IsOptional()
  @IsNumber()
  @Min(50, { message: 'Memory usage threshold must be at least 50%' })
  @Max(99, { message: 'Memory usage threshold cannot exceed 99%' })
  maxMemoryUsagePercent?: number;

  @ApiPropertyOptional({
    description: 'Degradation cooldown time in milliseconds',
    example: 15000,
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000, { message: 'Cooldown must be at least 1 second' })
  @Max(300000, { message: 'Cooldown cannot exceed 5 minutes' })
  degradationCooldownMs?: number;

  // Rate Limiting Settings
  @ApiPropertyOptional({
    description: 'Maximum image processing requests per window',
    example: 50,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Must allow at least 1 request' })
  @Max(1000, { message: 'Cannot exceed 1000 requests per window' })
  imageProcessingMaxRequests?: number;

  @ApiPropertyOptional({
    description: 'Image processing rate limit window in milliseconds',
    example: 300000,
    minimum: 60000,
    maximum: 3600000,
  })
  @IsOptional()
  @IsNumber()
  @Min(60000, { message: 'Window must be at least 1 minute' })
  @Max(3600000, { message: 'Window cannot exceed 1 hour' })
  imageProcessingWindowMs?: number;

  @ApiPropertyOptional({
    description: 'Maximum batch operation requests per window',
    example: 15,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Must allow at least 1 batch operation' })
  @Max(100, { message: 'Cannot exceed 100 batch operations per window' })
  batchOperationMaxRequests?: number;

  @ApiPropertyOptional({
    description: 'Batch operation rate limit window in milliseconds',
    example: 600000,
    minimum: 60000,
    maximum: 3600000,
  })
  @IsOptional()
  @IsNumber()
  @Min(60000, { message: 'Window must be at least 1 minute' })
  @Max(3600000, { message: 'Window cannot exceed 1 hour' })
  batchOperationWindowMs?: number;

  @ApiPropertyOptional({
    description: 'Maximum API requests per window',
    example: 1000,
    minimum: 10,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10, { message: 'Must allow at least 10 API requests' })
  @Max(10000, { message: 'Cannot exceed 10000 API requests per window' })
  apiMaxRequests?: number;

  @ApiPropertyOptional({
    description: 'API rate limit window in milliseconds',
    example: 900000,
    minimum: 60000,
    maximum: 3600000,
  })
  @IsOptional()
  @IsNumber()
  @Min(60000, { message: 'Window must be at least 1 minute' })
  @Max(3600000, { message: 'Window cannot exceed 1 hour' })
  apiWindowMs?: number;

  // File Upload Settings
  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 52428800,
    minimum: 1048576,
    maximum: 104857600,
  })
  @IsOptional()
  @IsNumber()
  @Min(1048576, { message: 'Minimum file size is 1MB' })
  @Max(104857600, { message: 'Maximum file size is 100MB' })
  maxFileSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of files per upload',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Must allow at least 1 file' })
  @Max(50, { message: 'Cannot exceed 50 files' })
  maxFiles?: number;

  // Cleanup Settings
  @ApiPropertyOptional({
    description: 'Processed file retention time in hours',
    example: 48,
    minimum: 1,
    maximum: 720,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Must retain files for at least 1 hour' })
  @Max(720, { message: 'Cannot retain files for more than 30 days' })
  processedFileRetentionHours?: number;

  @ApiPropertyOptional({
    description: 'Archive file retention time in hours',
    example: 24,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Must retain archives for at least 1 hour' })
  @Max(168, { message: 'Cannot retain archives for more than 7 days' })
  archiveFileRetentionHours?: number;

  @ApiPropertyOptional({
    description: 'Temporary file retention time in hours',
    example: 2,
    minimum: 0.5,
    maximum: 48,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5, { message: 'Must retain temp files for at least 30 minutes' })
  @Max(48, { message: 'Cannot retain temp files for more than 2 days' })
  tempFileRetentionHours?: number;

  @ApiPropertyOptional({
    description: 'Enable automatic cleanup',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCleanupEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Cleanup interval in hours',
    example: 6,
    minimum: 1,
    maximum: 72,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Cleanup interval must be at least 1 hour' })
  @Max(72, { message: 'Cleanup interval cannot exceed 72 hours' })
  cleanupIntervalHours?: number;

  // System Settings
  @ApiPropertyOptional({
    description: 'Node.js memory limit in MB',
    example: 4096,
    minimum: 1024,
    maximum: 16384,
  })
  @IsOptional()
  @IsNumber()
  @Min(1024, { message: 'Memory limit must be at least 1GB' })
  @Max(16384, { message: 'Memory limit cannot exceed 16GB' })
  nodeMemoryLimit?: number;

  @ApiPropertyOptional({
    description: 'Job timeout in milliseconds',
    example: 180000,
    minimum: 30000,
    maximum: 600000,
  })
  @IsOptional()
  @IsNumber()
  @Min(30000, { message: 'Job timeout must be at least 30 seconds' })
  @Max(600000, { message: 'Job timeout cannot exceed 10 minutes' })
  jobTimeoutMs?: number;

  @ApiPropertyOptional({
    description: 'Number of job retry attempts',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Must allow at least 1 attempt' })
  @Max(10, { message: 'Cannot exceed 10 retry attempts' })
  jobRetryAttempts?: number;

  // Polling Configuration Settings
  @ApiPropertyOptional({
    description: 'Job status polling interval in milliseconds',
    example: 2000,
    minimum: 500,
    maximum: 30000,
  })
  @IsOptional()
  @IsNumber()
  @Min(500, { message: 'Job polling interval must be at least 500ms' })
  @Max(30000, { message: 'Job polling interval cannot exceed 30 seconds' })
  jobStatusPollingIntervalMs?: number;

  @ApiPropertyOptional({
    description: 'Processing mode initial polling interval in milliseconds',
    example: 30000,
    minimum: 5000,
    maximum: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(5000, { message: 'Processing mode polling interval must be at least 5 seconds' })
  @Max(300000, { message: 'Processing mode polling interval cannot exceed 5 minutes' })
  processingModePollingIntervalMs?: number;

  @ApiPropertyOptional({
    description: 'Processing mode maximum polling interval in milliseconds',
    example: 300000,
    minimum: 30000,
    maximum: 900000,
  })
  @IsOptional()
  @IsNumber()
  @Min(30000, { message: 'Processing mode max interval must be at least 30 seconds' })
  @Max(900000, { message: 'Processing mode max interval cannot exceed 15 minutes' })
  processingModeMaxPollingIntervalMs?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of polling attempts before giving up',
    example: 60,
    minimum: 10,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(10, { message: 'Must allow at least 10 polling attempts' })
  @Max(300, { message: 'Cannot exceed 300 polling attempts' })
  maxPollingAttempts?: number;

  @ApiPropertyOptional({
    description: 'Enable adaptive polling (dynamic interval adjustment)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enableAdaptivePolling?: boolean;
}

export class CleanupOptionsDto {
  @ApiProperty({
    description: 'Type of cleanup to perform',
    example: 'images',
    enum: ['images', 'logs', 'cache', 'database', 'memory']
  })
  @IsEnum(['images', 'logs', 'cache', 'database', 'memory'])
  type: 'images' | 'logs' | 'cache' | 'database' | 'memory';

  @ApiPropertyOptional({
    description: 'Set up automatic cleanup scheduling',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  setupAutoCleanup?: boolean;

  @ApiPropertyOptional({
    description: 'Run cleanup in emergency mode (more aggressive)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  emergencyMode?: boolean;
}

export class SystemSettingsResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'System settings data',
  })
  data: any;
}

export class SystemStatsResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'System statistics',
    example: {
      system: {
        uptime: 86400,
        platform: 'linux',
        nodeVersion: 'v18.17.0',
        memoryUsage: {
          rss: 52428800,
          heapUsed: 41943040,
          heapTotal: 46137344,
          external: 2097152
        },
        cpuUsage: 15.5
      },
      database: {
        connected: true,
        collections: 8,
        totalDocuments: 1250
      },
      redis: {
        connected: true,
        usedMemory: 1048576
      }
    },
  })
  data: any;
}

export class CleanupResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Cleanup results',
    example: {
      cleanup: {
        processedFiles: {
          deleted: 15,
          errors: 0,
          size: 52428800
        },
        tempFiles: {
          deleted: 8,
          errors: 0,
          size: 10485760
        }
      },
      scheduledTask: {
        success: true,
        message: 'Automatic cleanup scheduled'
      }
    },
  })
  data: any;
}

export class DatabaseOperationDto {
  @ApiProperty({
    description: 'Database operation type',
    example: 'compact',
    enum: ['compact', 'repair', 'reindex']
  })
  @IsString()
  operation: 'compact' | 'repair' | 'reindex';

  @ApiPropertyOptional({
    description: 'Collections to operate on (empty for all)',
    type: [String],
    example: ['blogs', 'users'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];
} 