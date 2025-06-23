import { IsString, IsBoolean, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SchedulerTaskType {
  IMAGES = 'images',
  LOGS = 'logs',
  CACHE = 'cache',
  DATABASE = 'database',
  MEMORY = 'memory',
  FILES = 'files',
}

export class CreateSchedulerConfigDto {
  @IsEnum(SchedulerTaskType)
  @ApiProperty({
    description: 'Type of scheduled task',
    enum: SchedulerTaskType,
    example: SchedulerTaskType.IMAGES,
  })
  type: SchedulerTaskType;

  @IsBoolean()
  @ApiProperty({
    description: 'Whether the scheduled task is enabled',
    example: true,
  })
  enabled: boolean;

  @IsNumber()
  @Min(0)
  @Max(23)
  @ApiProperty({
    description: 'Hour to run the task (0-23)',
    minimum: 0,
    maximum: 23,
    example: 2,
  })
  hour: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  @ApiProperty({
    description: 'Minute to run the task (0-59)',
    minimum: 0,
    maximum: 59,
    example: 30,
  })
  minute: number;
}

export class UpdateSchedulerConfigDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether the scheduled task is enabled',
    example: true,
  })
  enabled?: boolean;

  @IsNumber()
  @Min(0)
  @Max(23)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Hour to run the task (0-23)',
    minimum: 0,
    maximum: 23,
    example: 2,
  })
  hour?: number;

  @IsNumber()
  @Min(0)
  @Max(59)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Minute to run the task (0-59)',
    minimum: 0,
    maximum: 59,
    example: 30,
  })
  minute?: number;
}

export class SchedulerConfigResponseDto {
  @ApiProperty({
    description: 'Scheduler configuration ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Type of scheduled task',
    enum: SchedulerTaskType,
    example: SchedulerTaskType.IMAGES,
  })
  type: SchedulerTaskType;

  @ApiProperty({
    description: 'Whether the scheduled task is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Hour to run the task (0-23)',
    minimum: 0,
    maximum: 23,
    example: 2,
  })
  hour: number;

  @ApiProperty({
    description: 'Minute to run the task (0-59)',
    minimum: 0,
    maximum: 59,
    example: 30,
  })
  minute: number;

  @ApiPropertyOptional({
    description: 'Last time the task was executed',
    example: '2024-01-15T02:30:00.000Z',
  })
  lastRun?: Date;

  @ApiPropertyOptional({
    description: 'Next scheduled execution time',
    example: '2024-01-16T02:30:00.000Z',
  })
  nextRun?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class SchedulerStatusDto {
  @ApiProperty({
    description: 'Overall scheduler status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Number of enabled tasks',
    example: 3,
  })
  enabledTasks: number;

  @ApiProperty({
    description: 'Number of disabled tasks',
    example: 2,
  })
  disabledTasks: number;

  @ApiProperty({
    description: 'Next scheduled task execution',
    example: '2024-01-16T02:30:00.000Z',
  })
  nextExecution?: Date;

  @ApiProperty({
    description: 'Last task execution',
    example: '2024-01-15T02:30:00.000Z',
  })
  lastExecution?: Date;

  @ApiProperty({
    description: 'List of all scheduler configurations',
    type: [SchedulerConfigResponseDto],
  })
  tasks: SchedulerConfigResponseDto[];
} 