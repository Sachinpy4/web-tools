import { IsString, IsOptional, IsNumber, IsArray, IsMongoId, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class UploadMediaDto {
  @ApiPropertyOptional({
    description: 'Alternative text for the media (string for single file, array for multiple files)',
    example: 'Blog header image showing mountains',
    oneOf: [
      { type: 'string', maxLength: 200 },
      { type: 'array', items: { type: 'string', maxLength: 200 } }
    ],
  })
  @IsOptional()
  alt?: string | string[];

  @ApiPropertyOptional({
    description: 'Title for the media',
    example: 'Mountain Landscape',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title cannot be more than 100 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the media',
    example: 'Beautiful mountain landscape captured at sunrise',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot be more than 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags for the media (comma-separated)',
    example: 'nature,mountains,landscape,sunrise',
  })
  @IsOptional()
  @IsString()
  tags?: string;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({
    description: 'Alternative text for the media',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Alt text cannot be more than 200 characters' })
  alt?: string;

  @ApiPropertyOptional({
    description: 'Title for the media',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title cannot be more than 100 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the media',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot be more than 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags for the media',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MediaQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by media type (image, video, audio, document)',
    example: 'image',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Search in filename, alt text, title, description, or tags',
    example: 'mountain landscape',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific tag',
    example: 'nature',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Filter by uploader user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  uploadedBy?: string;

  @ApiPropertyOptional({
    description: 'Sort by field (createdAt, size, uses, originalname)',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc, desc)',
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class MediaResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Media data',
  })
  data: any;
}

export class MediaListResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Total number of media items',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  pages: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Array of media items',
  })
  data: any[];
}

export class MediaStatsResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Media statistics',
    example: {
      totalFiles: 150,
      totalSizeBytes: 52428800,
      totalSizeFormatted: '50.00 MB',
      fileTypes: {
        'image/jpeg': 80,
        'image/png': 45,
        'image/gif': 20,
        'application/pdf': 5
      },
      uploadsThisMonth: 25,
      mostUsedFiles: []
    },
  })
  data: any;
}

export class BulkDeleteDto {
  @ApiProperty({
    description: 'Array of media item IDs to delete',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  mediaIds: string[];
}

export class BulkUpdateDto {
  @ApiProperty({
    description: 'Array of media item IDs to update',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  mediaIds: string[];

  @ApiPropertyOptional({
    description: 'Tags to add to selected media items',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addTags?: string[];

  @ApiPropertyOptional({
    description: 'Tags to remove from selected media items',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeTags?: string[];
} 