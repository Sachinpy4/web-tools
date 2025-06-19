import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { SchedulerService } from '../services/scheduler.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  UpdateSystemSettingsDto,
  CleanupOptionsDto,
  DatabaseOperationDto,
  SystemSettingsResponseDto,
  SystemStatsResponseDto,
  CleanupResponseDto,
} from '../dto/admin.dto';
import { 
  CreateSchedulerConfigDto, 
  UpdateSchedulerConfigDto, 
  SchedulerConfigResponseDto,
  SchedulerStatusDto,
  SchedulerTaskType 
} from '../dto/scheduler-config.dto';

@ApiTags('Admin Panel')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Get system settings',
    description: 'Retrieve current system configuration including worker settings, rate limits, and cleanup options. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System settings retrieved successfully',
    type: SystemSettingsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Update system settings',
    description: 'Update system configuration including performance settings, rate limits, and file upload constraints. Changes take effect for new requests. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System settings updated successfully',
    type: SystemSettingsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid settings provided',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async updateSystemSettings(
    @Body() updateSystemSettingsDto: UpdateSystemSettingsDto,
    @GetUser() user: any,
  ) {
    return this.adminService.updateSystemSettings(updateSystemSettingsDto, user.email);
  }

  @Get('settings/rate-limits')
  @ApiOperation({
    summary: 'Get rate limit settings',
    description: 'Retrieve current rate limiting configuration for different API endpoints. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit settings retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getRateLimitSettings() {
    return this.adminService.getRateLimitSettings();
  }

  @Get('settings/file-upload')
  @ApiOperation({
    summary: 'Get file upload settings',
    description: 'Retrieve current file upload constraints including maximum file size and file count limits. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File upload settings retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getFileUploadSettings() {
    return this.adminService.getFileUploadSettings();
  }

  @Post('cleanup')
  @ApiOperation({
    summary: 'Run system cleanup',
    description: 'Execute system cleanup operations including images, logs, cache, database, and memory cleanup. Specify the cleanup type in the request body. Optionally set up automatic cleanup scheduling. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup operation completed successfully',
    type: CleanupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid cleanup type',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Cleanup operation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async cleanupSystem(@Body() cleanupOptionsDto: CleanupOptionsDto) {
    return this.adminService.cleanupImages(cleanupOptionsDto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get comprehensive system statistics',
    description: 'Retrieve detailed system information including memory usage, database statistics, file system usage, and application metrics. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System statistics retrieved successfully',
    type: SystemStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('system-status')
  @ApiOperation({
    summary: 'Get real-time system status',
    description: 'Retrieve real-time system status including Redis connection, cache version, load average, memory usage, and queue health. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getSystemStatus() {
    return this.adminService.getSystemStatus();
  }

  @Post('test/:testType')
  @ApiOperation({
    summary: 'Test system settings',
    description: 'Test specific system settings configurations to verify they work correctly. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Settings test completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid test type or settings',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async testSettings(
    @Param('testType') testType: string,
    @Body() settings: any,
  ) {
    return this.adminService.testSettings(testType, settings);
  }

  @Post('database')
  @ApiOperation({
    summary: 'Perform database operations',
    description: 'Execute database maintenance operations including compaction, repair, and reindexing. Can target specific collections or operate on all collections. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Database operation completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid database operation',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Database operation failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async performDatabaseOperation(@Body() databaseOperationDto: DatabaseOperationDto) {
    return this.adminService.performDatabaseOperation(databaseOperationDto);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get system health status',
    description: 'Check the health status of all system components including database connectivity, memory usage, and disk space. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getHealthStatus() {
    return this.adminService.getHealthStatus();
  }

  // SCHEDULER ENDPOINTS

  @Get('scheduler')
  @ApiOperation({
    summary: 'Get all scheduler configurations',
    description: 'Retrieve all scheduled task configurations including their status and next execution times. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler configurations retrieved successfully',
    type: [SchedulerConfigResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getSchedulerConfigs(): Promise<SchedulerConfigResponseDto[]> {
    return this.adminService.getSchedulerConfigs();
  }

  @Get('scheduler/status')
  @ApiOperation({
    summary: 'Get scheduler status overview',
    description: 'Get comprehensive scheduler status including enabled/disabled task counts and next execution times. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler status retrieved successfully',
    type: SchedulerStatusDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getSchedulerStatus(): Promise<SchedulerStatusDto> {
    return this.adminService.getSchedulerStatus();
  }

  @Get('scheduler/runtime-status')
  @ApiOperation({
    summary: 'Get real-time scheduler status',
    description: 'Get real-time status of running schedulers including active state and next execution times. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Runtime scheduler status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getRuntimeSchedulerStatus() {
    return {
      status: 'success',
      data: this.schedulerService.getSchedulerStatus(),
    };
  }

  @Post('scheduler')
  @ApiOperation({
    summary: 'Create or update scheduler configuration',
    description: 'Create a new scheduled task or update an existing one. Automatically calculates next execution time. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler configuration created/updated successfully',
    type: SchedulerConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid scheduler configuration',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async createOrUpdateSchedulerConfig(@Body() createDto: CreateSchedulerConfigDto): Promise<SchedulerConfigResponseDto> {
    return this.adminService.createOrUpdateSchedulerConfig(createDto);
  }

  @Put('scheduler/:type')
  @ApiOperation({
    summary: 'Update scheduler configuration',
    description: 'Update specific fields of an existing scheduled task configuration. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler configuration updated successfully',
    type: SchedulerConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid scheduler configuration or task type not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async updateSchedulerConfig(
    @Param('type') type: SchedulerTaskType,
    @Body() updateDto: UpdateSchedulerConfigDto,
  ): Promise<SchedulerConfigResponseDto> {
    return this.adminService.updateSchedulerConfig(type, updateDto);
  }

  @Delete('scheduler/:type')
  @ApiOperation({
    summary: 'Delete scheduler configuration',
    description: 'Remove a scheduled task configuration completely. This will stop the task from running. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler configuration deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Task type not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async deleteSchedulerConfig(@Param('type') type: SchedulerTaskType): Promise<{ message: string }> {
    await this.adminService.deleteSchedulerConfig(type);
    return { message: `Scheduler configuration for ${type} deleted successfully` };
  }
} 