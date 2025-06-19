import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageSeo, PageSeoDocument } from '../schemas/page-seo.schema';
import { Blog, BlogDocument } from '../../blog/schemas/blog.schema';
import { CreatePageSeoDto, UpdatePageSeoDto, InitializeDefaultSeoDto } from '../dto/seo.dto';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    @InjectModel(PageSeo.name) private pageSeoModel: Model<PageSeoDocument>,
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) {}

  /**
   * Get all page SEO settings (admin endpoint)
   */
  async getAllPageSeo() {
    try {
      const pageSeos = await this.pageSeoModel
        .find({})
        .sort({ isActive: -1, priority: 1, pageName: 1 });

      return {
        status: 'success',
        count: pageSeos.length,
        data: pageSeos,
      };
    } catch (error) {
      this.logger.error('Error fetching page SEO settings:', error);
      throw new Error('Failed to fetch page SEO settings');
    }
  }

  /**
   * Get SEO settings for a specific page
   */
  async getPageSeo(pagePath: string) {
    try {
      // Handle special case for home page
      const isHomePage = pagePath === 'home';
      const pathToFind = isHomePage ? '/' : decodeURIComponent(pagePath);

      // Check if this is a blog post request
      const blogPostMatch = pathToFind.match(/^blog\/(.+)$/);

      if (blogPostMatch) {
        return await this.getBlogSeo(blogPostMatch[1]);
      }

      // Standard page SEO lookup
      let pageSeo = await this.pageSeoModel.findOne({
        pagePath: pathToFind,
        isActive: true,
      });

      // If not found, try with a leading slash added
      if (!pageSeo && !pathToFind.startsWith('/') && !isHomePage) {
        pageSeo = await this.pageSeoModel.findOne({
          pagePath: `/${pathToFind}`,
          isActive: true,
        });
      }

      if (!pageSeo) {
        throw new NotFoundException('SEO settings not found for this page');
      }

      return {
        status: 'success',
        data: pageSeo,
      };
    } catch (error) {
      this.logger.error('Error fetching page SEO:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to fetch page SEO settings');
    }
  }

  /**
   * Get blog SEO data
   */
  private async getBlogSeo(blogId: string) {
    try {
      this.logger.log(`Looking up blog SEO data for: ${blogId}`);

      // Try to find by slug first (if it's not a MongoDB ID)
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(blogId);

      let blog;
      if (!isMongoId) {
        // Try to find by slug
        blog = await this.blogModel.findOne({ slug: blogId });
      }

      // If not found by slug or if it's a MongoDB ID, try by ID
      if (!blog && isMongoId) {
        blog = await this.blogModel.findById(blogId);
      }

      if (blog) {
        this.logger.log(`Found blog post for SEO: ${blog.title} (ID: ${blog._id})`);

        // Return blog post SEO data - prioritize the admin-set fields
        return {
          status: 'success',
          data: {
            metaTitle: blog.metaTitle || `${blog.title} | Web Tools Blog`,
            metaDescription: blog.metaDescription || blog.excerpt,
            metaKeywords: blog.metaKeywords || blog.tags || [],
            canonicalUrl: blog.canonicalUrl || `https://toolscandy.com/blog/${blog.slug}`,
            ogImage: blog.ogImage || blog.featuredImage || '',
            ogType: 'article',
            twitterCard: 'summary_large_image',
            // Include article-specific metadata
            articlePublishedTime: blog.date,
            articleModifiedTime: blog.updatedAt,
            articleAuthor: typeof blog.author === 'string' ? blog.author : blog.author?.name || 'Web Tools Team',
            articleSection: blog.category,
            articleTags: blog.tags,
          },
        };
      } else {
        this.logger.warn(`Blog post not found for SEO: ${blogId}`);
        throw new NotFoundException('Blog post not found');
      }
    } catch (error) {
      this.logger.error('Error fetching blog post for SEO:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to fetch blog SEO data');
    }
  }

  /**
   * Create new page SEO settings
   */
  async createPageSeo(createPageSeoDto: CreatePageSeoDto) {
    try {
      // Check if page SEO already exists
      const existingPageSeo = await this.pageSeoModel.findOne({
        pagePath: createPageSeoDto.pagePath,
      });

      if (existingPageSeo) {
        throw new BadRequestException('SEO settings already exist for this page');
      }

      const pageSeo = await this.pageSeoModel.create({
        ...createPageSeoDto,
        metaKeywords: Array.isArray(createPageSeoDto.metaKeywords) ? createPageSeoDto.metaKeywords : [],
        ogType: createPageSeoDto.ogType || 'website',
        twitterCard: createPageSeoDto.twitterCard || 'summary_large_image',
        priority: createPageSeoDto.priority || 0,
      });

      this.logger.log(`Created SEO settings for page: ${createPageSeoDto.pagePath}`);

      return {
        status: 'success',
        data: pageSeo,
      };
    } catch (error) {
      this.logger.error('Error creating page SEO:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to create page SEO settings');
    }
  }

  /**
   * Update page SEO settings
   */
  async updatePageSeo(id: string, updatePageSeoDto: UpdatePageSeoDto) {
    try {
      const pageSeo = await this.pageSeoModel.findByIdAndUpdate(
        id,
        updatePageSeoDto,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!pageSeo) {
        throw new NotFoundException('Page SEO settings not found');
      }

      this.logger.log(`Updated SEO settings for page: ${pageSeo.pagePath}`);

      return {
        status: 'success',
        data: pageSeo,
      };
    } catch (error) {
      this.logger.error('Error updating page SEO:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to update page SEO settings');
    }
  }

  /**
   * Delete page SEO settings
   */
  async deletePageSeo(id: string) {
    try {
      const pageSeo = await this.pageSeoModel.findByIdAndDelete(id);

      if (!pageSeo) {
        throw new NotFoundException('Page SEO settings not found');
      }

      this.logger.log(`Deleted SEO settings for page: ${pageSeo.pagePath}`);

      return {
        status: 'success',
        message: 'Page SEO settings deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting page SEO:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to delete page SEO settings');
    }
  }

  /**
   * Toggle page SEO status
   */
  async togglePageSeoStatus(id: string) {
    try {
      const pageSeo = await this.pageSeoModel.findById(id);

      if (!pageSeo) {
        throw new NotFoundException('Page SEO settings not found');
      }

      pageSeo.isActive = !pageSeo.isActive;
      await pageSeo.save();

      this.logger.log(`Toggled SEO status for page: ${pageSeo.pagePath} to ${pageSeo.isActive}`);

      return {
        status: 'success',
        data: pageSeo,
      };
    } catch (error) {
      this.logger.error('Error toggling page SEO status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to toggle page SEO status');
    }
  }

  /**
   * Initialize default SEO settings for common pages
   */
  async initializeDefaultSeo(initializeDefaultSeoDto: InitializeDefaultSeoDto = {}) {
    try {
      const { overwrite = false } = initializeDefaultSeoDto;

      const defaultPages = [
        {
          pagePath: '/',
          pageType: 'homepage' as const,
          pageName: 'Homepage',
          metaTitle: 'ToolsCandy - Free Image Processing Tools for Everyone',
          metaDescription: 'Free, powerful image processing tools that work right in your browser. Compress, resize, convert, and crop images with complete privacy. No uploads required.',
          metaKeywords: ['ToolsCandy', 'image tools', 'image optimization', 'image compression', 'image resize', 'browser tools', 'privacy'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 1,
        },
        {
          pagePath: '/blog',
          pageType: 'blog-listing' as const,
          pageName: 'Blog',
          metaTitle: 'ToolsCandy Blog - Image Processing Tips & Tutorials',
          metaDescription: 'Expert tips, tutorials, and insights about image optimization, web performance, and browser-based image processing. Learn from the pros.',
          metaKeywords: ['ToolsCandy blog', 'image optimization tips', 'image processing tutorials', 'web performance', 'browser tools'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 2,
        },
        {
          pagePath: '/image/compress',
          pageType: 'tool' as const,
          pageName: 'Image Compression Tool',
          metaTitle: 'Free Image Compression Tool - Reduce Image Size Online',
          metaDescription: 'Compress your images without losing quality. Our free online tool reduces image file size by up to 80% while maintaining visual quality.',
          metaKeywords: ['image compression', 'compress images online', 'reduce image size', 'optimize images', 'free image compressor'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 3,
        },
        {
          pagePath: '/image/resize',
          pageType: 'tool' as const,
          pageName: 'Image Resize Tool',
          metaTitle: 'Free Image Resize Tool - Resize Images Online',
          metaDescription: 'Resize your images to any dimension with our free online tool. Maintain aspect ratio and quality while adjusting image dimensions.',
          metaKeywords: ['image resize', 'resize images online', 'change image size', 'image dimensions', 'free image resizer'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 4,
        },
        {
          pagePath: '/image/convert',
          pageType: 'tool' as const,
          pageName: 'Image Format Converter',
          metaTitle: 'Free Image Format Converter - Convert Images Online',
          metaDescription: 'Convert images between formats like JPG, PNG, WebP, and more. Free online tool with high-quality conversion and batch processing.',
          metaKeywords: ['image converter', 'convert images online', 'image format converter', 'jpg to png', 'webp converter'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 5,
        },
        {
          pagePath: '/image/crop',
          pageType: 'tool' as const,
          pageName: 'Image Crop Tool',
          metaTitle: 'Free Image Crop Tool - Crop Images Online',
          metaDescription: 'Crop your images with precision using our free online tool. Remove unwanted areas and focus on what matters most.',
          metaKeywords: ['image crop', 'crop images online', 'image editor', 'crop tool', 'free image cropper'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 6,
        },
        {
          pagePath: '/image/metadata',
          pageType: 'tool' as const,
          pageName: 'Image Metadata Analyzer',
          metaTitle: 'Free Image Metadata Analyzer - Extract EXIF & Image Data Online',
          metaDescription: 'Analyze image metadata, extract EXIF data, and view technical specifications. Free online image metadata analyzer with comprehensive insights. Privacy-focused.',
          metaKeywords: ['image metadata', 'EXIF data', 'image analyzer', 'image properties', 'metadata extractor', 'image information', 'technical specifications', 'photo metadata'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 7,
        },
        {
          pagePath: '/about',
          pageType: 'about' as const,
          pageName: 'About Us',
          metaTitle: 'About ToolsCandy - Making Image Processing Sweet & Simple',
          metaDescription: 'Learn about ToolsCandy\'s mission to provide free, privacy-focused image processing tools that work entirely in your browser. No uploads, complete privacy.',
          metaKeywords: ['ToolsCandy about', 'privacy-focused tools', 'browser image processing', 'no upload tools', 'free image tools'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 8,
        },
        {
          pagePath: '/privacy',
          pageType: 'custom' as const,
          pageName: 'Privacy Policy',
          metaTitle: 'Privacy Policy - ToolsCandy Protects Your Data',
          metaDescription: 'ToolsCandy\'s comprehensive privacy policy. Learn how we protect your privacy with browser-based processing and no data collection.',
          metaKeywords: ['ToolsCandy privacy', 'privacy policy', 'data protection', 'browser processing', 'no data collection'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 9,
        },
        {
          pagePath: '/terms',
          pageType: 'custom' as const,
          pageName: 'Terms of Service',
          metaTitle: 'Terms of Service - ToolsCandy Fair Usage Terms',
          metaDescription: 'ToolsCandy\'s terms of service. Clear, fair terms for using our free image processing tools responsibly.',
          metaKeywords: ['ToolsCandy terms', 'terms of service', 'usage terms', 'free tool terms', 'fair usage'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 10,
        },
        {
          pagePath: '/contact',
          pageType: 'custom' as const,
          pageName: 'Contact Us',
          metaTitle: 'Contact ToolsCandy - Get Help & Share Feedback',
          metaDescription: 'Contact ToolsCandy for support, feedback, or questions. We\'re here to help with our image processing tools and answer your questions.',
          metaKeywords: ['ToolsCandy contact', 'support', 'feedback', 'help', 'customer service'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 11,
        },
        {
          pagePath: '/disclaimer',
          pageType: 'custom' as const,
          pageName: 'Disclaimer',
          metaTitle: 'Disclaimer - Important Information About ToolsCandy',
          metaDescription: 'Important disclaimer and usage information for ToolsCandy\'s image processing tools. Use responsibly and understand the limitations.',
          metaKeywords: ['ToolsCandy disclaimer', 'usage disclaimer', 'tool limitations', 'responsible use', 'important information'],
          ogType: 'website',
          twitterCard: 'summary_large_image',
          priority: 12,
        },
      ];

      const results: any[] = [];
      let created = 0;
      let existing = 0;

      for (const pageData of defaultPages) {
        const existingPage = await this.pageSeoModel.findOne({ pagePath: pageData.pagePath });

        if (!existingPage) {
          const pageSeo = await this.pageSeoModel.create(pageData);
          results.push(pageSeo);
          created++;
        } else if (overwrite) {
          const updatedPage = await this.pageSeoModel.findOneAndUpdate(
            { pagePath: pageData.pagePath },
            pageData,
            { new: true }
          );
          results.push(updatedPage);
          created++;
        } else {
          existing++;
        }
      }

      this.logger.log(`Initialized SEO settings: ${created} created, ${existing} already existed`);

      return {
        status: 'success',
        message: 'Successfully initialized SEO settings',
        data: {
          created,
          existing,
          total: defaultPages.length,
          results,
        },
      };
    } catch (error) {
      this.logger.error('Error initializing default SEO:', error);
      throw new Error('Failed to initialize default SEO settings');
    }
  }
} 