import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageSeoDto {
  @ApiProperty({
    description: 'Page path (e.g., /, /blog, /image/compress)',
    example: '/image/compress',
  })
  @IsString()
  pagePath: string;

  @ApiProperty({
    description: 'Type of page',
    example: 'tool',
    enum: ['homepage', 'blog-listing', 'tool', 'about', 'custom'],
  })
  @IsEnum(['homepage', 'blog-listing', 'tool', 'about', 'custom'])
  pageType: 'homepage' | 'blog-listing' | 'tool' | 'about' | 'custom';

  @ApiProperty({
    description: 'Human readable page name for admin',
    example: 'Image Compression Tool',
  })
  @IsString()
  pageName: string;

  @ApiProperty({
    description: 'SEO meta title (max 70 characters)',
    example: 'Free Image Compression Tool - Reduce Image Size Online',
  })
  @IsString()
  @MaxLength(70, { message: 'Meta title cannot be more than 70 characters' })
  metaTitle: string;

  @ApiProperty({
    description: 'SEO meta description (max 160 characters)',
    example: 'Compress your images without losing quality. Our free online tool reduces image file size by up to 80% while maintaining visual quality.',
  })
  @IsString()
  @MaxLength(160, { message: 'Meta description cannot be more than 160 characters' })
  metaDescription: string;

  @ApiPropertyOptional({
    description: 'SEO keywords array',
    example: ['image compression', 'compress images online', 'reduce image size'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Canonical URL for the page',
    example: 'https://toolscandy.com/image/compress',
  })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({
    description: 'Open Graph image URL',
    example: 'https://toolscandy.com/images/og-compress.jpg',
  })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional({
    description: 'Open Graph type',
    example: 'website',
    enum: ['website', 'article', 'product', 'profile'],
    default: 'website',
  })
  @IsOptional()
  @IsEnum(['website', 'article', 'product', 'profile'])
  ogType?: string;

  @ApiPropertyOptional({
    description: 'Twitter card type',
    example: 'summary_large_image',
    enum: ['summary', 'summary_large_image', 'app', 'player'],
    default: 'summary_large_image',
  })
  @IsOptional()
  @IsEnum(['summary', 'summary_large_image', 'app', 'player'])
  twitterCard?: string;

  @ApiPropertyOptional({
    description: 'Priority for ordering in admin (higher = more important)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdatePageSeoDto {
  @ApiPropertyOptional({
    description: 'Page path (e.g., /, /blog, /image/compress)',
    example: '/image/compress',
  })
  @IsOptional()
  @IsString()
  pagePath?: string;

  @ApiPropertyOptional({
    description: 'Type of page',
    example: 'tool',
    enum: ['homepage', 'blog-listing', 'tool', 'about', 'custom'],
  })
  @IsOptional()
  @IsEnum(['homepage', 'blog-listing', 'tool', 'about', 'custom'])
  pageType?: 'homepage' | 'blog-listing' | 'tool' | 'about' | 'custom';

  @ApiPropertyOptional({
    description: 'Human readable page name for admin',
    example: 'Image Compression Tool',
  })
  @IsOptional()
  @IsString()
  pageName?: string;

  @ApiPropertyOptional({
    description: 'SEO meta title (max 70 characters)',
    example: 'Free Image Compression Tool - Reduce Image Size Online',
  })
  @IsOptional()
  @IsString()
  @MaxLength(70, { message: 'Meta title cannot be more than 70 characters' })
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description (max 160 characters)',
    example: 'Compress your images without losing quality. Our free online tool reduces image file size by up to 80% while maintaining visual quality.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Meta description cannot be more than 160 characters' })
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO keywords array',
    example: ['image compression', 'compress images online', 'reduce image size'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Canonical URL for the page',
    example: 'https://toolscandy.com/image/compress',
  })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({
    description: 'Open Graph image URL',
    example: 'https://toolscandy.com/images/og-compress.jpg',
  })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional({
    description: 'Open Graph type',
    example: 'website',
    enum: ['website', 'article', 'product', 'profile'],
  })
  @IsOptional()
  @IsEnum(['website', 'article', 'product', 'profile'])
  ogType?: string;

  @ApiPropertyOptional({
    description: 'Twitter card type',
    example: 'summary_large_image',
    enum: ['summary', 'summary_large_image', 'app', 'player'],
  })
  @IsOptional()
  @IsEnum(['summary', 'summary_large_image', 'app', 'player'])
  twitterCard?: string;

  @ApiPropertyOptional({
    description: 'Whether the SEO settings are active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Priority for ordering in admin (higher = more important)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class PageSeoResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'SEO data for the page',
    example: {
      metaTitle: 'Free Image Compression Tool - Reduce Image Size Online',
      metaDescription: 'Compress your images without losing quality. Our free online tool reduces image file size by up to 80% while maintaining visual quality.',
      metaKeywords: ['image compression', 'compress images online', 'reduce image size'],
      canonicalUrl: 'https://toolscandy.com/image/compress',
      ogImage: 'https://toolscandy.com/images/og-compress.jpg',
      ogType: 'website',
      twitterCard: 'summary_large_image',
    },
  })
  data: any;
}

export class BlogSeoResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Blog SEO data with article-specific metadata',
    example: {
      metaTitle: 'How to Optimize Images for Web Performance | Web Tools Blog',
      metaDescription: 'Learn the best practices for optimizing images for web performance. Discover compression techniques, format selection, and tools to boost your site speed.',
      metaKeywords: ['image optimization', 'web performance', 'image compression'],
      canonicalUrl: 'https://toolscandy.com/blog/optimize-images-web-performance',
      ogImage: 'https://toolscandy.com/uploads/blog/optimize-images-featured.jpg',
      ogType: 'article',
      twitterCard: 'summary_large_image',
      articlePublishedTime: '2024-01-15T10:00:00.000Z',
      articleModifiedTime: '2024-01-16T14:30:00.000Z',
      articleAuthor: 'Web Tools Team',
      articleSection: 'Performance',
      articleTags: ['optimization', 'performance', 'images'],
    },
  })
  data: any;
}

export class InitializeDefaultSeoDto {
  @ApiPropertyOptional({
    description: 'Whether to overwrite existing SEO settings',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
} 