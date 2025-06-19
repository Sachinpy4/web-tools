import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { BlogService } from '../services/blog.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserDocument } from '../../auth/schemas/user.schema';
import {
  CreateBlogDto,
  UpdateBlogDto,
  BlogQueryDto,
  LikeBlogDto,
  BlogResponseDto,
  BlogsListResponseDto,
} from '../dto/blog.dto';
import { CreateCommentDto } from '../../comments/dto/comment.dto';

@ApiTags('Blog')
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Blog post successfully created',
    type: BlogResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async createBlog(
    @Body() createBlogDto: CreateBlogDto,
    @GetUser() user: UserDocument,
  ) {
    return this.blogService.createBlog(createBlogDto, user._id.toString());
  }

  @Get()
  @ApiOperation({ summary: 'Get all blog posts with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', enum: ['published', 'draft', 'scheduled'] })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title, content, and excerpt' })
  @ApiQuery({ name: 'tag', required: false, description: 'Filter by tag' })
  @ApiQuery({ name: 'slug', required: false, description: 'Filter by slug' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for date range filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for date range filter' })
  @ApiResponse({
    status: 200,
    description: 'List of blog posts',
    type: BlogsListResponseDto,
  })
  async getBlogs(
    @Query() query: BlogQueryDto,
    @Req() req: Request,
  ) {
    const userRole = (req.user as any)?.role;
    return this.blogService.getBlogs(query, userRole);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all blog categories' })
  @ApiResponse({
    status: 200,
    description: 'List of blog categories',
  })
  async getCategories() {
    return this.blogService.getCategories();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all blog tags' })
  @ApiResponse({
    status: 200,
    description: 'List of blog tags',
  })
  async getTags() {
    return this.blogService.getTags();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular blog posts' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts to return', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'List of popular blog posts',
  })
  async getPopularBlogs(@Query('limit') limit?: number) {
    return this.blogService.getPopularBlogs(limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent blog posts' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts to return', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'List of recent blog posts',
  })
  async getRecentBlogs(@Query('limit') limit?: number) {
    return this.blogService.getRecentBlogs(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search blog posts using text search' })
  @ApiQuery({ name: 'q', required: true, description: 'Search term' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Search results',
  })
  async searchBlogs(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ) {
    return this.blogService.searchBlogs(searchTerm, limit);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a blog post by slug' })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  @ApiResponse({
    status: 200,
    description: 'Blog post data',
    type: BlogResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this blog post' })
  async getBlogBySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
  ) {
    const userRole = (req.user as any)?.role;
    const visitorIP = this.getVisitorIP(req);
    return this.blogService.getBlogBySlug(slug, userRole, visitorIP);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog post data',
    type: BlogResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this blog post' })
  async getBlog(
    @Param('id') blogId: string,
    @Req() req: Request,
  ) {
    const userRole = (req.user as any)?.role;
    const visitorIP = this.getVisitorIP(req);
    return this.blogService.getBlog(blogId, userRole, visitorIP);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post (Admin only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog post successfully updated',
    type: BlogResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async updateBlog(
    @Param('id') blogId: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @GetUser() user: UserDocument,
  ) {
    return this.blogService.updateBlog(
      blogId,
      updateBlogDto,
      user.role,
      user._id.toString(),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a blog post (Admin only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog post successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async deleteBlog(
    @Param('id') blogId: string,
    @GetUser() user: UserDocument,
  ) {
    return this.blogService.deleteBlog(
      blogId,
      user.role,
      user._id.toString(),
    );
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Like status updated',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiResponse({ status: 403, description: 'Cannot like unpublished blog post' })
  async likeBlog(
    @Param('id') blogId: string,
    @Body() likeBlogDto: LikeBlogDto,
    @Req() req: Request,
  ) {
    const visitorIP = this.getVisitorIP(req);
    return this.blogService.likeBlog(blogId, likeBlogDto, visitorIP);
  }

  @Get(':id/like')
  @ApiOperation({ summary: 'Get like status for a blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Like status retrieved',
  })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getLikeStatus(
    @Param('id') blogId: string,
    @Req() req: Request,
  ) {
    const visitorIP = this.getVisitorIP(req);
    return this.blogService.getLikeStatus(blogId, visitorIP);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Blog comments retrieved',
  })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getBlogComments(
    @Param('id') blogId: string,
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 5,
    };
    const userRole = (req.user as any)?.role;
    return this.blogService.getBlogComments(blogId, query, userRole);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 201,
    description: 'Comment added successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid comment data' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiResponse({ status: 403, description: 'Comments disabled for this blog post' })
  async addBlogComment(
    @Param('id') blogId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const userRole = (req.user as any)?.role;
    const userId = (req.user as any)?.id;
    const visitorIP = this.getVisitorIP(req);
    
    return this.blogService.addBlogComment(blogId, createCommentDto, visitorIP, userId);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get blog analytics (Admin only)' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog analytics data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getBlogAnalytics(@Param('id') blogId: string) {
    return this.blogService.getBlogAnalytics(blogId);
  }

  /**
   * Helper method to extract visitor IP
   */
  private getVisitorIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
} 