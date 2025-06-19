import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { BackupService } from '../services/backup.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  CreateBackupDto,
  RestoreBackupDto,
  BackupFilterDto,
  BackupResponseDto,
  BackupListResponseDto,
  BackupStatsResponseDto,
} from '../dto/backup.dto';

@ApiTags('Backup & Restore')
@Controller('admin/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all backups',
    description: 'Retrieve all database backups with filtering and pagination. Shows backup history, status, and metadata. Admin access required.',
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by backup type',
    example: 'manual',
    enum: ['manual', 'scheduled', 'auto'],
    required: false,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by backup status',
    example: 'completed',
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    required: false,
  })
  @ApiQuery({
    name: 'dateFrom',
    description: 'Filter by date from (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @ApiQuery({
    name: 'dateTo',
    description: 'Filter by date to (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backups retrieved successfully',
    type: BackupListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getAllBackups(@Query() filterDto: BackupFilterDto) {
    return this.backupService.getAllBackups(filterDto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get backup statistics',
    description: 'Retrieve comprehensive backup statistics including total count, size distribution, type distribution, and success rates. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backup statistics retrieved successfully',
    type: BackupStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getBackupStats() {
    return this.backupService.getBackupStats();
  }

  @Get('restore-history')
  @ApiOperation({
    summary: 'Get restore history',
    description: 'Retrieve history of all database restore operations. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restore history retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getRestoreHistory() {
    return this.backupService.getRestoreHistory();
  }

  @Get('restore/preview')
  @ApiOperation({
    summary: 'Preview restore operation',
    description: 'Preview what would be restored from a backup without actually performing the restore. Shows backup info, collections, and estimated data. Admin access required.',
  })
  @ApiQuery({
    name: 'backupId',
    description: 'Backup ID to preview',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @ApiQuery({
    name: 'collections',
    description: 'Comma-separated list of collections to preview (optional)',
    example: 'users,blogs,comments',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Restore preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            backupInfo: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'full' },
                timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
                version: { type: 'string', example: '1.0' },
              },
            },
            collectionsToRestore: {
              type: 'array',
              items: { type: 'string' },
              example: ['users', 'blogs', 'comments'],
            },
            totalDocuments: { type: 'number', example: 1500 },
            estimatedSize: { type: 'string', example: '2.5 MB' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backup not found or backup file missing',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid backup ID or preview generation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getRestorePreview(
    @Query('backupId') backupId: string,
    @Query('collections') collections?: string,
  ) {
    return this.backupService.getRestorePreview(backupId, collections);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download backup file',
    description: 'Download a backup file by its ID. The file will be streamed as an attachment. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Backup ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backup file downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backup or backup file not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    return this.backupService.downloadBackup(id, res);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get backup by ID',
    description: 'Retrieve a specific backup by its ID with detailed information including metadata and history. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Backup ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backup retrieved successfully',
    type: BackupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backup not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getBackupById(@Param('id') id: string) {
    return this.backupService.getBackupById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create database backup',
    description: 'Create a new database backup with optional collection filtering and compression. Supports manual, scheduled, and automatic backup types. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Backup created successfully',
    type: BackupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid backup configuration or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async createBackup(
    @Body() createBackupDto: CreateBackupDto,
    @GetUser() user: any,
  ) {
    return this.backupService.createBackup(createBackupDto, user.id);
  }

  @Post('restore')
  @ApiOperation({
    summary: 'Restore database from backup',
    description: 'Restore database from an existing backup with optional collection filtering and drop existing data option. This is a destructive operation that should be used with caution. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Database restored successfully',
    type: BackupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backup not found or backup file missing',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot restore from incomplete backup or invalid configuration',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async restoreBackup(
    @Body() restoreBackupDto: RestoreBackupDto,
    @GetUser() user: any,
  ) {
    return this.backupService.restoreBackup(restoreBackupDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete backup',
    description: 'Permanently delete a backup record and its associated file. This action cannot be undone. Admin access required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Backup ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Backup deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Backup not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async deleteBackup(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    return this.backupService.deleteBackup(id, user.id);
  }
} 