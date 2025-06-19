import { IsString, IsOptional, IsBoolean, IsEmail, IsMongoId, IsNumber, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Commenter name',
    example: 'John Doe',
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(50, { message: 'Name cannot be more than 50 characters' })
  name: string;

  @ApiProperty({
    description: 'Commenter email',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Comment text',
    example: 'Great article! Thanks for sharing.',
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1, { message: 'Comment text is required' })
  @MaxLength(1000, { message: 'Comment cannot be more than 1000 characters' })
  text: string;

  @ApiPropertyOptional({
    description: 'Parent comment ID (for replies)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  parent?: string;
}

export class UpdateCommentDto {
  @ApiPropertyOptional({
    description: 'Comment text',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Comment cannot be more than 1000 characters' })
  text?: string;

  @ApiPropertyOptional({
    description: 'Comment approval status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  approved?: boolean;
}

export class CommentQueryDto {
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
    description: 'Filter by blog post ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  blog?: string;

  @ApiPropertyOptional({
    description: 'Filter by approval status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  user?: string;

  @ApiPropertyOptional({
    description: 'Filter by parent comment ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  parent?: string;

  @ApiPropertyOptional({
    description: 'Get only top-level comments (no parent)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'false')
  @IsBoolean()
  parentExists?: boolean;

  @ApiPropertyOptional({
    description: 'Search in comment text, name, or email',
    example: 'great article',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class BlogCommentQueryDto {
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
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;
}

export class CommentResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Comment data',
  })
  data: any;
}

export class CommentsListResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Total number of comments',
    example: 25,
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
    description: 'Array of comments',
  })
  data: any[];
}

export class ApproveCommentDto {
  @ApiProperty({
    description: 'Approve or disapprove the comment',
    example: true,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  approved: boolean;
} 