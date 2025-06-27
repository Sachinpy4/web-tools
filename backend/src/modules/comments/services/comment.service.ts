import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { Blog, BlogDocument } from '../../blog/schemas/blog.schema';
import { CreateCommentDto, UpdateCommentDto, CommentQueryDto, BlogCommentQueryDto, ApproveCommentDto } from '../dto/comment.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    @Inject(forwardRef(() => 'BlogCacheService')) private blogCacheService: any,
  ) {}

  /**
   * Get all comments with filtering options (Admin only)
   */
  async getComments(query: CommentQueryDto) {
    // Parse pagination parameters
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Build filter query
    const dbQuery: any = {};

    // Filter by blog post
    if (query.blog) {
      dbQuery.blog = query.blog;
    }

    // Filter by approval status
    if (query.approved !== undefined) {
      dbQuery.approved = query.approved;
    }

    // Filter by user
    if (query.user) {
      dbQuery.user = query.user;
    }

    // Filter by parent
    if (query.parent) {
      dbQuery.parent = query.parent;
    } else if (query.parentExists === false) {
      dbQuery.parent = null; // Get only top-level comments
    }

    // Search for text matches
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      dbQuery.$or = [
        { text: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    // Count total items for pagination
    const total = await this.commentModel.countDocuments(dbQuery);

    // Execute query with pagination
    const comments = await this.commentModel
      .find(dbQuery)
      .populate('blog', 'title slug')
      .populate('user', 'name email')
      .populate('parent', 'text')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: comments,
    };
  }

  /**
   * Get comments for a specific blog post
   */
  async getBlogComments(blogId: string, query: BlogCommentQueryDto, userRole?: string) {
    // Verify blog exists
    const blog = await this.blogModel.findById(blogId);
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Verify comments are enabled
    if (!blog.commentsEnabled) {
      throw new ForbiddenException('Comments are disabled for this blog post');
    }

    // Build query
    const dbQuery: any = { blog: blogId, parent: null }; // Only top-level comments

    // For non-admin users, only show approved comments
    if (!userRole || userRole !== 'admin') {
      dbQuery.approved = true;
    }

    // Parse pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 5, 20); // Max 20 items per page
    const skip = (page - 1) * limit;

    // Get comments count
    const total = await this.commentModel.countDocuments(dbQuery);

    // Get comments with their replies
    const comments = await this.commentModel
      .find(dbQuery)
      .populate('user', 'name')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'name',
        },
        match: !userRole || userRole !== 'admin' ? { approved: true } : {},
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: comments,
    };
  }

  /**
   * Add a comment to a blog post
   */
  async addComment(blogId: string, createCommentDto: CreateCommentDto, ipAddress: string, userId?: string) {
    // Verify blog exists
    const blog = await this.blogModel.findById(blogId);
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    // Verify comments are enabled
    if (!blog.commentsEnabled) {
      throw new ForbiddenException('Comments are disabled for this blog post');
    }

    // Check IP-based rate limiting if enabled
    if (blog.limitCommentsPerIp) {
      const existingCommentsCount = await this.commentModel.countDocuments({
        blog: blogId,
        ipAddress: ipAddress,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      });

      if (existingCommentsCount >= 5) { // Max 5 comments per IP per day
        throw new BadRequestException('Too many comments from this IP address. Please try again later.');
      }
    }

    // If parent comment is specified, verify it exists and belongs to the same blog
    if (createCommentDto.parent) {
      const parentComment = await this.commentModel.findById(createCommentDto.parent);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parentComment.blog.toString() !== blogId) {
        throw new BadRequestException('Parent comment does not belong to this blog post');
      }
    }

    // Create comment
    const commentData = {
      ...createCommentDto,
      blog: blogId,
      user: userId || null,
      ipAddress,
      approved: !blog.requireCommentApproval, // Auto-approve if not required
    };

    const comment = await this.commentModel.create(commentData);

    // If this is a reply, add it to the parent's replies array
    if (createCommentDto.parent) {
      await this.commentModel.findByIdAndUpdate(
        createCommentDto.parent,
        { $push: { replies: comment._id } }
      );
    }

    const populatedComment = await this.commentModel
      .findById(comment._id)
      .populate('user', 'name')
      .populate('blog', 'title');

    // Invalidate blog cache
    await this.blogCacheService.invalidateBlog(blogId);

    return {
      status: 'success',
      data: populatedComment,
      message: blog.requireCommentApproval 
        ? 'Comment submitted and is pending approval' 
        : 'Comment added successfully',
    };
  }

  /**
   * Update a comment (Admin only)
   */
  async updateComment(commentId: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updatedComment = await this.commentModel.findByIdAndUpdate(
      commentId,
      updateCommentDto,
      { new: true, runValidators: true }
    ).populate('user', 'name email').populate('blog', 'title');

    // Invalidate blog cache
    await this.blogCacheService.invalidateBlog(comment.blog.toString());

    return {
      status: 'success',
      data: updatedComment,
    };
  }

  /**
   * Delete a comment (Admin only)
   */
  async deleteComment(commentId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // If this comment has replies, also delete them
    if (comment.replies && comment.replies.length > 0) {
      await this.commentModel.deleteMany({ _id: { $in: comment.replies } });
    }

    // If this is a reply, remove it from parent's replies array
    if (comment.parent) {
      await this.commentModel.findByIdAndUpdate(
        comment.parent,
        { $pull: { replies: comment._id } }
      );
    }

    await this.commentModel.findByIdAndDelete(commentId);

    // Invalidate blog cache
    await this.blogCacheService.invalidateBlog(comment.blog.toString());

    return {
      status: 'success',
      message: 'Comment deleted successfully',
    };
  }

  /**
   * Approve or disapprove a comment (Admin only)
   */
  async approveComment(commentId: string, approveCommentDto: ApproveCommentDto) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    comment.approved = approveCommentDto.approved;
    await comment.save();

    // Invalidate blog cache
    await this.blogCacheService.invalidateBlog(comment.blog.toString());

    return {
      status: 'success',
      data: {
        id: comment._id,
        approved: comment.approved,
      },
      message: `Comment ${approveCommentDto.approved ? 'approved' : 'disapproved'} successfully`,
    };
  }

  /**
   * Get comment statistics (Admin only)
   */
  async getCommentStats() {
    const totalComments = await this.commentModel.countDocuments();
    const approvedComments = await this.commentModel.countDocuments({ approved: true });
    const pendingComments = await this.commentModel.countDocuments({ approved: false });
    const repliesCount = await this.commentModel.countDocuments({ parent: { $ne: null } });

    // Get comments per day for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const commentsPerDay = await this.commentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return {
      status: 'success',
      data: {
        totalComments,
        approvedComments,
        pendingComments,
        repliesCount,
        commentsPerDay,
      },
    };
  }

  /**
   * Get recent comments (Admin only)
   */
  async getRecentComments(limit: number = 10) {
    const comments = await this.commentModel
      .find()
      .populate('blog', 'title slug')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      status: 'success',
      data: comments,
    };
  }

  /**
   * Bulk approve comments (Admin only)
   */
  async bulkApproveComments(commentIds: string[]) {
    const result = await this.commentModel.updateMany(
      { _id: { $in: commentIds } },
      { approved: true }
    );

    // Invalidate blog cache
    for (const commentId of commentIds) {
      const comment = await this.commentModel.findById(commentId);
      if (comment) {
        await this.blogCacheService.invalidateBlog(comment.blog.toString());
      }
    }

    return {
      status: 'success',
      message: `${result.modifiedCount} comments approved successfully`,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Bulk delete comments (Admin only)
   */
  async bulkDeleteComments(commentIds: string[]) {
    // First, handle replies and parent references
    const comments = await this.commentModel.find({ _id: { $in: commentIds } });
    
    for (const comment of comments) {
      // Remove from parent's replies if it's a reply
      if (comment.parent) {
        await this.commentModel.findByIdAndUpdate(
          comment.parent,
          { $pull: { replies: comment._id } }
        );
      }
      
      // Delete replies if any
      if (comment.replies && comment.replies.length > 0) {
        await this.commentModel.deleteMany({ _id: { $in: comment.replies } });
      }
    }

    const result = await this.commentModel.deleteMany({ _id: { $in: commentIds } });

    // Invalidate blog cache
    for (const comment of comments) {
      await this.blogCacheService.invalidateBlog(comment.blog.toString());
    }

    return {
      status: 'success',
      message: `${result.deletedCount} comments deleted successfully`,
      deletedCount: result.deletedCount,
    };
  }
} 