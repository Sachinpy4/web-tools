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
  UseInterceptors,
  UploadedFiles,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { MediaService } from '../services/media.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  UploadMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
  BulkDeleteDto,
  BulkUpdateDto,
  MediaResponseDto,
  MediaListResponseDto,
  MediaStatsResponseDto,
} from '../dto/media.dto';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files at once
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload media files',
    description: 'Upload one or more media files to the media library. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Media files uploaded successfully',
    type: MediaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No files uploaded or invalid file data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async uploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadMediaDto: UploadMediaDto,
    @GetUser() user: any,
  ) {
    return this.mediaService.uploadMedia(files, uploadMediaDto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all media items with pagination and filters',
    description: 'Retrieve media items with advanced filtering, searching, and pagination. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media items retrieved successfully',
    type: MediaListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getMediaItems(@Query() query: MediaQueryDto) {
    return this.mediaService.getMediaItems(query);
  }

  @Get('file/:folder/:filename')
  @ApiOperation({
    summary: 'Serve a media file',
    description: 'Serve a media file from the specified folder. Public access.',
  })
  @ApiParam({
    name: 'folder',
    description: 'Folder name (e.g., blogs)',
    example: 'blogs',
  })
  @ApiParam({
    name: 'filename',
    description: 'File name',
    example: 'blog-mountain-landscape-12345678.jpg',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File served successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  async serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const fileInfo = await this.mediaService.serveFile(folder, filename);
    res.setHeader('Content-Type', fileInfo.mimetype);
    res.sendFile(fileInfo.path, { root: '.' });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get media statistics',
    description: 'Retrieve comprehensive media statistics including file counts, sizes, and usage data. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media statistics retrieved successfully',
    type: MediaStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getMediaStats() {
    return this.mediaService.getMediaStats();
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recent uploads',
    description: 'Retrieve the most recently uploaded media files. Admin access required.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recent uploads to retrieve',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent uploads retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getRecentUploads(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.mediaService.getRecentUploads(limitNumber);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search media by text',
    description: 'Search media files by text in filename, alt text, title, description, or tags. Admin access required.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    example: 'mountain landscape',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of results to return',
    example: 20,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async searchMedia(@Query('q') searchTerm: string, @Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    return this.mediaService.searchMedia(searchTerm, limitNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a single media item',
    description: 'Retrieve detailed information about a specific media item. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media item ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media item retrieved successfully',
    type: MediaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Media item not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getMediaItem(@Param('id') id: string) {
    return this.mediaService.getMediaItem(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a media item',
    description: 'Update metadata for a media item (alt text, title, description, tags). Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media item ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media item updated successfully',
    type: MediaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Media item not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async updateMediaItem(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    return this.mediaService.updateMediaItem(id, updateMediaDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a media item',
    description: 'Delete a media item and its associated file. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media item ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media item deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Media item not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async deleteMediaItem(@Param('id') id: string) {
    return this.mediaService.deleteMediaItem(id);
  }

  @Put(':id/usage')
  @ApiOperation({
    summary: 'Increment usage counter',
    description: 'Increment the usage counter for a media item. Public access for tracking.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media item ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage counter incremented successfully',
  })
  async incrementUsage(@Param('id') id: string) {
    await this.mediaService.incrementUsage(id);
    return {
      status: 'success',
      message: 'Usage counter incremented',
    };
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk delete media items',
    description: 'Delete multiple media items and their associated files at once. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media items deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async bulkDeleteMedia(@Body() bulkDeleteDto: BulkDeleteDto) {
    return this.mediaService.bulkDeleteMedia(bulkDeleteDto);
  }

  @Put('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk update media items',
    description: 'Update multiple media items at once (add/remove tags). Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media items updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No update operations specified',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async bulkUpdateMedia(@Body() bulkUpdateDto: BulkUpdateDto) {
    return this.mediaService.bulkUpdateMedia(bulkUpdateDto);
  }
} 