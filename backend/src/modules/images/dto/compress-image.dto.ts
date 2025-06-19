import { IsOptional, IsInt, Min, Max, IsUrl, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompressImageDto {
  @ApiPropertyOptional({
    description: 'Image quality (1-100)',
    minimum: 1,
    maximum: 100,
    default: 80,
    example: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  quality?: number = 80;

  @ApiPropertyOptional({
    description: 'Webhook URL for job completion notification',
    example: 'https://example.com/webhook',
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}

export class CompressResultDto {
  @ApiProperty({
    description: 'Job ID for tracking',
    example: 'job_123456789',
  })
  jobId: string;

  @ApiProperty({
    description: 'Job status',
    example: 'queued',
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Status message',
    example: 'Image compression job queued successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Download URL (available when completed)',
    example: '/api/images/download/tool-compressed-abc123.jpg',
  })
  downloadUrl?: string;

  @ApiPropertyOptional({
    description: 'Original file size in bytes',
    example: 1048576,
  })
  originalSize?: number;

  @ApiPropertyOptional({
    description: 'Compressed file size in bytes',
    example: 524288,
  })
  compressedSize?: number;

  @ApiPropertyOptional({
    description: 'Compression ratio percentage',
    example: 50,
  })
  compressionRatio?: number;

  @ApiPropertyOptional({
    description: 'Original filename',
    example: 'my-image.jpg',
  })
  originalFilename?: string;

  @ApiPropertyOptional({
    description: 'Generated filename',
    example: 'tool-compressed-abc123.jpg',
  })
  filename?: string;
}

export class JobStatusDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'job_123456789',
  })
  id: string;

  @ApiProperty({
    description: 'Job state',
    example: 'completed',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed'],
  })
  state: string;

  @ApiProperty({
    description: 'Job progress percentage',
    example: 100,
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiPropertyOptional({
    description: 'Job result (when completed)',
  })
  result?: any;

  @ApiPropertyOptional({
    description: 'Error message (when failed)',
    example: 'Image processing failed',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Queue position (when waiting)',
    example: 3,
  })
  queuePosition?: number;

  @ApiPropertyOptional({
    description: 'Estimated wait time',
    example: '2 minutes',
  })
  estimatedWaitTime?: string;
}

// Job data interfaces (same as original)
export interface CompressJobData {
  filePath: string;
  quality: number;
  originalFilename: string;
  originalSize: number;
  webhookUrl?: string;
} 