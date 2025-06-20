import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  ParseIntPipe,
  Query,
  Res,
  BadRequestException,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import archiver from 'archiver';
import { ImageService } from '../services/image.service';
import { QueueService } from '../services/queue.service';
import { DynamicThrottlerGuard } from '../../../common/guards/dynamic-throttler.guard';

import { 
  CompressImageDto, 
  CompressResultDto, 
  JobStatusDto,
  CompressJobData 
} from '../dto/compress-image.dto';

// Multer configuration (exactly as original)
const imageStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const imageFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/avif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

@ApiTags('images')
@Controller('images')
@UseGuards(DynamicThrottlerGuard)
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);

  constructor(
    private readonly imageService: ImageService,
    private readonly queueService: QueueService,
  ) {}

  // COMPRESS IMAGE - Exact same endpoint as original /api/images/compress
  @Post('compress')
  @ApiOperation({ summary: 'Compress image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 200, 
    description: 'Image compression job created',
    type: CompressResultDto 
  })
  @UseInterceptors(FileInterceptor('image', {
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 104857600, // 100MB max (dynamic validation will enforce admin settings)
    },
  }))
  async compressImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CompressImageDto,
  ): Promise<CompressResultDto> {
    try {
      if (!file) {
        throw new BadRequestException('No image file uploaded');
      }

      console.log('🔍 COMPRESS REQUEST:', {
        filename: file.originalname,
        size: file.size,
        quality: dto.quality,
        path: file.path
      });

      // Validate file (same as original)
      await this.imageService.validateImageFile(file);

      // Quick Redis availability check without full stats (optimization)
      const isRedisAvailable = this.queueService.isRedisQuickAvailable();
      console.log('🔍 REDIS AVAILABLE:', isRedisAvailable);

      // If Redis is not available, process image directly (same as original backend)
      if (!isRedisAvailable) {
        console.log('⚡ DIRECT PROCESSING - Redis unavailable, processing image directly:', file.originalname);
        
        try {
          const result = await this.imageService.compressImage(
            file.path,
            dto.quality || 80,
            file.originalname
          );

          console.log('✅ DIRECT PROCESSING RESULT:', {
            outputPath: result.outputPath,
            originalSize: result.originalSize,
            processedSize: result.processedSize,
            compressionRatio: result.compressionRatio,
            metadata: result.metadata
          });

          const filename = result.outputPath.split('/').pop() || result.outputPath.split('\\').pop();
          console.log('📁 EXTRACTED FILENAME:', filename);

          // Return immediate response with same structure as original backend
          const response = {
            status: 'success',
            data: {
              originalSize: file.size,
              compressedSize: result.processedSize,
              compressionRatio: result.compressionRatio,
              mime: result.metadata.format || 'image/jpeg',
              filename: filename,
              originalFilename: file.originalname,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(file.originalname)}`
            }
          };
          
          console.log('📤 DIRECT PROCESSING RESPONSE:', response);
          return response as any;
        } catch (error) {
          console.error('❌ DIRECT COMPRESSION FAILED:', {
            filename: file.originalname,
            error: error.message,
            stack: error.stack
          });
          throw new BadRequestException(`Image compression failed: ${error.message}`);
        }
      }

      // Redis is available, use queue processing
      console.log('🚀 QUEUE PROCESSING - Redis available, using queue');
      
      const jobData: CompressJobData = {
        filePath: file.path,
        quality: dto.quality || 80,
        originalFilename: file.originalname,
        originalSize: file.size,
        webhookUrl: dto.webhookUrl,
      };

      console.log('📝 JOB DATA:', jobData);

      // Add to queue (same logic as original - Redis processing)
      const jobId = await this.queueService.addCompressJob(jobData);
      console.log('✅ JOB CREATED:', jobId);

      const queueResponse = {
        status: 'processing',
        message: 'Image compression job queued',
        data: {
          jobId,
          statusUrl: `/api/images/status/${jobId}?type=compress`
        }
      };
      
      console.log('📤 QUEUE PROCESSING RESPONSE:', queueResponse);
      return queueResponse as any;
    } catch (error) {
      console.error('❌ COMPRESS IMAGE FAILED:', {
        error: error.message,
        stack: error.stack,
        filename: file?.originalname
      });
      throw error;
    }
  }

  // RESIZE IMAGE - Exact same endpoint as original /api/images/resize
  @Post('resize')
  @ApiOperation({ summary: 'Resize image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', {
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 104857600 }, // 100MB max (dynamic validation enforces admin settings)
  }))
  async resizeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('width', ParseIntPipe) width: number,
    @Body('height', ParseIntPipe) height: number,
    @Body('maintainAspectRatio') maintainAspectRatio?: string,
    @Body('webhookUrl') webhookUrl?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No image file uploaded');
      }

      this.logger.log(`Resize request: ${file.originalname}, ${width}x${height}`);

      await this.imageService.validateImageFile(file);

      // Check if Redis is available for queue processing
      const queueStats = await this.queueService.getQueueStats();
      const isRedisAvailable = queueStats.redis === 'available';

      // If Redis is not available, process image directly (same as original backend)
      if (!isRedisAvailable) {
        this.logger.log(`Redis unavailable, processing resize directly: ${file.originalname}`);
        
        try {
          const result = await this.imageService.resizeImage(
            file.path,
            width,
            height,
            file.originalname,
            maintainAspectRatio === 'true'
          );

          const filename = result.outputPath.split('/').pop() || result.outputPath.split('\\').pop();

          // Return immediate response with same structure as original backend
          return {
            status: 'success',
            data: {
              width: result.dimensions.width,
              height: result.dimensions.height,
              mime: result.metadata.format || 'image/jpeg',
              filename: filename,
              originalFilename: file.originalname,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(file.originalname)}`
            }
          };
        } catch (error) {
          this.logger.error(`Direct resize failed for ${file.originalname}:`, error);
          throw new BadRequestException(`Image resize failed: ${error.message}`);
        }
      }

      // Redis is available, use queue processing
      const jobData = {
        filePath: file.path,
        width,
        height,
        originalFilename: file.originalname,
        originalSize: file.size,
        maintainAspectRatio: maintainAspectRatio === 'true',
        webhookUrl,
      };

      const jobId = await this.queueService.addResizeJob(jobData);

      return {
        status: 'processing',
        message: 'Image resize job queued',
        data: {
          jobId,
          statusUrl: `/api/images/status/${jobId}?type=resize`
        }
      };
    } catch (error) {
      this.logger.error('Resize image failed:', error);
      throw error;
    }
  }

  // CONVERT FORMAT - Exact same endpoint as original /api/images/convert
  @Post('convert')
  @ApiOperation({ summary: 'Convert image format' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', {
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 104857600 }, // 100MB max (dynamic validation enforces admin settings)
  }))
  async convertFormat(
    @UploadedFile() file: Express.Multer.File,
    @Body('format') format: string,
    @Body('quality') qualityStr?: string,
    @Body('webhookUrl') webhookUrl?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No image file uploaded');
      }

      if (!format) {
        throw new BadRequestException('Target format is required');
      }

      // Parse quality parameter with default value
      const quality = qualityStr ? parseInt(qualityStr, 10) : 80;
      if (qualityStr && (isNaN(quality) || quality < 1 || quality > 100)) {
        throw new BadRequestException('Quality must be a number between 1 and 100');
      }

      this.logger.log(`Convert request: ${file.originalname} to ${format} (quality: ${quality})`);

      await this.imageService.validateImageFile(file);

      // Check if Redis is available for queue processing
      const queueStats = await this.queueService.getQueueStats();
      const isRedisAvailable = queueStats.redis === 'available';

      // If Redis is not available, process image directly (same as original backend)  
      if (!isRedisAvailable) {
        this.logger.log(`Redis unavailable, processing convert directly: ${file.originalname}`);
        
        try {
          const result = await this.imageService.convertFormat(
            file.path,
            format.toLowerCase(),
            file.originalname,
            quality || 80
          );

          const filename = result.outputPath.split('/').pop() || result.outputPath.split('\\').pop();

          // Return immediate response with same structure as original backend
          return {
            status: 'success',
            data: {
              originalFormat: file.originalname.split('.').pop(),
              convertedFormat: format.toLowerCase(),
              mime: result.metadata.format || `image/${format.toLowerCase()}`,
              filename: filename,
              originalFilename: file.originalname,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(file.originalname)}`
            }
          };
        } catch (error) {
          this.logger.error(`Direct conversion failed for ${file.originalname}:`, error);
          throw new BadRequestException(`Image conversion failed: ${error.message}`);
        }
      }

      // Redis is available, use queue processing
      const jobData = {
        filePath: file.path,
        format: format.toLowerCase(),
        quality: quality || 80,
        originalFilename: file.originalname,
        originalSize: file.size,
        webhookUrl,
      };

      const jobId = await this.queueService.addConvertJob(jobData);

      return {
        status: 'processing',
        message: 'Image conversion job queued',
        data: {
          jobId,
          statusUrl: `/api/images/status/${jobId}?type=convert`
        }
      };
    } catch (error) {
      this.logger.error('Convert format failed:', error);
      throw error;
    }
  }

  // CROP IMAGE - Exact same endpoint as original /api/images/crop
  @Post('crop')
  @ApiOperation({ summary: 'Crop image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', {
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 104857600 }, // 100MB max (dynamic validation enforces admin settings)
  }))
  async cropImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('left', ParseIntPipe) x: number,
    @Body('top', ParseIntPipe) y: number,
    @Body('width', ParseIntPipe) width: number,
    @Body('height', ParseIntPipe) height: number,
    @Body('webhookUrl') webhookUrl?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No image file uploaded');
      }

      this.logger.log(`Crop request: ${file.originalname}, ${x},${y} ${width}x${height}`);

      await this.imageService.validateImageFile(file);

      // Check if Redis is available for queue processing
      const queueStats = await this.queueService.getQueueStats();
      const isRedisAvailable = queueStats.redis === 'available';

      // If Redis is not available, process image directly (same as original backend)
      if (!isRedisAvailable) {
        this.logger.log(`Redis unavailable, processing crop directly: ${file.originalname}`);
        
        try {
          const result = await this.imageService.cropImage(
            file.path,
            { x, y, width, height },
            file.originalname
          );

          const filename = result.outputPath.split('/').pop() || result.outputPath.split('\\').pop();

          // Return immediate response with same structure as original backend
          return {
            status: 'success',
            data: {
              width: result.dimensions.width,
              height: result.dimensions.height,
              cropArea: { x, y, width, height },
              mime: result.metadata.format || 'image/jpeg',
              filename: filename,
              originalFilename: file.originalname,
              downloadUrl: `/api/images/download/${filename}?originalFilename=${encodeURIComponent(file.originalname)}`
            }
          };
        } catch (error) {
          this.logger.error(`Direct crop failed for ${file.originalname}:`, error);
          throw new BadRequestException(`Image crop failed: ${error.message}`);
        }
      }

      // Redis is available, use queue processing
      const jobData = {
        filePath: file.path,
        crop: { x, y, width, height },
        originalFilename: file.originalname,
        originalSize: file.size,
        webhookUrl,
      };

      const jobId = await this.queueService.addCropJob(jobData);

      return {
        status: 'processing',
        message: 'Image crop job queued',
        data: {
          jobId,
          statusUrl: `/api/images/status/${jobId}?type=crop`
        }
      };
    } catch (error) {
      this.logger.error('Crop image failed:', error);
      throw error;
    }
  }

  // BATCH PROCESSING - Exact same endpoint as original /api/images/batch
  @Post('batch/:operation')
  @ApiOperation({ summary: 'Batch process images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { // Max 10 files (same as original)
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 104857600 }, // 100MB max (dynamic validation enforces admin settings)
  }))
  async batchProcess(
    @Param('operation') operation: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() options: any,
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No image files uploaded');
      }

      const allowedOperations = ['compress', 'resize', 'convert', 'crop'];
      if (!allowedOperations.includes(operation)) {
        throw new BadRequestException(`Invalid operation. Allowed: ${allowedOperations.join(', ')}`);
      }

      this.logger.log(`Batch ${operation} request: ${files.length} files`);

      // Validate all files
      for (const file of files) {
        await this.imageService.validateImageFile(file);
      }

      const jobData = {
        operation,
        filePaths: files.map(f => f.path),
        originalFilenames: files.map(f => f.originalname),
        options: {
          quality: parseInt(options.quality) || 80,
          width: parseInt(options.width),
          height: parseInt(options.height),
          format: options.format,
          maintainAspectRatio: options.maintainAspectRatio === 'true',
          crop: options.crop ? JSON.parse(options.crop) : undefined,
        },
        webhookUrl: options.webhookUrl,
      };

      const jobId = await this.queueService.addBatchJob(jobData);

      return {
        jobId,
        status: 'queued',
        message: `Batch ${operation} job queued successfully`,
        fileCount: files.length,
      };
    } catch (error) {
      this.logger.error('Batch process failed:', error);
      throw error;
    }
  }

  // JOB STATUS - Exact same endpoint as original /api/images/status/:jobId
  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get job status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Job status retrieved',
    type: JobStatusDto 
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Query('type') queueType: string = 'compress',
  ): Promise<JobStatusDto> {
    try {
      console.log('🔍 BACKEND - Getting job status:', { jobId, queueType });
      
      const status = await this.queueService.getJobStatus(jobId, queueType);
      
      console.log('📊 BACKEND - Job status from queue service:', status);
      
      if (!status) {
        console.log('❌ BACKEND - Job not found:', jobId);
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      const response = {
        id: status.id,
        state: status.state,
        progress: status.progress,
        result: status.result,
        error: status.error,
        queuePosition: status.queuePosition,
        estimatedWaitTime: status.estimatedWaitTime,
      };
      
      console.log('📤 BACKEND - Job status response:', response);
      return response;
    } catch (error) {
      console.error('❌ BACKEND - Get job status failed:', { jobId, error: error.message });
      this.logger.error(`Get job status failed for ${jobId}:`, error);
      throw error;
    }
  }

  // CREATE ARCHIVE - Archive multiple processed files into a ZIP
  @Post('archive')
  @ApiOperation({ summary: 'Create archive of processed files' })
  @ApiResponse({ 
    status: 200, 
    description: 'Archive created successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            downloadUrl: { type: 'string', example: '/api/images/download/archive-12345.zip' }
          }
        }
      }
    }
  })
  async createArchive(
    @Body() body: { files: Array<{ filename: string; originalName: string }> }
  ) {
    try {
      if (!body.files || body.files.length === 0) {
        throw new BadRequestException('No files specified for archive');
      }

      this.logger.log(`Creating archive for ${body.files.length} files`);

      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      const processedDir = path.join(uploadDir, 'processed');
      const archiveDir = path.join(uploadDir, 'archives');
      
      // Ensure archive directory exists
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      // Generate unique archive filename
      const archiveId = uuidv4();
      const archiveFilename = `tool-archive-${archiveId}.zip`;
      const archivePath = path.join(archiveDir, archiveFilename);

      // Create archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = fs.createWriteStream(archivePath);
      
      archive.pipe(output);

      // Add files to archive
      let addedFiles = 0;
      for (const fileInfo of body.files) {
        // Extract just the filename from the path (in case full path is provided)
        const actualFilename = path.basename(fileInfo.filename);
        const filePath = path.join(processedDir, actualFilename);
        
                if (fs.existsSync(filePath)) {
          // Use original name if provided, otherwise use filename
          const nameInArchive = fileInfo.originalName || fileInfo.filename;
          archive.file(filePath, { name: nameInArchive });
          addedFiles++;
        } else {
          this.logger.warn(`File not found for archive: ${actualFilename}`);
        }
      }

      if (addedFiles === 0) {
        throw new BadRequestException('No valid files found for archive');
      }

      await archive.finalize();

      // Wait for archive to complete
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', reject);
      });

      this.logger.log(`Archive created: ${archiveFilename} with ${addedFiles} files`);

      return {
        status: 'success',
        data: {
          downloadUrl: `/api/images/download/${archiveFilename}`
        }
      };
    } catch (error) {
      this.logger.error('Archive creation failed:', error);
      throw error;
    }
  }

  // DOWNLOAD FILE - Support both filename and full path patterns
  @Get('download/:filename(*)')
  @ApiOperation({ summary: 'Download processed image' })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      // Handle both formats: just filename or full path
      let actualFilename = filename;
      
      // If filename contains path separators, extract just the filename
      if (filename.includes('/') || filename.includes('\\')) {
        actualFilename = path.basename(filename);
        this.logger.warn(`Received full path in download request, extracting filename: ${filename} -> ${actualFilename}`);
      }

      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      const processedDir = path.join(uploadDir, 'processed');
      const archiveDir = path.join(uploadDir, 'archives');
      
      // Check processed files first (same priority as original)
      let filePath = path.join(processedDir, actualFilename);
      
      if (!fs.existsSync(filePath)) {
        // Check archive files
        filePath = path.join(archiveDir, actualFilename);
      }

      if (!fs.existsSync(filePath)) {
        this.logger.error(`File not found: ${actualFilename} (original request: ${filename})`);
        throw new NotFoundException('File not found');
      }

      // Validate filename to prevent directory traversal (same as original)
      if (actualFilename.includes('..')) {
        throw new BadRequestException('Invalid filename');
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      // Set headers (same as original)
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Type', this.getMimeType(actualFilename));
      res.setHeader('Content-Disposition', `attachment; filename="${actualFilename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      this.logger.log(`Download: ${actualFilename} (${fileSize} bytes)`);

      // Stream file (same as original)
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Download failed for ${filename}:`, error);
      throw error;
    }
  }

  // QUEUE STATS - Same as original /api/images/queue/stats
  @Get('queue/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats() {
    try {
      return await this.queueService.getQueueStats();
    } catch (error) {
      this.logger.error('Get queue stats failed:', error);
      throw error;
    }
  }

  // HEALTH CHECK - Same as original /api/images/health
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  // Helper method (same as original)
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.tiff': 'image/tiff',
      '.avif': 'image/avif',
      '.zip': 'application/zip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
} 