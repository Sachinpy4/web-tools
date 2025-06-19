import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SeoService } from '../services/seo.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  CreatePageSeoDto,
  UpdatePageSeoDto,
  InitializeDefaultSeoDto,
  PageSeoResponseDto,
  BlogSeoResponseDto,
} from '../dto/seo.dto';

@ApiTags('SEO Management')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  // Public route for getting SEO data (used by frontend pages)
  @Get('page/:pagePath')
  @ApiOperation({
    summary: 'Get SEO data for a specific page',
    description: 'Retrieve SEO metadata for any page including blogs. Supports both page SEO and dynamic blog SEO. Public endpoint used by frontend.',
  })
  @ApiParam({
    name: 'pagePath',
    description: 'Page path (e.g., "home", "blog", "image/compress", "blog/my-blog-post")',
    example: 'image/compress',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SEO data retrieved successfully',
    type: PageSeoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'SEO settings not found for this page',
  })
  async getPageSeo(@Param('pagePath') pagePath: string) {
    return this.seoService.getPageSeo(pagePath);
  }

  // Admin SEO management routes
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all page SEO settings',
    description: 'Retrieve all page SEO configurations for admin management. Shows both active and inactive settings. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All page SEO settings retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getAllPageSeo() {
    return this.seoService.getAllPageSeo();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new page SEO settings',
    description: 'Create SEO configuration for a new page including meta tags, Open Graph, and Twitter cards. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Page SEO settings created successfully',
    type: PageSeoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'SEO settings already exist for this page or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async createPageSeo(@Body() createPageSeoDto: CreatePageSeoDto) {
    return this.seoService.createPageSeo(createPageSeoDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update page SEO settings',
    description: 'Update existing SEO configuration for a page. All fields are optional for partial updates. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Page SEO settings ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page SEO settings updated successfully',
    type: PageSeoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page SEO settings not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async updatePageSeo(
    @Param('id') id: string,
    @Body() updatePageSeoDto: UpdatePageSeoDto,
  ) {
    return this.seoService.updatePageSeo(id, updatePageSeoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete page SEO settings',
    description: 'Permanently delete SEO configuration for a page. This action cannot be undone. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Page SEO settings ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page SEO settings deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page SEO settings not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async deletePageSeo(@Param('id') id: string) {
    return this.seoService.deletePageSeo(id);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Toggle page SEO status',
    description: 'Enable or disable SEO settings for a page. Disabled settings will not be returned by the public API. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Page SEO settings ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page SEO status toggled successfully',
    type: PageSeoResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Page SEO settings not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async togglePageSeoStatus(@Param('id') id: string) {
    return this.seoService.togglePageSeoStatus(id);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize default SEO settings',
    description: 'Create default SEO configurations for common pages (homepage, tools, blog). Useful for initial setup or after system reset. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default SEO settings initialized successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async initializeDefaultSeo(@Body() initializeDefaultSeoDto: InitializeDefaultSeoDto) {
    return this.seoService.initializeDefaultSeo(initializeDefaultSeoDto);
  }
} 