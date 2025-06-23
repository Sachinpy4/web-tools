import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import archiver from 'archiver';
import { ConfigService } from '@nestjs/config';
import { SystemSettings, SystemSettingsDocument } from '../../admin/schemas/system-settings.schema';
import { MonitoringService } from '../../monitoring/services/monitoring.service';

// Same interfaces as original
export interface ProcessingOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: string;
  maintainAspectRatio?: boolean;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessingResult {
  outputPath: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  metadata: any;
  dimensions: {
    width: number;
    height: number;
  };
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly uploadDir: string;
  private readonly processedDir: string;
  private readonly archiveDir: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(SystemSettings.name) private systemSettingsModel: Model<SystemSettingsDocument>,
    private readonly monitoringService: MonitoringService,
  ) {
    this.uploadDir = this.configService.get<string>('upload.dest') || 'uploads';
    this.processedDir = path.join(this.uploadDir, 'processed');
    this.archiveDir = path.join(this.uploadDir, 'archives');
    
    // Ensure directories exist (same as original)
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    const dirs = [this.uploadDir, this.processedDir, this.archiveDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    });
  }

  // COMPRESS IMAGE - Exact same logic as original but with performance optimizations
  async compressImage(
    inputPath: string,
    quality: number = 80,
    originalFilename: string,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting compression: ${originalFilename} at quality ${quality}`);
      
      const ext = path.extname(originalFilename).toLowerCase();
      const baseName = path.basename(originalFilename, ext);
      
      // Preserve original filename but add timestamp to avoid conflicts
      const timestamp = Date.now();
      const outputFilename = `${baseName}_${timestamp}${ext}`;
      const outputPath = path.join(this.processedDir, outputFilename);

      // Get original file stats
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      // PERFORMANCE OPTIMIZATION: Read image with optimal Sharp settings
      const image = Sharp(inputPath, {
        failOnError: false, // Don't fail on minor corruption
        limitInputPixels: 268402689, // Limit to ~16k x 16k pixels for safety
        sequentialRead: true, // Optimize for sequential reading
      });
      
      const metadata = await image.metadata();

      // PERFORMANCE OPTIMIZATION: Apply format-specific optimizations
      let processedImage = image;

      if (ext === '.jpeg' || ext === '.jpg') {
        processedImage = processedImage.jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true, // Use mozjpeg for better compression
          optimiseScans: true, // Optimize progressive scans
          overshootDeringing: true, // Reduce ringing artifacts
          trellisQuantisation: true, // Better quality at same file size
        });
      } else if (ext === '.png') {
        processedImage = processedImage.png({ 
          quality,
          progressive: true,
          compressionLevel: Math.min(9, Math.max(1, Math.round(quality / 10))), // 1-9 range
          adaptiveFiltering: true, // Better compression
          palette: quality < 80, // Use palette for lower quality
        });
      } else if (ext === '.webp') {
        processedImage = processedImage.webp({ 
          quality,
          effort: 6, // Maximum effort for best compression
          lossless: quality >= 95, // Use lossless for very high quality
          nearLossless: quality >= 90 && quality < 95, // Near-lossless for high quality
          smartSubsample: true, // Better quality
        });
      } else {
        // Convert to JPEG for other formats with optimizations
        processedImage = processedImage.jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true,
          optimiseScans: true,
          overshootDeringing: true,
          trellisQuantisation: true,
        });
      }

      // PERFORMANCE OPTIMIZATION: Write with optimal buffer size
      await processedImage.toFile(outputPath);

      // Get processed file stats
      const processedStats = fs.statSync(outputPath);
      const processedSize = processedStats.size;
      const compressionRatio = Math.round(((originalSize - processedSize) / originalSize) * 100);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Compression complete: ${originalSize} → ${processedSize} bytes (${compressionRatio}% reduction) in ${processingTime}ms`);

      // Record successful job completion
      await this.monitoringService.recordJobCompletion('compress', processingTime, 'completed', {
        fileSize: originalSize,
        outputSize: processedSize,
        compressionRatio: compressionRatio,
      });

      return {
        outputPath,
        originalSize,
        processedSize,
        compressionRatio,
        metadata,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
      };
    } catch (error) {
      // Record failed job completion
      const processingTime = Date.now() - startTime;
      await this.monitoringService.recordJobCompletion('compress', processingTime, 'failed', {
        errorMessage: error.message,
      });
      
      this.logger.error(`Compression failed for ${originalFilename}:`, error);
      throw new InternalServerErrorException(`Image compression failed: ${error.message}`);
    }
  }

  // RESIZE IMAGE - Exact same logic as original but with performance optimizations
  async resizeImage(
    inputPath: string,
    width: number,
    height: number,
    originalFilename: string,
    maintainAspectRatio: boolean = true,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting resize: ${originalFilename} to ${width}x${height}`);
      
      const ext = path.extname(originalFilename).toLowerCase();
      const baseName = path.basename(originalFilename, ext);
      
      // Preserve original filename but add timestamp to avoid conflicts
      const timestamp = Date.now();
      const outputFilename = `${baseName}_${timestamp}${ext}`;
      const outputPath = path.join(this.processedDir, outputFilename);

      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      // PERFORMANCE OPTIMIZATION: Read image with optimal Sharp settings
      const image = Sharp(inputPath, {
        failOnError: false, // Don't fail on minor corruption
        limitInputPixels: 268402689, // Limit to ~16k x 16k pixels for safety
        sequentialRead: true, // Optimize for sequential reading
      });
      
      const metadata = await image.metadata();

      // PERFORMANCE OPTIMIZATION: Apply resize with optimal settings
      let resizeOptions: any = { width, height };
      
      if (maintainAspectRatio) {
        resizeOptions.fit = 'inside';
        resizeOptions.withoutEnlargement = true;
        resizeOptions.kernel = 'lanczos3'; // High-quality resampling
      } else {
        resizeOptions.fit = 'fill';
        resizeOptions.kernel = 'lanczos3'; // High-quality resampling
      }

      // PERFORMANCE OPTIMIZATION: Apply format-specific optimizations during resize
      let processedImage = image.resize(resizeOptions);

      // Apply format-specific optimizations (same as compress method)
      if (ext === '.jpeg' || ext === '.jpg') {
        processedImage = processedImage.jpeg({ 
          quality: 85, // Good quality for resized images
          progressive: true,
          mozjpeg: true,
          optimiseScans: true,
          overshootDeringing: true,
          trellisQuantisation: true,
        });
      } else if (ext === '.png') {
        processedImage = processedImage.png({ 
          compressionLevel: 6, // Balanced compression
          adaptiveFiltering: true,
          progressive: true,
        });
      } else if (ext === '.webp') {
        processedImage = processedImage.webp({ 
          quality: 85,
          effort: 6,
          smartSubsample: true,
        });
      }

      await processedImage.toFile(outputPath);

      const processedStats = fs.statSync(outputPath);
      const processedSize = processedStats.size;
      const compressionRatio = Math.round(((originalSize - processedSize) / originalSize) * 100);

      // Get final dimensions
      const finalMetadata = await Sharp(outputPath).metadata();
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`Resize complete: ${metadata.width}x${metadata.height} → ${finalMetadata.width}x${finalMetadata.height} in ${processingTime}ms`);

      // Record successful job completion
      await this.monitoringService.recordJobCompletion('resize', processingTime, 'completed', {
        fileSize: originalSize,
        outputSize: processedSize,
        compressionRatio: compressionRatio,
      });

      return {
        outputPath,
        originalSize,
        processedSize,
        compressionRatio,
        metadata: finalMetadata,
        dimensions: {
          width: finalMetadata.width || width,
          height: finalMetadata.height || height,
        },
      };
    } catch (error) {
      // Record failed job completion
      const processingTime = Date.now() - startTime;
      await this.monitoringService.recordJobCompletion('resize', processingTime, 'failed', {
        errorMessage: error.message,
      });
      
      this.logger.error(`Resize failed for ${originalFilename}:`, error);
      throw new InternalServerErrorException(`Image resize failed: ${error.message}`);
    }
  }

  // CONVERT FORMAT - Exact same logic as original
  async convertFormat(
    inputPath: string,
    targetFormat: string,
    originalFilename: string,
    quality: number = 80,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Converting ${originalFilename} to ${targetFormat}`);
      
      // Preserve original filename but change extension for format conversion and add timestamp
      const baseName = path.basename(originalFilename, path.extname(originalFilename));
      const timestamp = Date.now();
      const outputFilename = `${baseName}_${timestamp}.${targetFormat}`;
      const outputPath = path.join(this.processedDir, outputFilename);

      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      const image = Sharp(inputPath);
      const metadata = await image.metadata();

      // Apply format conversion with same logic as original
      let convertedImage = image;

      switch (targetFormat.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          convertedImage = convertedImage.jpeg({ quality, progressive: true, mozjpeg: true });
          break;
        case 'png':
          convertedImage = convertedImage.png({ quality, progressive: true });
          break;
        case 'webp':
          convertedImage = convertedImage.webp({ quality, effort: 6 });
          break;
        case 'tiff':
          convertedImage = convertedImage.tiff({ quality });
          break;
        case 'avif':
          convertedImage = convertedImage.avif({ quality });
          break;
        default:
          throw new BadRequestException(`Unsupported format: ${targetFormat}`);
      }

      await convertedImage.toFile(outputPath);

      const processedStats = fs.statSync(outputPath);
      const processedSize = processedStats.size;
      const compressionRatio = Math.round(((originalSize - processedSize) / originalSize) * 100);

      this.logger.log(`Format conversion complete: ${path.extname(originalFilename)} → .${targetFormat}`);

      // Record successful job completion
      const processingTime = Date.now() - startTime;
      await this.monitoringService.recordJobCompletion('convert', processingTime, 'completed', {
        fileSize: originalSize,
        outputSize: processedSize,
        compressionRatio: compressionRatio,
      });

      return {
        outputPath,
        originalSize,
        processedSize,
        compressionRatio,
        metadata,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
      };
    } catch (error) {
      // Record failed job completion
      const processingTime = Date.now() - startTime;
      await this.monitoringService.recordJobCompletion('convert', processingTime, 'failed', {
        errorMessage: error.message,
      });
      
      this.logger.error(`Format conversion failed for ${originalFilename}:`, error);
      throw new InternalServerErrorException(`Format conversion failed: ${error.message}`);
    }
  }

  // CROP IMAGE - Exact same logic as original
  async cropImage(
    inputPath: string,
    cropOptions: { x: number; y: number; width: number; height: number },
    originalFilename: string,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Cropping ${originalFilename}: ${JSON.stringify(cropOptions)}`);
      
      const ext = path.extname(originalFilename).toLowerCase();
      const baseName = path.basename(originalFilename, ext);
      
      // Preserve original filename but add timestamp to avoid conflicts
      const timestamp = Date.now();
      const outputFilename = `${baseName}_${timestamp}${ext}`;
      const outputPath = path.join(this.processedDir, outputFilename);

      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      const image = Sharp(inputPath);
      const metadata = await image.metadata();

      // Validate crop bounds (same as original)
      if (cropOptions.x < 0 || cropOptions.y < 0 || 
          cropOptions.x + cropOptions.width > (metadata.width || 0) ||
          cropOptions.y + cropOptions.height > (metadata.height || 0)) {
        throw new BadRequestException('Crop bounds exceed image dimensions');
      }

      await image.extract({
        left: cropOptions.x,
        top: cropOptions.y,
        width: cropOptions.width,
        height: cropOptions.height,
      }).toFile(outputPath);

      const processedStats = fs.statSync(outputPath);
      const processedSize = processedStats.size;
      const compressionRatio = Math.round(((originalSize - processedSize) / originalSize) * 100);

      this.logger.log(`Crop complete: ${metadata.width}x${metadata.height} → ${cropOptions.width}x${cropOptions.height}`);

      // Record successful job completion
      const processingTime = Date.now() - startTime;
      await this.monitoringService.recordJobCompletion('crop', processingTime, 'completed', {
        fileSize: originalSize,
        outputSize: processedSize,
        compressionRatio: compressionRatio,
      });

      return {
        outputPath,
        originalSize,
        processedSize,
        compressionRatio,
        metadata,
        dimensions: {
          width: cropOptions.width,
          height: cropOptions.height,
        },
      };
    } catch (error) {
      // Record failed job completion
      const processingTime = Date.now() - startTime;
      await this.monitoringService.recordJobCompletion('crop', processingTime, 'failed', {
        errorMessage: error.message,
      });
      
      this.logger.error(`Crop failed for ${originalFilename}:`, error);
      throw new InternalServerErrorException(`Image crop failed: ${error.message}`);
    }
  }

  // BATCH PROCESSING - Same as original
  async processBatch(
    filePaths: string[],
    operation: 'compress' | 'resize' | 'convert' | 'crop',
    options: ProcessingOptions,
  ): Promise<string> {
    try {
      this.logger.log(`Starting batch ${operation} for ${filePaths.length} files`);
      
      const batchId = uuidv4();
      const archivePath = path.join(this.archiveDir, `tool-${operation}-images-${batchId}.zip`);
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = fs.createWriteStream(archivePath);
      
      archive.pipe(output);
      
      const results = [];
      
      for (const filePath of filePaths) {
        try {
          const originalFilename = path.basename(filePath);
          let result: ProcessingResult;
          
          switch (operation) {
            case 'compress':
              result = await this.compressImage(filePath, options.quality || 80, originalFilename);
              break;
            case 'resize':
              result = await this.resizeImage(
                filePath,
                options.width || 800,
                options.height || 600,
                originalFilename,
                options.maintainAspectRatio
              );
              break;
            case 'convert':
              result = await this.convertFormat(
                filePath,
                options.format || 'jpg',
                originalFilename,
                options.quality || 80
              );
              break;
            case 'crop':
              if (!options.crop) throw new BadRequestException('Crop options required');
              result = await this.cropImage(filePath, options.crop, originalFilename);
              break;
            default:
              throw new BadRequestException(`Unknown operation: ${operation}`);
          }
          
          // Add processed file to archive
          archive.file(result.outputPath, { name: path.basename(result.outputPath) });
          results.push(result);
          
        } catch (error) {
          this.logger.error(`Batch processing failed for ${filePath}:`, error);
          // Continue with other files
        }
      }
      
      await archive.finalize();
      
      // Wait for archive to finish
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', reject);
      });
      
      this.logger.log(`Batch processing complete: ${results.length}/${filePaths.length} files processed`);
      
      return archivePath;
    } catch (error) {
      this.logger.error('Batch processing failed:', error);
      throw new InternalServerErrorException(`Batch processing failed: ${error.message}`);
    }
  }

  // CLEANUP - Enhanced Windows-compatible cleanup with retry logic
  async cleanup(filePath: string): Promise<void> {
    const maxRetries = 3;
    const retryDelayMs = 100;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (fs.existsSync(filePath)) {
          // Force garbage collection to release any Sharp handles
          if (global.gc) {
            global.gc();
          }
          
          await fs.promises.unlink(filePath);
          this.logger.log(`Cleaned up file: ${filePath}`);
          return; // Success - exit the retry loop
        }
        return; // File doesn't exist - nothing to clean
      } catch (error) {
        if (attempt === maxRetries) {
          // Only log as warning on final attempt to reduce noise
          this.logger.debug(`File cleanup will be handled by system cleanup: ${filePath}`);
          return; // Don't throw error - file will be cleaned up later
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  }

  // FILE VALIDATION - Uses dynamic settings from database
  async validateImageFile(file: Express.Multer.File): Promise<void> {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/avif'];
    
    // Get dynamic settings from database
    const settings = await (this.systemSettingsModel as any).getCurrentSettings();
    const maxSize = settings.maxFileSize || 52428800; // Fallback to 50MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }
  }
} 