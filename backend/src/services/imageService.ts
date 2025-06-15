import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { recordJobCompletion } from './jobTrackingService';

interface ProcessedImage {
  path: string;
  mime: string;
  width?: number;
  height?: number;
  size?: number;
}

// Ensure uploads directories exist
const createUploadDirs = async () => {
  const uploadDir = path.join(__dirname, '../../uploads');
  const processedDir = path.join(__dirname, '../../uploads/processed');
  
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });
  } catch (err) {
    // Silent error handling
  }
};

// Create dirs on module import
createUploadDirs();

/**
 * Compress an image with Sharp
 */
export async function compressImageService(filePath: string, quality: number = 80): Promise<ProcessedImage> {
  const startTime = Date.now();
  try {
  
    
    // Ensure quality is in valid range
    const validQuality = Math.max(1, Math.min(100, quality));
    
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const ext = path.extname(filePath);
    const outputPath = path.join(
      __dirname,
      '../../uploads/processed',
      `tool-compressed-${uuidv4()}${ext}`
    );
    
    let processedImage;
    let mime: string;
    
    // Process based on image format
    switch (metadata.format) {
      case 'jpeg':
      case 'jpg':
        processedImage = await image.jpeg({ quality: validQuality }).toFile(outputPath);
        mime = 'image/jpeg';
        break;
      case 'png':
        // PNG compression is 0-9, so we convert the 1-100 quality scale to appropriate level
        const pngQuality = Math.max(1, Math.round(validQuality / 10));
        processedImage = await image.png({ quality: pngQuality }).toFile(outputPath);
        mime = 'image/png';
        break;
      case 'webp':
        processedImage = await image.webp({ quality: validQuality }).toFile(outputPath);
        mime = 'image/webp';
        break;
      default:
        // For other formats, convert to JPEG
        processedImage = await image.jpeg({ quality: validQuality }).toFile(outputPath);
        mime = 'image/jpeg';
    }
    
    // Record the job completion
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('compress', processingTime, 'completed');
    
    return {
      path: outputPath,
      mime,
      width: processedImage.width,
      height: processedImage.height,
      size: processedImage.size
    };
  } catch (error) {
    // Record the job failure
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('compress', processingTime, 'failed');
    throw error;
  }
}

/**
 * Resize an image with Sharp
 */
export async function resizeImageService(
  filePath: string,
  width: number,
  height: number,
  fit: string = 'contain'
): Promise<ProcessedImage> {
  const startTime = Date.now();
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const ext = path.extname(filePath);
    const outputPath = path.join(
      __dirname,
      '../../uploads/processed',
      `tool-resized-${uuidv4()}${ext}`
    );

    // Validate fit option
    const validFit = ['cover', 'contain', 'fill', 'inside', 'outside'];
    const fitOption = validFit.includes(fit) ? fit : 'cover';
    
    // Process resize
    let processedImage = await image
      .resize({
        width,
        height,
        fit: fitOption as keyof sharp.FitEnum
      })
      .toFile(outputPath);
    
    // Record the job completion
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('resize', processingTime, 'completed');
    
    return {
      path: outputPath,
      mime: `image/${metadata.format}`,
      width: processedImage.width,
      height: processedImage.height
    };
  } catch (error) {
    // Record the job failure
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('resize', processingTime, 'failed');
    throw error;
  }
}

/**
 * Convert an image format with Sharp
 */
export async function convertImageService(
  filePath: string,
  format: string
): Promise<ProcessedImage> {
  const startTime = Date.now();
  try {
    const image = sharp(filePath);
    const outputPath = path.join(
      __dirname,
      '../../uploads/processed',
      `tool-converted-${uuidv4()}.${format}`
    );
    
    let processedImage;
    let mime: string;
    
    // Convert to target format
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        processedImage = await image.jpeg().toFile(outputPath);
        mime = 'image/jpeg';
        break;
      case 'png':
        processedImage = await image.png().toFile(outputPath);
        mime = 'image/png';
        break;
      case 'webp':
        processedImage = await image.webp().toFile(outputPath);
        mime = 'image/webp';
        break;
      case 'avif':
        processedImage = await image.avif().toFile(outputPath);
        mime = 'image/avif';
        break;
      case 'tiff':
        processedImage = await image.tiff().toFile(outputPath);
        mime = 'image/tiff';
        break;
      default:
        // Default to JPEG if format not supported
        processedImage = await image.jpeg().toFile(outputPath);
        mime = 'image/jpeg';
    }
    
    // Record the job completion
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('convert', processingTime, 'completed');
    
    return {
      path: outputPath,
      mime,
      width: processedImage.width,
      height: processedImage.height
    };
  } catch (error) {
    // Record the job failure
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('convert', processingTime, 'failed');
    throw error;
  }
}

/**
 * Crop an image with Sharp
 */
export async function cropImageService(
  filePath: string,
  left: number,
  top: number,
  width: number,
  height: number
): Promise<ProcessedImage> {
  const startTime = Date.now();
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }
    
    // Validate crop parameters
    const validLeft = Math.max(0, Math.min(left, metadata.width - 1));
    const validTop = Math.max(0, Math.min(top, metadata.height - 1));
    let validWidth = Math.max(1, Math.min(width, metadata.width - validLeft));
    let validHeight = Math.max(1, Math.min(height, metadata.height - validTop));
    
    // Crop parameters adjusted if needed
    
    const ext = path.extname(filePath);
    const outputPath = path.join(
      __dirname,
      '../../uploads/processed',
      `tool-cropped-${uuidv4()}${ext}`
    );
    
    // Process crop with validated parameters
    const processedImage = await image
      .extract({ 
        left: validLeft, 
        top: validTop, 
        width: validWidth, 
        height: validHeight 
      })
      .toFile(outputPath);
    
    // Record the job completion
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('crop', processingTime, 'completed');
    
    return {
      path: outputPath,
      mime: `image/${metadata.format}`,
      width: processedImage.width,
      height: processedImage.height
    };
  } catch (error) {
    // Record the job failure
    const processingTime = Date.now() - startTime;
    await recordJobCompletion('crop', processingTime, 'failed');
    throw error;
  }
} 