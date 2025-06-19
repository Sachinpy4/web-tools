import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBackupDto {
  @ApiPropertyOptional({
    description: 'Backup description',
    example: 'Weekly scheduled backup',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot be more than 1000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Backup type',
    example: 'full',
    enum: ['full', 'incremental', 'selective'],
    default: 'full',
  })
  @IsOptional()
  @IsEnum(['full', 'incremental', 'selective'])
  type?: 'full' | 'incremental' | 'selective';

  @ApiPropertyOptional({
    description: 'Collections to include in backup (empty means all)',
    example: ['users', 'blogposts', 'images'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];

  @ApiPropertyOptional({
    description: 'Whether to compress the backup',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;
}

export class RestoreBackupDto {
  @ApiProperty({
    description: 'Backup ID to restore from',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  backupId: string;

  @ApiPropertyOptional({
    description: 'Collections to restore (empty means all from backup)',
    example: ['users', 'blogposts'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collections?: string[];

  @ApiPropertyOptional({
    description: 'Whether to overwrite existing data',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to create a safety backup before restore',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  createSafetyBackup?: boolean;
}

export class BackupFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by backup type',
    example: 'full',
    enum: ['full', 'incremental', 'selective'],
  })
  @IsOptional()
  @IsEnum(['full', 'incremental', 'selective'])
  type?: 'full' | 'incremental' | 'selective';

  @ApiPropertyOptional({
    description: 'Filter by backup status',
    example: 'completed',
    enum: ['pending', 'in-progress', 'completed', 'failed'],
  })
  @IsOptional()
  @IsEnum(['pending', 'in-progress', 'completed', 'failed'])
  status?: 'pending' | 'in-progress' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Filter by date from (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date to (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cache busting timestamp (ignored)',
    example: 1750191720511,
  })
  @IsOptional()
  _t?: number;
}

export class BackupResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Backup data',
    example: {
      _id: '507f1f77bcf86cd799439011',
      filename: 'backup_2024-01-15_10-30-00.gz',
      filepath: '/backups/backup_2024-01-15_10-30-00.gz',
      size: 1048576,
      sizeFormatted: '1.0 MB',
      type: 'full',
      status: 'completed',
      description: 'Weekly scheduled backup',
      startedAt: '2024-01-15T10:30:00.000Z',
      completedAt: '2024-01-15T10:35:00.000Z',
      duration: 300000,
      durationFormatted: '5.0m',
      metadata: {
        collections: ['users', 'blogposts', 'images'],
        totalDocuments: 1500,
        totalSize: 2097152,
        compression: 'gzip',
      },
      isRestored: false,
      isDeleted: false,
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:35:00.000Z',
    },
  })
  data: any;
}

export class BackupListResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Array of backups',
    type: [Object],
  })
  data: any[];

  @ApiPropertyOptional({
    description: 'Pagination metadata',
    example: {
      total: 50,
      page: 1,
      limit: 20,
      pages: 3,
    },
  })
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export class BackupStatsResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Backup statistics',
    example: {
      total: 50,
      completed: 45,
      failed: 3,
      inProgress: 1,
      pending: 1,
      totalSize: 104857600,
      totalSizeFormatted: '100.0 MB',
      averageSize: 2097152,
      averageSizeFormatted: '2.0 MB',
      oldestBackup: '2024-01-01T00:00:00.000Z',
      newestBackup: '2024-01-15T10:30:00.000Z',
      typeDistribution: {
        full: 30,
        incremental: 15,
        selective: 5,
      },
    },
  })
  data: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    pending: number;
    totalSize: number;
    totalSizeFormatted: string;
    averageSize: number;
    averageSizeFormatted: string;
    oldestBackup: string;
    newestBackup: string;
    typeDistribution: {
      full: number;
      incremental: number;
      selective: number;
    };
  };
} 