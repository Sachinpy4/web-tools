import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../schemas/blog.schema';
import { CreateBlogDto, UpdateBlogDto, BlogQueryDto, LikeBlogDto } from '../dto/blog.dto';
import { CreateCommentDto } from '../../comments/dto/comment.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    @Inject(forwardRef(() => 'CommentService')) private commentService: any,
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
    return {
      status: 'success',
      data: blog,
    };
  }

  /**
   * Get all blog posts with pagination and filters
   */
  async getBlogs(query: BlogQueryDto, userRole?: string) {
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

    return {
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: blogs,
    };
  }

  /**
   * Get a single blog post
   */
  async getBlog(blogId: string, userRole?: string, visitorIP?: string) {
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

  /**
   * Get blog by slug
   */
  async getBlogBySlug(slug: string, userRole?: string, visitorIP?: string) {
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

    // Update the blog using Object.assign to avoid validation issues with partial updates
    Object.assign(blog, updateBlogDto);
    await blog.save();
    
    const updatedBlog = await this.blogModel.findById(blogId).populate('author', 'name email');

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

    await this.blogModel.findByIdAndDelete(blogId);

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
    const categories = await this.blogModel.distinct('category', { status: 'published' });
    
    return {
      status: 'success',
      data: categories.sort(),
    };
  }

  /**
   * Get blog tags
   */
  async getTags() {
    const tags = await this.blogModel.distinct('tags', { status: 'published' });
    
    return {
      status: 'success',
      data: tags.sort(),
    };
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
    const blogs = await this.blogModel
      .find({ status: 'published' })
      .populate('author', 'name email')
      .sort({ views: -1 })
      .limit(limit);

    return {
      status: 'success',
      data: blogs,
    };
  }

  /**
   * Get recent blogs
   */
  async getRecentBlogs(limit: number = 5) {
    const blogs = await this.blogModel
      .find({ status: 'published' })
      .populate('author', 'name email')
      .sort({ date: -1 })
      .limit(limit);

    return {
      status: 'success',
      data: blogs,
    };
  }

  /**
   * Search blogs using text search
   */
  async searchBlogs(searchTerm: string, limit: number = 10) {
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

    return {
      status: 'success',
      data: blogs,
    };
  }
} 