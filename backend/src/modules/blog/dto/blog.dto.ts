import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsNumber, MinLength, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateBlogDto {
  @ApiProperty({
    description: 'Blog post title',
    example: 'Getting Started with NestJS',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(100, { message: 'Title cannot be more than 100 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Blog post slug (auto-generated if not provided)',
    example: 'getting-started-with-nestjs',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({
    description: 'Blog post excerpt/summary',
    example: 'Learn how to build scalable Node.js applications with NestJS framework.',
    maxLength: 300,
  })
  @IsString()
  @MinLength(1, { message: 'Excerpt is required' })
  @MaxLength(300, { message: 'Excerpt cannot be more than 300 characters' })
  excerpt: string;

  @ApiProperty({
    description: 'Blog post content (HTML/Markdown)',
    example: '<p>NestJS is a progressive Node.js framework...</p>',
  })
  @IsString()
  @MinLength(1, { message: 'Content is required' })
  content: string;

  @ApiPropertyOptional({
    description: 'Publication date',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Blog post status',
    enum: ['published', 'draft', 'scheduled'],
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['published', 'draft', 'scheduled'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Scheduled publish date (required if status is scheduled)',
    example: '2024-01-20T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledPublishDate?: string;

  @ApiProperty({
    description: 'Blog post category',
    example: 'Technology',
  })
  @IsString()
  @MinLength(1, { message: 'Category is required' })
  category: string;

  @ApiPropertyOptional({
    description: 'Blog post tags',
    example: ['nestjs', 'nodejs', 'backend', 'typescript'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Featured image URL',
    example: '/uploads/blog-featured-image.jpg',
  })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  // SEO fields
  @ApiPropertyOptional({
    description: 'SEO meta title',
    example: 'Getting Started with NestJS - Complete Guide',
    maxLength: 70,
  })
  @IsOptional()
  @IsString()
  @MaxLength(70, { message: 'Meta title cannot be more than 70 characters' })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description',
    example: 'Learn NestJS framework from scratch with practical examples and best practices.',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Meta description cannot be more than 160 characters' })
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO meta keywords',
    example: ['nestjs tutorial', 'nodejs framework', 'typescript backend'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Canonical URL',
    example: 'https://example.com/blog/getting-started-with-nestjs',
  })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiPropertyOptional({
    description: 'Open Graph image URL',
    example: '/uploads/blog-og-image.jpg',
  })
  @IsOptional()
  @IsString()
  ogImage?: string;

  // Comment settings
  @ApiPropertyOptional({
    description: 'Enable comments for this blog post',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  commentsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Require approval for comments',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requireCommentApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Limit comments per IP address',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  limitCommentsPerIp?: boolean;
}

export class UpdateBlogDto {
  @ApiPropertyOptional({
    description: 'Blog post title',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title cannot be more than 100 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Blog post slug',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Blog post excerpt/summary',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Excerpt cannot be more than 300 characters' })
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'Blog post content (HTML/Markdown)',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Publication date',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Blog post status',
    enum: ['published', 'draft', 'scheduled'],
  })
  @IsOptional()
  @IsEnum(['published', 'draft', 'scheduled'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Scheduled publish date',
  })
  @IsOptional()
  @IsDateString()
  scheduledPublishDate?: string;

  @ApiPropertyOptional({
    description: 'Blog post category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Blog post tags',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Featured image URL',
  })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiPropertyOptional({
    description: 'SEO meta title',
    maxLength: 70,
  })
  @IsOptional()
  @IsString()
  @MaxLength(70, { message: 'Meta title cannot be more than 70 characters' })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Meta description cannot be more than 160 characters' })
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO meta keywords',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Canonical URL',
  })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiPropertyOptional({
    description: 'Open Graph image URL',
  })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional({
    description: 'Enable comments for this blog post',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  commentsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Require approval for comments',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requireCommentApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Limit comments per IP address',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  limitCommentsPerIp?: boolean;
}

export class BlogQueryDto {
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
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['published', 'draft', 'scheduled'],
  })
  @IsOptional()
  @IsEnum(['published', 'draft', 'scheduled'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Search in title, content, and excerpt',
    example: 'nestjs tutorial',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag',
    example: 'nestjs',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Filter by slug',
    example: 'getting-started-with-nestjs',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BlogResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Blog post data',
  })
  data: any;
}

export class BlogsListResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Total number of blog posts',
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
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Array of blog posts',
  })
  data: any[];
}

export class LikeBlogDto {
  @ApiProperty({
    description: 'Like or unlike the blog post',
    example: true,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  liked: boolean;
} 