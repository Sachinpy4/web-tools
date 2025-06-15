import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import logger from '../utils/logger';
import { getFileUploadSettings } from '../services/settingsService';

/**
 * File naming convention:
 * - Blog images: 'blog-[uuid].[extension]' (stored in /uploads/blogs directory)
 * - Tool processed images: 'tool-[operation]-[uuid].[extension]' (stored in /uploads/processed)
 * - Other uploads: '[uuid].[extension]' (stored in main /uploads directory)
 * 
 * For future cleanup scripts/cron jobs:
 * - Files in /uploads/blogs should be preserved (permanent storage)
 * - Files starting with 'tool-' in /uploads/processed and archives with 'tool-' in /uploads/archives
 *   can be cleaned up periodically.
 * - Regular files in /uploads can be cleaned up periodically.
 */

// Constants for image limits (fallback values)
export const IMAGE_LIMITS = {
  MAX_FILE_SIZE: 52428800, // 50MB default (will be overridden by settings)
  MAX_WIDTH: 8000, // 8K resolution width
  MAX_HEIGHT: 8000, // 8K resolution height
  MIN_WIDTH: 10,
  MIN_HEIGHT: 10,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    'image/heif'
  ],
  // Extended MIME types for metadata analysis (more permissive)
  METADATA_ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
    'image/tiff',
    'image/tif',
    'image/bmp',
    'image/x-bmp',
    'image/x-ms-bmp',
    'image/vnd.microsoft.icon',
    'image/x-icon',
    'image/icon',
    'image/ico',
    'image/avif',
    'image/jxl',
    'image/jp2',
    'image/jpx',
    'image/jpm',
    'image/mj2',
    // Common RAW camera formats - metadata extraction only
    'image/x-canon-cr2',
    'image/x-canon-cr3',
    'image/x-canon-crw',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-panasonic-raw',
    'image/x-olympus-orf',
    'image/x-fuji-raf',
    'image/x-pentax-pef',
    'image/x-samsung-srw',
    'image/x-sigma-x3f'
  ]
};

// Ensure uploads directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const blogsDir = path.join(uploadDir, 'blogs');
const processedDir = path.join(uploadDir, 'processed');
const archivesDir = path.join(uploadDir, 'archives');

// Create directories if they don't exist
[uploadDir, blogsDir, processedDir, archivesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if this is a blog image upload (based on the route or a flag in the request)
    const isBlogUpload = req.path === '/api/upload' || 
                         req.path === '/upload' || 
                         req.query.type === 'blog' || 
                         (req.body && req.body.type === 'blog');
    
    if (isBlogUpload) {
      cb(null, blogsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with the original extension
    const ext = path.extname(file.originalname);
    const id = uuidv4();
    
    // Check if this is a blog image upload
    const isBlogUpload = req.path === '/api/upload' || 
                         req.path === '/upload' || 
                         req.query.type === 'blog' || 
                         (req.body && req.body.type === 'blog');
    
    if (isBlogUpload) {
      // For blog images, prefix with 'blog-'
      cb(null, `blog-${id}${ext}`);
    } else {
      // For other uploads, use the UUID directly
      cb(null, `${id}${ext}`);
    }
  }
});

// Create a filter function for file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if the file type is allowed
  if (IMAGE_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${IMAGE_LIMITS.ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

// Create a more permissive filter for metadata analysis
const metadataFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if the file type is allowed for metadata analysis
  if (IMAGE_LIMITS.METADATA_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Fallback: Check file extension for common cases where MIME detection fails
    let actualMimeType = file.mimetype;
    
    if (file.mimetype === 'application/octet-stream') {
      const ext = file.originalname.toLowerCase().split('.').pop();
      const extensionToMimeMap: {[key: string]: string} = {
        'heic': 'image/heic',
        'heif': 'image/heif',
        'cr2': 'image/x-canon-cr2',
        'cr3': 'image/x-canon-cr3',
        'nef': 'image/x-nikon-nef',
        'arw': 'image/x-sony-arw',
        'dng': 'image/x-adobe-dng',
        'orf': 'image/x-olympus-orf',
        'raf': 'image/x-fuji-raf',
        'pef': 'image/x-pentax-pef',
        'srw': 'image/x-samsung-srw',
        'x3f': 'image/x-sigma-x3f',
        'tiff': 'image/tiff',
        'tif': 'image/tiff',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'gif': 'image/gif',
        'avif': 'image/avif'
      };
      
      if (ext && extensionToMimeMap[ext]) {
        actualMimeType = extensionToMimeMap[ext];
  
      }
    }
    
    // Check again with corrected MIME type
    if (IMAGE_LIMITS.METADATA_ALLOWED_MIME_TYPES.includes(actualMimeType)) {
      file.mimetype = actualMimeType;
      cb(null, true);
    } else {

      cb(new Error(`Invalid file type "${file.mimetype}". Allowed types: ${IMAGE_LIMITS.METADATA_ALLOWED_MIME_TYPES.join(', ')}`));
    }
  }
};

// Create the multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: IMAGE_LIMITS.MAX_FILE_SIZE
  }
});

// Create metadata-specific upload middleware with extended file type support
export const createMetadataUpload = () => {
  return multer({
    storage,
    fileFilter: metadataFileFilter,
    limits: {
      fileSize: IMAGE_LIMITS.MAX_FILE_SIZE
    }
  });
};

// Dynamic upload middleware factory that uses current database settings
export const createDynamicUpload = () => {
  return multer({
    storage,
    fileFilter: async (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      try {
        // Get current file upload settings
        const settings = await getFileUploadSettings();
        
        // Check if this is a metadata analysis request
        const isMetadataRequest = req.path.includes('/metadata');
        const allowedTypes = isMetadataRequest ? 
          IMAGE_LIMITS.METADATA_ALLOWED_MIME_TYPES : 
          IMAGE_LIMITS.ALLOWED_MIME_TYPES;
        
        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          // Fallback: Check file extension for common cases where MIME detection fails
          let actualMimeType = file.mimetype;
          
          if (file.mimetype === 'application/octet-stream') {
            const ext = file.originalname.toLowerCase().split('.').pop();
            const extensionToMimeMap: {[key: string]: string} = {
              'heic': 'image/heic',
              'heif': 'image/heif',
              'cr2': 'image/x-canon-cr2',
              'cr3': 'image/x-canon-cr3',
              'nef': 'image/x-nikon-nef',
              'arw': 'image/x-sony-arw',
              'dng': 'image/x-adobe-dng',
              'orf': 'image/x-olympus-orf',
              'raf': 'image/x-fuji-raf',
              'pef': 'image/x-pentax-pef',
              'srw': 'image/x-samsung-srw',
              'x3f': 'image/x-sigma-x3f',
              'tiff': 'image/tiff',
              'tif': 'image/tiff',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'webp': 'image/webp',
              'bmp': 'image/bmp',
              'gif': 'image/gif',
              'avif': 'image/avif'
            };
            
            if (ext && extensionToMimeMap[ext]) {
              actualMimeType = extensionToMimeMap[ext];
        
            }
          }
          
          // Check again with corrected MIME type
          if (!allowedTypes.includes(actualMimeType)) {
    
            return cb(new Error(`Invalid file type "${file.mimetype}". Allowed types: ${allowedTypes.join(', ')}`));
          } else {
            // Update the file object with corrected MIME type
            file.mimetype = actualMimeType;
          }
        }
        
        // Attach settings to request for later use
        (req as any).uploadSettings = settings;
        
        cb(null, true);
      } catch (error) {
        logger.error('Error getting upload settings:', error);
        // Fall back to static file filter
        const isMetadataRequest = req.path.includes('/metadata');
        const allowedTypes = isMetadataRequest ? 
          IMAGE_LIMITS.METADATA_ALLOWED_MIME_TYPES : 
          IMAGE_LIMITS.ALLOWED_MIME_TYPES;
          
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
  
          cb(new Error(`Invalid file type "${file.mimetype}". Allowed types: ${allowedTypes.join(', ')}`));
        }
      }
    },
    limits: {
      fileSize: IMAGE_LIMITS.MAX_FILE_SIZE // Will be checked dynamically in middleware
    }
  });
};

// Middleware to validate file size against dynamic settings
export const validateDynamicFileSize = async (req: any, res: any, next: any) => {
  try {
    const settings = req.uploadSettings || await getFileUploadSettings();
    const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : []);
    
    // Check file count
    if (files.length > settings.maxFiles) {
      // Clean up uploaded files
      files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      return res.status(400).json({
        status: 'error',
        message: `Too many files. Maximum allowed: ${settings.maxFiles}`
      });
    }
    
    // Check file sizes
    for (const file of files) {
      if (file.size > settings.maxFileSize) {
        // Clean up uploaded files
        files.forEach(f => {
          if (f.path && fs.existsSync(f.path)) {
            fs.unlinkSync(f.path);
          }
        });
        
        return res.status(400).json({
          status: 'error',
          message: `File size exceeds limit. Maximum allowed: ${Math.round(settings.maxFileSize / 1048576)}MB`
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error validating dynamic file size:', error);
    next(); // Continue with static validation
  }
};

// Middleware to validate image dimensions after upload
export const validateImageDimensions = async (req: any, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  try {
    // Get image metadata using sharp
    const metadata = await sharp(req.file.path).metadata();
    
    // Check dimensions
    if (metadata.width && metadata.height) {
      if (metadata.width > IMAGE_LIMITS.MAX_WIDTH || metadata.height > IMAGE_LIMITS.MAX_HEIGHT) {
        // Delete the file
        fs.unlinkSync(req.file.path);
        
        return res.status(400).json({
          status: 'error',
          message: `Image dimensions too large. Maximum allowed: ${IMAGE_LIMITS.MAX_WIDTH}x${IMAGE_LIMITS.MAX_HEIGHT}`
        });
      }
      
      if (metadata.width < IMAGE_LIMITS.MIN_WIDTH || metadata.height < IMAGE_LIMITS.MIN_HEIGHT) {
        // Delete the file
        fs.unlinkSync(req.file.path);
        
        return res.status(400).json({
          status: 'error',
          message: `Image dimensions too small. Minimum allowed: ${IMAGE_LIMITS.MIN_WIDTH}x${IMAGE_LIMITS.MIN_HEIGHT}`
        });
      }
    }
    
    next();
  } catch (error: any) {
    // Delete the file if we can't process it
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.error(`Error removing invalid file: ${(unlinkError as Error).message}`);
      }
    }
    
    logger.error(`Error validating image dimensions: ${error.message}`);
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid image file. Could not process dimensions.'
    });
  }
}; 