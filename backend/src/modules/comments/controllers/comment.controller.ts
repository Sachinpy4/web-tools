import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CommentService } from '../services/comment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentQueryDto,
  BlogCommentQueryDto,
  ApproveCommentDto,
  CommentResponseDto,
  CommentsListResponseDto,
} from '../dto/comment.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all comments with filtering options',
    description: 'Retrieve all comments with advanced filtering and pagination. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments retrieved successfully',
    type: CommentsListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getComments(@Query() query: CommentQueryDto) {
    return this.commentService.getComments(query);
  }

  @Get('blogs/:blogId/comments')
  @ApiOperation({
    summary: 'Get comments for a specific blog post',
    description: 'Retrieve comments for a blog post. Only approved comments are shown to non-admin users.',
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog post ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blog comments retrieved successfully',
    type: CommentsListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Blog post not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Comments are disabled for this blog post',
  })
  async getBlogComments(
    @Param('blogId') blogId: string,
    @Query() query: BlogCommentQueryDto,
    @GetUser() user?: any,
  ) {
    return this.commentService.getBlogComments(blogId, query, user?.role);
  }

  @Post('blogs/:blogId/comments')
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 comments per 15 minutes
  @ApiOperation({
    summary: 'Add a comment to a blog post',
    description: 'Add a new comment to a blog post. Comments may require approval based on blog settings.',
  })
  @ApiParam({
    name: 'blogId',
    description: 'Blog post ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment added successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid comment data or rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Blog post not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Comments are disabled for this blog post',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many comment requests',
  })
  async addComment(
    @Param('blogId') blogId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any,
    @GetUser() user?: any,
  ) {
    // Extract IP address
    const ipAddress = 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      'unknown';

    return this.commentService.addComment(
      blogId,
      createCommentDto,
      ipAddress,
      user?.id,
    );
  }

  @Put(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Update comment content or approval status. Admin access required.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentService.updateComment(commentId, updateCommentDto);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Delete a comment and all its replies. Admin access required.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async deleteComment(@Param('commentId') commentId: string) {
    return this.commentService.deleteComment(commentId);
  }

  @Put(':commentId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or disapprove a comment',
    description: 'Change the approval status of a comment. Admin access required.',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Comment ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment approval status updated successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async approveComment(
    @Param('commentId') commentId: string,
    @Body() approveCommentDto: ApproveCommentDto,
  ) {
    return this.commentService.approveComment(commentId, approveCommentDto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve a comment (frontend compatibility)',
    description: 'Approve a comment. Admin access required. This endpoint matches frontend expectations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Comment ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment approved successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async approveCommentPatch(
    @Param('id') commentId: string,
  ) {
    // Frontend expects simple approval, so we set approved to true
    const approveCommentDto: ApproveCommentDto = { approved: true };
    return this.commentService.approveComment(commentId, approveCommentDto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get comment statistics',
    description: 'Retrieve comprehensive comment statistics including approval status and trends. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getCommentStats() {
    return this.commentService.getCommentStats();
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recent comments',
    description: 'Retrieve the most recent comments across all blog posts. Admin access required.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recent comments to retrieve',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent comments retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getRecentComments(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.commentService.getRecentComments(limitNumber);
  }

  @Put('bulk/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk approve comments',
    description: 'Approve multiple comments at once. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments approved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async bulkApproveComments(@Body('commentIds') commentIds: string[]) {
    return this.commentService.bulkApproveComments(commentIds);
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk delete comments',
    description: 'Delete multiple comments at once. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async bulkDeleteComments(@Body('commentIds') commentIds: string[]) {
    return this.commentService.bulkDeleteComments(commentIds);
  }
} 