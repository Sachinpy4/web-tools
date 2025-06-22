import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './modules/admin/services/admin.service';

@ApiTags('Public API')
@Controller()
export class AppController {
  constructor(private readonly adminService: AdminService) {}
  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Simple health check to verify the server is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'Service is running' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      message: 'Service is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/settings/file-upload')
  @ApiOperation({
    summary: 'Get file upload settings (Public)',
    description: 'Retrieve current file upload constraints for public tools. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'File upload settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            maxFileSize: { type: 'number', example: 52428800 },
            maxFiles: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  async getFileUploadSettings() {
    return this.adminService.getFileUploadSettings();
  }

  @Get('admin/settings/rate-limits')
  @ApiOperation({
    summary: 'Get rate limit settings (Public)',
    description: 'Retrieve current rate limiting configuration for public tools. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limit settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            imageProcessing: {
              type: 'object',
              properties: {
                max: { type: 'number', example: 50 },
                windowMs: { type: 'number', example: 300000 },
              },
            },
            batchOperation: {
              type: 'object',
              properties: {
                max: { type: 'number', example: 15 },
                windowMs: { type: 'number', example: 600000 },
              },
            },
            api: {
              type: 'object',
              properties: {
                max: { type: 'number', example: 1000 },
                windowMs: { type: 'number', example: 900000 },
              },
            },
          },
        },
      },
    },
  })
  async getRateLimitSettings() {
    return this.adminService.getRateLimitSettings();
  }

  @Get('admin/settings/polling')
  @ApiOperation({
    summary: 'Get polling configuration (Public)',
    description: 'Retrieve current polling configuration for frontend real-time updates. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Polling settings retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            jobStatusPollingIntervalMs: { type: 'number', example: 2000 },
            processingModePollingIntervalMs: { type: 'number', example: 30000 },
            processingModeMaxPollingIntervalMs: { type: 'number', example: 300000 },
            maxPollingAttempts: { type: 'number', example: 60 },
            enableAdaptivePolling: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async getPollingSettings() {
    return this.adminService.getPollingSettings();
  }

  @Get('favicon.ico')
  @ApiOperation({ summary: 'Favicon' })
  getFavicon(@Res() res: Response) {
    // Return a 204 No Content to prevent favicon 404 errors
    res.status(204).send();
  }
} 