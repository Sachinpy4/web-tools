import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../schemas/blog.schema';
import { CreateBlogDto, UpdateBlogDto, BlogQueryDto, LikeBlogDto } from '../dto/blog.dto';
import { CreateCommentDto } from '../../comments/dto/comment.dto';
import { BlogCacheService } from './blog-cache.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    @Inject(forwardRef(() => 'CommentService')) private commentService: any,
    private readonly blogCacheService: BlogCacheService,
  ) {}

  /**
   * Create a new blog post
   */
  async createBlog(createBlogDto: CreateBlogDto, authorId: string) {
    const blogData = {
      ...createBlogDto,
      author: authorId,
    };

    const blog = await this.blogModel.create(blogData);
    
    // Invalidate list caches since a new blog was created
    await this.blogCacheService.invalidateListCaches();

    return {
      status: 'success',
      data: blog,
    };
  }

  /**
   * Get all blog posts with pagination and filters
   */
  async getBlogs(query: BlogQueryDto, userRole?: string) {
    // Create cache key based on query and user role
    const cacheQuery = { ...query, userRole: userRole || 'public' };
    const queryHash = this.blogCacheService.generateQueryHash(cacheQuery);
    
    // Try to get from cache first
    const cachedResult = await this.blogCacheService.getBlogList(queryHash);
    if (cachedResult) {
      return cachedResult;
    }

    // Parse pagination parameters
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 50); // Max 50 items per page
    const skip = (page - 1) * limit;

    // Build query
    let dbQuery: any = {};

    // Filter by status (Admin can see all, public only published)
    if (query.status) {
      if (userRole === 'admin') {
        dbQuery = { ...dbQuery, status: query.status };
      } else {
        dbQuery = { ...dbQuery, status: 'published' };
      }
    } else if (!userRole || userRole !== 'admin') {
      // If status not specified and not admin, only show published
      dbQuery = { ...dbQuery, status: 'published' };
    }

    // Filter by category
    if (query.category) {
      dbQuery = { ...dbQuery, category: query.category };
    }

    // Search by title, content, or excerpt
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      dbQuery = {
        ...dbQuery,
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { excerpt: searchRegex },
        ],
      };
    }

    // Filter by tag
    if (query.tag) {
      dbQuery = { ...dbQuery, tags: query.tag };
    }

    // Filter by slug
    if (query.slug) {
      dbQuery = { ...dbQuery, slug: query.slug };
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      dbQuery.date = {};

      if (query.startDate) {
        dbQuery.date.$gte = new Date(query.startDate);
      }

      if (query.endDate) {
        dbQuery.date.$lte = new Date(query.endDate);
      }
    }

    // Handle scheduled posts - check if any should be published
    await this.publishScheduledPosts();

    // Count total items for pagination
    const total = await this.blogModel.countDocuments(dbQuery);

    // Execute query with pagination
    const blogs = await this.blogModel
      .find(dbQuery)
      .populate('author', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const result = {
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: blogs,
    };

    // Cache the result
    await this.blogCacheService.setBlogList(queryHash, result);

    return result;
  }

  /**
   * Get a single blog post
   */
  async getBlog(blogId: string, userRole?: string, visitorIP?: string) {
    // For admin users or view tracking, we need fresh data - skip cache
    if (userRole === 'admin' || visitorIP) {
      const blog = await this.blogModel
        .findById(blogId)
        .populate('author', 'name email');

      if (!blog) {
        throw new NotFoundException('Blog post not found');
      }

      // Check if blog is published or user is admin
      if (blog.status !== 'published' && (!userRole || userRole !== 'admin')) {
        throw new ForbiddenException('Not authorized to view this blog post');
      }

      // Increment view count and track analytics if not admin
      if (!userRole || userRole !== 'admin') {
        await this.trackBlogAnalytics(blog, visitorIP);
      }

      return {
        status: 'success',
        data: blog,
      };
    }

    // For public users without view tracking, try cache first
    const cachedBlog = await this.blogCacheService.getBlogById(blogId);
    if (cachedBlog) {
      // Still need to check if it's published for non-admin users
      if (cachedBlog.data.status !== 'published' && (!userRole || userRole !== 'admin')) {
        throw new ForbiddenException('Not authorized to view this blog post');
      }
      return cachedBlog;
    }

    // If not in cache, fetch from database
    const blog = await this.blogModel
      .findById(blogId)
      .populate('author', 'name email');

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Check if blog is published or user is admin
    if (blog.status !== 'published' && (!userRole || userRole !== 'admin')) {
      throw new ForbiddenException('Not authorized to view this blog post');
    }

    const result = {
      status: 'success',
      data: blog,
    };

    // Cache only published blogs for public users
    if (blog.status === 'published') {
      await this.blogCacheService.setBlogById(blogId, result);
    }

    return result;
  }

  /**
   * Get blog by slug
   */
  async getBlogBySlug(slug: string, userRole?: string, visitorIP?: string) {
    // For admin users or view tracking, we need fresh data - skip cache
    if (userRole === 'admin' || visitorIP) {
      const blog = await this.blogModel
        .findOne({ slug })
        .populate('author', 'name email');

      if (!blog) {
        throw new NotFoundException('Blog post not found');
      }

      // Check if blog is published or user is admin
      if (blog.status !== 'published' && (!userRole || userRole !== 'admin')) {
        throw new ForbiddenException('Not authorized to view this blog post');
      }

      // Increment view count and track analytics if not admin
      if (!userRole || userRole !== 'admin') {
        await this.trackBlogAnalytics(blog, visitorIP);
      }

      return {
        status: 'success',
        data: blog,
      };
    }

    // For public users without view tracking, try cache first
    const cachedBlog = await this.blogCacheService.getBlogBySlug(slug);
    if (cachedBlog) {
      // Still need to check if it's published for non-admin users
      if (cachedBlog.data.status !== 'published' && (!userRole || userRole !== 'admin')) {
        throw new ForbiddenException('Not authorized to view this blog post');
      }
      return cachedBlog;
    }

    // If not in cache, fetch from database
    const blog = await this.blogModel
      .findOne({ slug })
      .populate('author', 'name email');

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Check if blog is published or user is admin
    if (blog.status !== 'published' && (!userRole || userRole !== 'admin')) {
      throw new ForbiddenException('Not authorized to view this blog post');
    }

    const result = {
      status: 'success',
      data: blog,
    };

    // Cache only published blogs for public users
    if (blog.status === 'published') {
      await this.blogCacheService.setBlogBySlug(slug, result);
    }

    return result;
  }

  /**
   * Update a blog post
   */
  async updateBlog(blogId: string, updateBlogDto: UpdateBlogDto, userRole?: string, userId?: string) {
    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Check permissions (admin can edit all, authors can edit their own)
    if (userRole !== 'admin' && blog.author.toString() !== userId) {
      throw new ForbiddenException('Not authorized to update this blog post');
    }

    // Store old slug for cache invalidation
    const oldSlug = blog.slug;

    // Update the blog using Object.assign to avoid validation issues with partial updates
    Object.assign(blog, updateBlogDto);
    await blog.save();
    
    const updatedBlog = await this.blogModel.findById(blogId).populate('author', 'name email');

    // Invalidate caches for this blog
    await this.blogCacheService.invalidateBlog(blogId, oldSlug);
    
    // If slug changed, also invalidate new slug cache
    if (updatedBlog!.slug !== oldSlug) {
      await this.blogCacheService.invalidateBlog(blogId, updatedBlog!.slug);
    }
    
    // Invalidate list caches since blog data changed
    await this.blogCacheService.invalidateListCaches();

    return {
      status: 'success',
      data: updatedBlog,
    };
  }

  /**
   * Delete a blog post
   */
  async deleteBlog(blogId: string, userRole?: string, userId?: string) {
    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Check permissions (admin can delete all, authors can delete their own)
    if (userRole !== 'admin' && blog.author.toString() !== userId) {
      throw new ForbiddenException('Not authorized to delete this blog post');
    }

    // Store slug for cache invalidation
    const slug = blog.slug;

    await this.blogModel.findByIdAndDelete(blogId);

    // Invalidate caches for this blog
    await this.blogCacheService.invalidateBlog(blogId, slug);
    
    // Invalidate list caches since a blog was deleted
    await this.blogCacheService.invalidateListCaches();

    return {
      status: 'success',
      message: 'Blog post deleted successfully',
    };
  }

  /**
   * Like or unlike a blog post
   */
  async likeBlog(blogId: string, likeBlogDto: LikeBlogDto, visitorIP: string) {
    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    if (blog.status !== 'published') {
      throw new ForbiddenException('Cannot like unpublished blog post');
    }

    if (!visitorIP) {
      throw new BadRequestException('Unable to track like - invalid request');
    }

    const hasLiked = blog.likedByIPs.includes(visitorIP);

    if (likeBlogDto.liked && !hasLiked) {
      // Add like
      blog.likes += 1;
      blog.likedByIPs.push(visitorIP);
    } else if (!likeBlogDto.liked && hasLiked) {
      // Remove like
      blog.likes = Math.max(0, blog.likes - 1);
      blog.likedByIPs = blog.likedByIPs.filter(ip => ip !== visitorIP);
    }

    await blog.save();

    // Invalidate caches for this blog since like count changed
    await this.blogCacheService.invalidateBlog(blogId);
    await this.blogCacheService.invalidateLikeCaches(blogId);
    
    // Invalidate popular blogs cache since view count affects popularity
    await this.blogCacheService.delPattern('blog:popular:*');

    return {
      status: 'success',
      data: {
        likes: blog.likes,
        hasLiked: blog.likedByIPs.includes(visitorIP),
      },
    };
  }

  /**
   * Get like status for a blog post
   */
  async getLikeStatus(blogId: string, visitorIP: string) {
    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    return {
      status: 'success',
      data: {
        likes: blog.likes,
        hasLiked: blog.likedByIPs.includes(visitorIP),
      },
    };
  }

  /**
   * Get comments for a blog post (delegated to CommentService)
   */
  async getBlogComments(blogId: string, query: { page: number; limit: number }, userRole?: string) {
    // Delegate to CommentService
    return this.commentService.getBlogComments(blogId, query, userRole);
  }

  /**
   * Add a comment to a blog post (delegated to CommentService)
   */
  async addBlogComment(blogId: string, createCommentDto: CreateCommentDto, visitorIP: string, userId?: string) {
    // Delegate to CommentService
    return this.commentService.addComment(blogId, createCommentDto, visitorIP, userId);
  }

  /**
   * Get blog categories
   */
  async getCategories() {
    // Try to get from cache first
    const cachedCategories = await this.blogCacheService.getCategories();
    if (cachedCategories) {
      return cachedCategories;
    }

    // If not in cache, fetch from database
    const categories = await this.blogModel.distinct('category', { status: 'published' });
    
    const result = {
      status: 'success',
      data: categories.sort(),
    };

    // Cache the result
    await this.blogCacheService.setCategories(result);

    return result;
  }

  /**
   * Get blog tags
   */
  async getTags() {
    // Try to get from cache first
    const cachedTags = await this.blogCacheService.getTags();
    if (cachedTags) {
      return cachedTags;
    }

    // If not in cache, fetch from database
    const tags = await this.blogModel.distinct('tags', { status: 'published' });
    
    const result = {
      status: 'success',
      data: tags.sort(),
    };

    // Cache the result
    await this.blogCacheService.setTags(result);

    return result;
  }

  /**
   * Get blog analytics
   */
  async getBlogAnalytics(blogId: string) {
    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    const analytics = {
      totalViews: blog.views || 0,
      uniqueVisitors: blog.uniqueVisitors || 0,
      averageTimeOnPage: blog.averageTimeOnPage || 0,
      bounceRate: blog.bounceRate || 0,
      dailyViews: {},
      dailyViewsArray: [],
      readingTime: blog.readingTime,
    };

    return {
      status: 'success',
      data: analytics,
    };
  }

  /**
   * Track blog analytics (private method)
   */
  private async trackBlogAnalytics(blog: BlogDocument, visitorIP?: string) {
    blog.views += 1;

    // Track analytics data
    const now = new Date();

    // Initialize pageViews array if it doesn't exist
    if (!blog.pageViews) {
      blog.pageViews = [];
    }

    // Add view for current time
    blog.pageViews.push(now.getTime());

    // Track unique visitors by IP address
    if (visitorIP) {
      // Initialize or update visitor IPs tracking
      if (!blog.visitorIPs) {
        blog.visitorIPs = [visitorIP];
        blog.uniqueVisitors = 1;
      } else if (!blog.visitorIPs.includes(visitorIP)) {
        blog.visitorIPs.push(visitorIP);
        blog.uniqueVisitors = blog.visitorIPs.length;
      }
    }

    await blog.save();
  }

  /**
   * Publish scheduled posts (private method)
   */
  private async publishScheduledPosts() {
    const now = new Date();
    try {
      await this.blogModel.updateMany(
        {
          status: 'scheduled',
          scheduledPublishDate: { $lte: now },
        },
        {
          $set: { status: 'published' },
        }
      );
    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Get popular blogs
   */
  async getPopularBlogs(limit: number = 5) {
    // Try to get from cache first
    const cachedBlogs = await this.blogCacheService.getPopularBlogs(limit);
    if (cachedBlogs) {
      return cachedBlogs;
    }

    // If not in cache, fetch from database
    const blogs = await this.blogModel
      .find({ status: 'published' })
      .populate('author', 'name email')
      .sort({ views: -1 })
      .limit(limit);

    const result = {
      status: 'success',
      data: blogs,
    };

    // Cache the result
    await this.blogCacheService.setPopularBlogs(limit, result);

    return result;
  }

  /**
   * Get recent blogs
   */
  async getRecentBlogs(limit: number = 5) {
    // Try to get from cache first
    const cachedBlogs = await this.blogCacheService.getRecentBlogs(limit);
    if (cachedBlogs) {
      return cachedBlogs;
    }

    // If not in cache, fetch from database
    const blogs = await this.blogModel
      .find({ status: 'published' })
      .populate('author', 'name email')
      .sort({ date: -1 })
      .limit(limit);

    const result = {
      status: 'success',
      data: blogs,
    };

    // Cache the result
    await this.blogCacheService.setRecentBlogs(limit, result);

    return result;
  }

  /**
   * Search blogs using text search
   */
  async searchBlogs(searchTerm: string, limit: number = 10) {
    // Try to get from cache first
    const cachedResults = await this.blogCacheService.getSearchResults(searchTerm, limit);
    if (cachedResults) {
      return cachedResults;
    }

    // If not in cache, fetch from database
    const blogs = await this.blogModel
      .find(
        {
          status: 'published',
          $text: { $search: searchTerm },
        },
        { score: { $meta: 'textScore' } }
      )
      .populate('author', 'name email')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit);

    const result = {
      status: 'success',
      data: blogs,
    };

    // Cache the result
    await this.blogCacheService.setSearchResults(searchTerm, limit, result);

    return result;
  }
} 