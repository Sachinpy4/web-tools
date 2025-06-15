import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { 
  compressImageService, 
  resizeImageService, 
  convertImageService, 
  cropImageService 
} from '../services/imageService';
import { 
  compressQueue,
  resizeQueue,
  convertQueue,
  cropQueue,
  isRedisActuallyAvailable
} from '../queues/imageQueue';
import { isRedisAvailable } from '../config/redis';
import { asyncHandler } from '../utils/asyncHandler';
import Queue from 'bull';

/**
 * Helper function to get job status with queue position
 */
export const getJobStatus = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { id } = req.params;
  const { type = 'compress' } = req.query;
  
  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: 'Job ID is required'
    });
  }
  
  // If Redis is not available, we can't fetch job status
  const redisAvailable = await isRedisActuallyAvailable();
  if (redisAvailable === false) {
    return res.status(503).json({
      status: 'error',
      message: 'Job status checking is not available in local processing mode'
    });
  }
  
  // Select the appropriate queue based on job type
  let queue;
  switch (type) {
    case 'compress':
      queue = compressQueue;
      break;
    case 'resize':
      queue = resizeQueue;
      break;
    case 'convert':
      queue = convertQueue;
      break;
    case 'crop':
      queue = cropQueue;
      break;
    default:
      queue = compressQueue;
  }
  
  // Get job from queue
  const job = await queue.getJob(id);
  
  if (!job) {
    return res.status(404).json({
      status: 'error',
      message: 'Job not found'
    });
  }
  
  // Get job status, progress and result if available
  const state = await job.getState();
  const progress = job.progress();
  const result = job.returnvalue;
  const failReason = job.failedReason;
  
  // Calculate queue position if job is waiting
  let queuePosition: number | null = null;
  let estimatedWaitTime: number | null = null;
  
  if (state === 'waiting') {
    try {
      // Get all waiting jobs to calculate position
      const waitingJobs = await queue.getWaiting();
      const jobIndex = waitingJobs.findIndex(waitingJob => waitingJob.id === job.id);
      
      if (jobIndex !== -1) {
        queuePosition = jobIndex + 1; // 1-based position
        
        // Estimate wait time (assuming 30 seconds per job on average)
        const avgProcessingTime = 30; // seconds
        estimatedWaitTime = Math.max(0, jobIndex * avgProcessingTime);
      }
    } catch (error) {
      // Silent error handling
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      id: job.id,
      state,
      progress,
      result: state === 'completed' ? result : null,
      error: state === 'failed' ? failReason : null,
      queuePosition,
      estimatedWaitTime: estimatedWaitTime ? `${Math.ceil(estimatedWaitTime / 60)} minutes` : null
    }
  });
});

export const compressImage = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please upload an image' 
    });
  }

  const { quality = '80' } = req.body;
  const qualityValue = parseInt(quality as string);
  

  
  // Store original filename for download
  const originalFilename = req.file.originalname;
  
  // Check Redis availability - now with async call
  const redisAvailable = await isRedisActuallyAvailable();
  
  
  // If Redis is not available, process the image directly
  if (redisAvailable === false) {
    
    
    try {
      const result = await compressImageService(
        req.file.path,
        qualityValue
      );
      
      // Set the filePath to include the 'processed' folder for correct download URL
      const filePath = path.basename(result.path);
      
      return res.status(200).json({
        status: 'success',
        data: {
          originalSize: req.file.size,
          compressedSize: result.size ?? 0,
          compressionRatio: Math.round((1 - ((result.size ?? 0) / req.file.size)) * 100),
          mime: result.mime,
          filename: filePath,
          originalFilename,
          downloadUrl: `/api/images/download/${filePath}?originalFilename=${encodeURIComponent(originalFilename)}`
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Image compression failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Redis is available, so use the queue
  
  
  // Add job to queue
  const job = await compressQueue.add({
    filePath: req.file.path,
    quality: qualityValue,
    originalFilename: req.file.originalname,
    originalSize: req.file.size,
    webhookUrl: req.body.webhookUrl // Add webhook URL directly in the job data
  }, {
    // Job options
    timeout: 3 * 60 * 1000, // 3 minutes timeout
    attempts: 2, // Retry once on failure
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 100 // Keep last 100 failed jobs
  });
  
  // Now job.update is only called if we know it's a Bull queue job
  if (redisAvailable === true && req.body.webhookUrl && 'update' in job) {
    await (job as Queue.Job).update({
      ...job.data,
      webhookUrl: req.body.webhookUrl
    });
  }
  
  res.status(202).json({
    status: 'processing',
    message: 'Image compression job queued',
    data: {
      jobId: job.id,
      statusUrl: `/api/images/status/${job.id}?type=compress`
    }
  });
});

export const resizeImage = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please upload an image' 
    });
  }

  const { width, height, fit = 'cover' } = req.body;
  
  if (!width && !height) {
    return res.status(400).json({
      status: 'error',
      message: 'At least one dimension (width or height) is required'
    });
  }
  
  // Parse dimensions
  const widthValue = width ? parseInt(width as string) : undefined;
  const heightValue = height ? parseInt(height as string) : undefined;
  

  
  // Store original filename for download
  const originalFilename = req.file.originalname;
  
  // Check Redis availability - now with async call
  const redisAvailable = await isRedisActuallyAvailable();
  
  // If Redis is not available, process the image directly
  if (redisAvailable === false) {
    
    
    try {
      const result = await resizeImageService(
        req.file.path,
        widthValue || 0,  // Provide fallback of 0 if undefined
        heightValue || 0,  // Provide fallback of 0 if undefined
        fit as string
      );
      
      // Set the filePath to include the 'processed' folder for correct download URL
      const filePath = path.basename(result.path);
      
      return res.status(200).json({
        status: 'success',
        data: {
          width: result.width,
          height: result.height,
          mime: result.mime,
          filename: filePath,
          originalFilename,
          downloadUrl: `/api/images/download/${filePath}?originalFilename=${encodeURIComponent(originalFilename)}`
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Image resize failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Redis is available, use the queue
  
  
  // Add job to queue
  const job = await resizeQueue.add({
    filePath: req.file.path,
    width: widthValue,
    height: heightValue,
    fit: fit as string,
    originalFilename: req.file.originalname,
    webhookUrl: req.body.webhookUrl
  }, {
    // Job options
    timeout: 3 * 60 * 1000,
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 100
  });
  
  // Update webhook URL if provided
  if (redisAvailable === true && req.body.webhookUrl && 'update' in job) {
    await (job as Queue.Job).update({
      ...job.data,
      webhookUrl: req.body.webhookUrl
    });
  }
  
  res.status(202).json({
    status: 'processing',
    message: 'Image resize job queued',
    data: {
      jobId: job.id,
      statusUrl: `/api/images/status/${job.id}?type=resize`
    }
  });
});

export const convertImage = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please upload an image' 
    });
  }

  const { format = 'jpeg' } = req.body;
  

  
  // Store original filename for download
  const originalFilename = req.file.originalname;
  
  // Check Redis availability - now with async call
  const redisAvailable = await isRedisActuallyAvailable();
  
  // If Redis is not available, process the image directly
  if (redisAvailable === false) {
    
    
    try {
      const result = await convertImageService(
        req.file.path,
        format as string
      );
      
      // Set the filePath to include the 'processed' folder for correct download URL
      const filePath = path.basename(result.path);
      
      return res.status(200).json({
        status: 'success',
        data: {
          originalFormat: path.extname(originalFilename).substring(1),
          convertedFormat: format,
          mime: result.mime,
          filename: filePath,
          originalFilename,
          downloadUrl: `/api/images/download/${filePath}?originalFilename=${encodeURIComponent(originalFilename.replace(/\.[^/.]+$/, `.${format}`))}`
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Image conversion failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Redis is available, use the queue
  
  
  // Add job to queue
  const job = await convertQueue.add({
    filePath: req.file.path,
    format: format as string,
    originalFilename: req.file.originalname,
    webhookUrl: req.body.webhookUrl
  }, {
    // Job options
    timeout: 3 * 60 * 1000,
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 100
  });
  
  // Update webhook URL if provided
  if (redisAvailable === true && req.body.webhookUrl && 'update' in job) {
    await (job as Queue.Job).update({
      ...job.data,
      webhookUrl: req.body.webhookUrl
    });
  }
  
  res.status(202).json({
    status: 'processing',
    message: 'Image conversion job queued',
    data: {
      jobId: job.id,
      statusUrl: `/api/images/status/${job.id}?type=convert`
    }
  });
});

export const cropImage = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please upload an image' 
    });
  }

  const { left, top, width, height } = req.body;
  
  if (!left || !top || !width || !height) {
    return res.status(400).json({
      status: 'error',
      message: 'Crop coordinates (left, top, width, height) are required'
    });
  }
  
  // Parse crop coordinates
  const leftValue = parseInt(left as string);
  const topValue = parseInt(top as string);
  const widthValue = parseInt(width as string);
  const heightValue = parseInt(height as string);
  

  
  // Store original filename for download
  const originalFilename = req.file.originalname;
  
  // Check Redis availability - now with async call
  const redisAvailable = await isRedisActuallyAvailable();
  
  // If Redis is not available, process the image directly
  if (redisAvailable === false) {
    
    
    try {
      const result = await cropImageService(
        req.file.path,
        leftValue,
        topValue,
        widthValue,
        heightValue
      );
      
      // Set the filePath to include the 'processed' folder for correct download URL
      const filePath = path.basename(result.path);
      
      return res.status(200).json({
        status: 'success',
        data: {
          width: result.width,
          height: result.height,
          mime: result.mime,
          filename: filePath,
          originalFilename,
          downloadUrl: `/api/images/download/${filePath}?originalFilename=${encodeURIComponent(originalFilename)}`
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Image crop failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Redis is available, use the queue
  
  
  // Add job to queue
  const job = await cropQueue.add({
    filePath: req.file.path,
    left: leftValue,
    top: topValue,
    width: widthValue,
    height: heightValue,
    originalFilename: req.file.originalname,
    webhookUrl: req.body.webhookUrl
  }, {
    // Job options
    timeout: 3 * 60 * 1000,
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 100
  });
  
  // Update webhook URL if provided
  if (redisAvailable === true && req.body.webhookUrl && 'update' in job) {
    await (job as Queue.Job).update({
      ...job.data,
      webhookUrl: req.body.webhookUrl
    });
  }
  
  res.status(202).json({
    status: 'processing',
    message: 'Image crop job queued',
    data: {
      jobId: job.id,
      statusUrl: `/api/images/status/${job.id}?type=crop`
    }
  });
});

/**
 * @desc    Optimize image for blog usage
 * @route   POST /api/image/optimize-blog
 * @access  Private
 */
export const optimizeBlogImage = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please upload an image' 
    });
  }

  try {
    const file = req.file;
    const quality = parseInt(req.body.quality as string) || 80;
    const format = (req.body.format as string) || 'webp';
    
    // Check if this is a featured image or regular content image
    const isFeatured = req.body.isFeatured === 'true';
    
    // Import sharp without TypeScript issues
    const sharp = require('sharp');
    let processor = sharp(file.buffer);
    
    // Apply resize based on image type
    if (isFeatured) {
      // Featured images should be 1200x630 (social sharing optimized)
      processor = processor.resize(1200, 630, { fit: 'cover' });
    } else {
      // Regular blog images should be max 800px wide, maintain aspect ratio
      processor = processor.resize(800, null, { fit: 'inside' });
    }
    
    // Apply format with quality
    let processedImageBuffer;
    if (format === 'webp') {
      processedImageBuffer = await processor.webp({ quality }).toBuffer();
    } else if (format === 'jpeg' || format === 'jpg') {
      processedImageBuffer = await processor.jpeg({ quality }).toBuffer();
    } else if (format === 'png') {
      processedImageBuffer = await processor.png({ quality }).toBuffer();
    } else {
      processedImageBuffer = await processor.webp({ quality }).toBuffer();
    }
    
    // Return the processed image
    res.set('Content-Type', `image/${format}`);
    res.set('Content-Disposition', `attachment; filename="optimized-${file.originalname}.${format}"`);
    res.send(processedImageBuffer);
    
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error processing image'
    });
  }
});

/**
 * @desc    Extract comprehensive metadata from an image
 * @route   POST /api/images/metadata
 * @access  Public
 */
export const extractMetadata = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Please upload an image' 
    });
  }

  try {
    const sharp = require('sharp');
    const exifr = require('exifr');
    const { analyzeFaceColors } = require('../services/faceDetectionService');
    
    // Check if this is a HEIC/HEIF file
    const isHEIC = req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif';
    
    // Check if this is a RAW camera format
    const isRAW = req.file.mimetype.includes('x-canon') || 
                  req.file.mimetype.includes('x-nikon') || 
                  req.file.mimetype.includes('x-sony') || 
                  req.file.mimetype.includes('x-adobe') || 
                  req.file.mimetype.includes('x-panasonic') || 
                  req.file.mimetype.includes('x-olympus') || 
                  req.file.mimetype.includes('x-fuji') || 
                  req.file.mimetype.includes('x-pentax') || 
                  req.file.mimetype.includes('x-samsung') || 
                  req.file.mimetype.includes('x-sigma') ||
                  req.file.originalname.toLowerCase().match(/\.(cr2|cr3|crw|nef|arw|dng|raw|orf|raf|pef|srw|x3f)$/i);

    let metadata: any = {};
    let canProcessImage = true;

    // Try to get basic image metadata with Sharp (may fail for RAW)
    try {
      if (!isRAW) {
        const image = sharp(req.file.path);
        metadata = await image.metadata();
      } else {
        // For RAW files, Sharp likely won't work, so we'll rely on EXIF data
        canProcessImage = false;
    
      }
    } catch (sharpError) {
      canProcessImage = false;
    }

    // Extract EXIF data with enhanced HEIC support
    let exifData = {};
    try {
      const exifOptions = {
        tiff: true,
        exif: true,
        gps: true,
        icc: true,
        iptc: true,
        jfif: true,
        ihdr: true,
        sanitize: false,
        mergeOutput: false,
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
        // Enhanced HEIC support
        heic: true,
        heif: true,
        // Additional options for better HEIC parsing
        pick: ['Make', 'Model', 'LensModel', 'LensMake', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'Flash', 'DateTimeOriginal', 'DateTime', 'CreateDate', 'latitude', 'longitude', 'GPSAltitude', 'Orientation', 'ColorSpace', 'WhiteBalance', 'ExposureMode', 'MeteringMode', 'Artist', 'Copyright', 'Software', 'ImageDescription', 'UserComment', 'SceneCaptureType', 'Contrast', 'Saturation', 'Sharpness', 'DigitalZoomRatio', 'SubjectDistance', 'LightSource']
      };

  
      
      // Try multiple extraction methods
      let rawExif: any = null;
      
      // Method 1: Full extraction with all options
      try {
        rawExif = await exifr.parse(req.file.path, exifOptions);

      } catch (e: any) {
        
      }
      
      // Method 2: Simple extraction if first method failed
      if (!rawExif) {
        try {
          rawExif = await exifr.parse(req.file.path, { 
            tiff: true, 
            exif: true, 
            gps: true,
            translateKeys: true,
            translateValues: true 
          });

        } catch (e: any) {
          
        }
      }
      
      // Method 3: Basic extraction
      if (!rawExif) {
        try {
          rawExif = await exifr.parse(req.file.path);

        } catch (e: any) {
          
        }
      }

      if (rawExif) {
        // Format EXIF data
        exifData = {
          camera: rawExif.ifd0?.Make && rawExif.ifd0?.Model ? `${rawExif.ifd0.Make} ${rawExif.ifd0.Model}`.trim() : undefined,
          lens: rawExif.exif?.LensModel || rawExif.exif?.LensMake ? `${rawExif.exif?.LensMake || ''} ${rawExif.exif?.LensModel || ''}`.trim() : undefined,
          focalLength: rawExif.exif?.FocalLength ? `${rawExif.exif.FocalLength}mm` : undefined,
          aperture: rawExif.exif?.FNumber ? `f/${rawExif.exif.FNumber}` : undefined,
          shutterSpeed: rawExif.exif?.ExposureTime ? (
            rawExif.exif.ExposureTime < 1 
              ? `1/${Math.round(1 / rawExif.exif.ExposureTime)}s`
              : `${rawExif.exif.ExposureTime}s`
          ) : undefined,
          iso: rawExif.exif?.ISO ? `ISO ${rawExif.exif.ISO}` : undefined,
          flash: rawExif.exif?.Flash !== undefined ? (rawExif.exif.Flash === 0 ? 'No Flash' : 'Flash') : undefined,
          dateTime: rawExif.exif?.DateTimeOriginal || rawExif.exif?.DateTime || rawExif.exif?.CreateDate ? 
            (rawExif.exif.DateTimeOriginal || rawExif.exif.DateTime || rawExif.exif.CreateDate).toString() : undefined,
          gps: rawExif.gps?.latitude && rawExif.gps?.longitude ? {
            latitude: parseFloat(String(rawExif.gps.latitude)),
            longitude: parseFloat(String(rawExif.gps.longitude)),
            altitude: rawExif.gps.GPSAltitude ? parseFloat(String(rawExif.gps.GPSAltitude)) : undefined
          } : undefined,
          orientation: rawExif.ifd0?.Orientation || rawExif.ifd1?.Orientation,
          colorSpace: rawExif.exif?.ColorSpace,
          whiteBalance: rawExif.exif?.WhiteBalance,
          exposureMode: rawExif.exif?.ExposureMode,
          meteringMode: rawExif.exif?.MeteringMode,
          // Copyright and creator information
          artist: rawExif.ifd0?.Artist,
          copyright: rawExif.ifd0?.Copyright,
          software: rawExif.ifd0?.Software,
          imageDescription: rawExif.ifd0?.ImageDescription,
          userComment: rawExif.userComment || rawExif.exif?.UserComment,
          // Advanced camera settings
          sceneCaptureType: rawExif.exif?.SceneCaptureType,
          contrast: rawExif.exif?.Contrast,
          saturation: rawExif.exif?.Saturation,
          sharpness: rawExif.exif?.Sharpness,
          digitalZoomRatio: rawExif.exif?.DigitalZoomRatio,
          subjectDistance: rawExif.exif?.SubjectDistance ? `${rawExif.exif.SubjectDistance}m` : undefined,
          lightSource: rawExif.exif?.LightSource
        };

        // Remove undefined properties
        exifData = Object.fromEntries(
          Object.entries(exifData).filter(([_, value]) => value !== undefined)
        );
        
        
      }
    } catch (exifError) {
      // For HEIC files, this is not uncommon due to format complexity
    }

    // Enhanced image analysis with HEIC-specific handling
    let hasTransparency = false;
    let brightness = 128; // Default middle brightness
    let colorVariance = 50; // Default moderate variance
    let sortedColors = ['rgb(128,128,128)']; // Default gray
    
    try {
      if (isRAW) {
        // RAW files cannot be processed for pixel analysis

      } else if (isHEIC) {
        // HEIC files often don't support raw buffer extraction well
        // Focus on metadata-only analysis
        
        
        // Try to get basic color info using a scaled-down version
        try {
          const smallImage = sharp(req.file.path).resize(100, 100, { fit: 'inside' });
          const { data, info } = await smallImage.raw().toBuffer({ resolveWithObject: true });
          
          // Simple color analysis on small image
          const pixelCount = data.length / info.channels;
          let totalR = 0, totalG = 0, totalB = 0;
          
          for (let i = 0; i < data.length; i += info.channels) {
            totalR += data[i] || 0;
            totalG += data[i + 1] || 0;
            totalB += data[i + 2] || 0;
          }
          
          const avgR = totalR / pixelCount;
          const avgG = totalG / pixelCount;
          const avgB = totalB / pixelCount;
          
          brightness = Math.round(0.299 * avgR + 0.587 * avgG + 0.114 * avgB);
          
          // Simple dominant color (average)
          sortedColors = [`rgb(${Math.round(avgR)},${Math.round(avgG)},${Math.round(avgB)})`];
          
        } catch (colorError) {
          // Use defaults
        }
        
      } else if (canProcessImage) {
        // Full analysis for supported formats
        const { data, info } = await sharp(req.file.path).raw().toBuffer({ resolveWithObject: true });
        
        // Analyze transparency
        if (metadata.channels && metadata.channels >= 4) {
          hasTransparency = true;
        } else if (metadata.format === 'png') {
          try {
            const { data: pngData } = await sharp(req.file.path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            const pixelCount = pngData.length / 4;
            for (let i = 3; i < pngData.length; i += 4) {
              if (pngData[i] < 255) {
                hasTransparency = true;
                break;
              }
            }
          } catch (e) {
            hasTransparency = false;
          }
        }

        // Color analysis
        const pixelCount = data.length / info.channels;
        let totalR = 0, totalG = 0, totalB = 0;
        const colorMap = new Map<string, number>();
        const sampleSize = Math.min(10000, pixelCount);
        const step = Math.floor(pixelCount / sampleSize);

        for (let i = 0; i < data.length; i += step * info.channels) {
          const r = data[i] || 0;
          const g = data[i + 1] || 0;
          const b = data[i + 2] || 0;

          totalR += r;
          totalG += g;
          totalB += b;

          // Calculate brightness (perceived luminance)
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          brightness += pixelBrightness;

          // Track dominant colors (simplified)
          const colorKey = `${Math.floor(r/32)*32},${Math.floor(g/32)*32},${Math.floor(b/32)*32}`;
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }

        brightness = brightness / sampleSize;

        // Get dominant colors
        sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => `rgb(${color})`);

        // Calculate color variance for photographic detection
        const avgR = totalR / sampleSize;
        const avgG = totalG / sampleSize;
        const avgB = totalB / sampleSize;
        
        for (let i = 0; i < data.length; i += step * info.channels) {
          const r = data[i] || 0;
          const g = data[i + 1] || 0;
          const b = data[i + 2] || 0;
          
          colorVariance += Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2);
        }
        
        colorVariance = Math.sqrt(colorVariance / sampleSize);
      }
      
    } catch (imageAnalysisError) {
      // Use default values already set above
    }

    const isPhotographic = colorVariance > 30;

    // Face color analysis
          const faceAnalysis = await analyzeFaceColors(req.file.path);

    // File size and format info
    const fileStats = await fs.stat(req.file.path);
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Estimate compression potential (HEIC already highly compressed, RAW has huge potential)
    const compressionPotential = {
      jpeg: isRAW ? 95 : (isHEIC ? 30 : (isPhotographic ? 70 : 50)),
      webp: isRAW ? 97 : (isHEIC ? 45 : (isPhotographic ? 85 : 80)),
      avif: isRAW ? 98 : (isHEIC ? 60 : (isPhotographic ? 90 : 85))
    };

    // Calculate aspect ratio - use defaults for RAW if Sharp failed
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    let aspectRatio = '0:0';
    
    if (width && height) {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      const ratioW = width / divisor;
      const ratioH = height / divisor;
      aspectRatio = `${ratioW}:${ratioH}`;
    }

    // Determine format string
    let formatString = 'UNKNOWN';
    if (isRAW) {
      const rawFormats: {[key: string]: string} = {
        'cr2': 'CR2 (Canon RAW)',
        'cr3': 'CR3 (Canon RAW)',
        'crw': 'CRW (Canon RAW)', 
        'nef': 'NEF (Nikon RAW)',
        'arw': 'ARW (Sony RAW)',
        'dng': 'DNG (Adobe RAW)',
        'orf': 'ORF (Olympus RAW)',
        'raf': 'RAF (Fuji RAW)',
        'pef': 'PEF (Pentax RAW)',
        'srw': 'SRW (Samsung RAW)',
        'x3f': 'X3F (Sigma RAW)'
      };
      const ext = req.file.originalname.toLowerCase().split('.').pop() || '';
      formatString = rawFormats[ext] || 'RAW';
    } else if (isHEIC) {
      formatString = 'HEIC';
    } else {
      formatString = metadata.format?.toUpperCase() || 'UNKNOWN';
    }

    const result = {
      fileName: req.file.originalname,
      fileSize: fileStats.size,
      fileSizeFormatted: formatFileSize(fileStats.size),
      format: formatString,
      mimeType: req.file.mimetype,
      width,
      height,
      aspectRatio,
      megapixels: width && height ? ((width * height) / 1000000).toFixed(1) : '0.0',
      hasTransparency,
      colorSpace: metadata.space,
      bitDepth: metadata.depth,
      density: metadata.density,
      isAnimated: metadata.pages && metadata.pages > 1,
      frameCount: metadata.pages,
      exif: Object.keys(exifData).length > 0 ? exifData : null,
      contentAnalysis: {
        isPhotographic,
        hasTransparency,
        dominantColors: sortedColors,
        brightness: Math.round(brightness),
        contrast: Math.round(colorVariance),
        sharpness: Math.round(colorVariance * 0.5),
        compressionPotential
      },
      // Face color analysis
      faceAnalysis,
      // Add processing notes for different formats
      processingNotes: isRAW ? 'RAW format: metadata extracted, but pixel analysis not available' : 
                      (isHEIC ? 'Limited color analysis due to HEIC format complexity' : undefined)
    };

    res.status(200).json({
      status: 'success',
      data: result
    });

  } catch (error: any) {
    // Provide more specific error messages based on file type
    let errorMessage = 'Error extracting image metadata';
    
    if (req.file?.mimetype === 'image/heic' || req.file?.mimetype === 'image/heif') {
      errorMessage = 'HEIC format processing failed. This may be due to system limitations with HEIC support.';
    } else if (req.file?.mimetype.includes('x-') || 
               req.file?.originalname.toLowerCase().match(/\.(cr2|cr3|crw|nef|arw|dng|raw|orf|raf|pef|srw|x3f)$/i)) {
      errorMessage = 'RAW camera format processing failed. Some RAW formats may not be fully supported for metadata extraction.';
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message || errorMessage
    });
  }
});