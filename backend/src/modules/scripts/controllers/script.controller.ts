import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ScriptService } from '../services/script.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  CreateScriptDto,
  UpdateScriptDto,
  ScriptResponseDto,
  ScriptsListResponseDto,
} from '../dto/script.dto';

@ApiTags('Script Management')
@Controller('scripts')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  // Public route for getting scripts for a specific page
  @Get('public')
  @ApiOperation({
    summary: 'Get scripts for a specific page',
    description: 'Retrieve active scripts for a specific page based on targeting rules. Used by frontend to load analytics and tracking scripts. Public endpoint with security filtering.',
  })
  @ApiQuery({
    name: 'pathname',
    description: 'Page pathname to get scripts for',
    example: '/image/compress',
    required: true,
  })
  @ApiQuery({
    name: 'placement',
    description: 'Filter scripts by placement (optional)',
    example: 'head',
    enum: ['head', 'body', 'footer'],
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scripts retrieved successfully',
    type: ScriptsListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid pathname provided',
  })
  async getScriptsForPage(
    @Query('pathname') pathname: string,
    @Query('placement') placement?: string,
  ) {
    return this.scriptService.getScriptsForPage(pathname, placement);
  }

  // Admin script management routes
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all scripts',
    description: 'Retrieve all scripts for admin management. Shows both active and inactive scripts with creator information. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All scripts retrieved successfully',
    type: ScriptsListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getAllScripts() {
    return this.scriptService.getAllScripts();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get script statistics',
    description: 'Retrieve comprehensive statistics about scripts including platform distribution, placement distribution, and activity status. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Script statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getScriptStats() {
    return this.scriptService.getScriptStats();
  }

  @Get('platform/:platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get scripts by platform',
    description: 'Retrieve all active scripts for a specific platform (e.g., Google Analytics, Facebook Pixel). Admin access required.',
  })
  @ApiParam({
    name: 'platform',
    description: 'Platform name',
    example: 'Google Analytics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scripts retrieved successfully',
    type: ScriptsListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getScriptsByPlatform(@Param('platform') platform: string) {
    return this.scriptService.getScriptsByPlatform(platform);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get script by ID',
    description: 'Retrieve a specific script by its ID with creator information. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Script ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Script retrieved successfully',
    type: ScriptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Script not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getScriptById(@Param('id') id: string) {
    return this.scriptService.getScriptById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new script',
    description: 'Create a new script for analytics, tracking, or custom functionality. Supports targeting specific pages and placement control. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Script created successfully',
    type: ScriptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid script data or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async createScript(
    @Body() createScriptDto: CreateScriptDto,
    @GetUser() user: any,
  ) {
    return this.scriptService.createScript(createScriptDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update script',
    description: 'Update an existing script. All fields are optional for partial updates. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Script ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Script updated successfully',
    type: ScriptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Script not found',
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
  async updateScript(
    @Param('id') id: string,
    @Body() updateScriptDto: UpdateScriptDto,
  ) {
    return this.scriptService.updateScript(id, updateScriptDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete script',
    description: 'Permanently delete a script. This action cannot be undone. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Script ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Script deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Script not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async deleteScript(@Param('id') id: string) {
    return this.scriptService.deleteScript(id);
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Toggle script status',
    description: 'Enable or disable a script. Disabled scripts will not be loaded on any pages. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Script ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Script status toggled successfully',
    type: ScriptResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Script not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async toggleScriptStatus(@Param('id') id: string) {
    return this.scriptService.toggleScriptStatus(id);
  }
} 