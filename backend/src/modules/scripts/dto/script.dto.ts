import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScriptDto {
  @ApiProperty({
    description: 'Script name for identification',
    example: 'Google Analytics 4',
  })
  @IsString()
  @MaxLength(100, { message: 'Name cannot be more than 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Script description',
    example: 'Google Analytics 4 tracking script for website analytics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot be more than 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Script content (JavaScript or HTML with script tags)',
    example: '<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Where to place the script in the HTML document',
    example: 'head',
    enum: ['head', 'body', 'footer'],
  })
  @IsEnum(['head', 'body', 'footer'])
  placement: 'head' | 'body' | 'footer';

  @ApiProperty({
    description: 'Script platform/service type',
    example: 'Google Analytics',
    enum: [
      'Google Analytics',
      'Google Tag Manager',
      'Facebook Pixel',
      'Google Ads',
      'LinkedIn Insight',
      'Twitter Pixel',
      'TikTok Pixel',
      'Hotjar',
      'Mixpanel',
      'Custom',
    ],
  })
  @IsEnum([
    'Google Analytics',
    'Google Tag Manager',
    'Facebook Pixel',
    'Google Ads',
    'LinkedIn Insight',
    'Twitter Pixel',
    'TikTok Pixel',
    'Hotjar',
    'Mixpanel',
    'Custom',
  ])
  platform: string;

  @ApiPropertyOptional({
    description: 'Script priority (1-1000, lower numbers load first)',
    example: 100,
    minimum: 1,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Priority must be at least 1' })
  @Max(1000, { message: 'Priority cannot exceed 1000' })
  priority?: number;

  @ApiPropertyOptional({
    description: 'Target pages (empty array means all public pages)',
    example: ['/', '/blog', '/image/compress'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPages?: string[];

  @ApiPropertyOptional({
    description: 'Pages to exclude from script loading',
    example: ['/admin', '/dashboard', '/api'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePages?: string[];

  @ApiPropertyOptional({
    description: 'Whether the script is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScriptDto {
  @ApiPropertyOptional({
    description: 'Script name for identification',
    example: 'Google Analytics 4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name cannot be more than 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Script description',
    example: 'Google Analytics 4 tracking script for website analytics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot be more than 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Script content (JavaScript or HTML with script tags)',
    example: '<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Where to place the script in the HTML document',
    example: 'head',
    enum: ['head', 'body', 'footer'],
  })
  @IsOptional()
  @IsEnum(['head', 'body', 'footer'])
  placement?: 'head' | 'body' | 'footer';

  @ApiPropertyOptional({
    description: 'Script platform/service type',
    example: 'Google Analytics',
    enum: [
      'Google Analytics',
      'Google Tag Manager',
      'Facebook Pixel',
      'Google Ads',
      'LinkedIn Insight',
      'Twitter Pixel',
      'TikTok Pixel',
      'Hotjar',
      'Mixpanel',
      'Custom',
    ],
  })
  @IsOptional()
  @IsEnum([
    'Google Analytics',
    'Google Tag Manager',
    'Facebook Pixel',
    'Google Ads',
    'LinkedIn Insight',
    'Twitter Pixel',
    'TikTok Pixel',
    'Hotjar',
    'Mixpanel',
    'Custom',
  ])
  platform?: string;

  @ApiPropertyOptional({
    description: 'Script priority (1-1000, lower numbers load first)',
    example: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Priority must be at least 1' })
  @Max(1000, { message: 'Priority cannot exceed 1000' })
  priority?: number;

  @ApiPropertyOptional({
    description: 'Target pages (empty array means all public pages)',
    example: ['/', '/blog', '/image/compress'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPages?: string[];

  @ApiPropertyOptional({
    description: 'Pages to exclude from script loading',
    example: ['/admin', '/dashboard', '/api'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePages?: string[];

  @ApiPropertyOptional({
    description: 'Whether the script is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetScriptsForPageDto {
  @ApiPropertyOptional({
    description: 'Page pathname to get scripts for',
    example: '/image/compress',
  })
  @IsOptional()
  @IsString()
  pathname?: string;

  @ApiPropertyOptional({
    description: 'Script placement filter',
    example: 'head',
    enum: ['head', 'body', 'footer'],
  })
  @IsOptional()
  @IsEnum(['head', 'body', 'footer'])
  placement?: 'head' | 'body' | 'footer';
}

export class ScriptResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Script data',
    example: {
      _id: '507f1f77bcf86cd799439011',
      name: 'Google Analytics 4',
      description: 'Google Analytics 4 tracking script',
      content: '<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>',
      placement: 'head',
      platform: 'Google Analytics',
      priority: 100,
      targetPages: [],
      excludePages: ['/admin', '/dashboard'],
      isActive: true,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
  })
  data: any;
}

export class ScriptsListResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Array of scripts',
    type: [Object],
  })
  data: any[];
} 