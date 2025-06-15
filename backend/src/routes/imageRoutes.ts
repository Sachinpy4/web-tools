import { Router } from 'express';
// Import auth middleware if needed
// import { requireAdminRole } from '../middleware/auth';
import { createDynamicUpload, validateDynamicFileSize } from '../middleware/upload';
import { 
  compressImage, 
  resizeImage, 
  convertImage,
  cropImage,
  getJobStatus,
  optimizeBlogImage,
  extractMetadata
} from '../controllers/imageController';
import { imageProcessingLimiter, batchOperationLimiter } from '../middleware/rateLimiter';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create dynamic upload middleware instance
const dynamicUpload = createDynamicUpload();

/**
 * @route GET /api/images/status/:id
 * @desc Get status for a job
 */
router.get('/status/:id', getJobStatus);

/**
 * @route POST /api/images/compress
 * @desc Compress an image
 */
router.post('/compress', imageProcessingLimiter, dynamicUpload.single('image'), validateDynamicFileSize, compressImage);

/**
 * @route POST /api/images/resize
 * @desc Resize an image
 */
router.post('/resize', imageProcessingLimiter, dynamicUpload.single('image'), validateDynamicFileSize, resizeImage);

/**
 * @route POST /api/images/convert
 * @desc Convert image format
 */
router.post('/convert', imageProcessingLimiter, dynamicUpload.single('image'), validateDynamicFileSize, convertImage);

/**
 * @route POST /api/images/crop
 * @desc Crop an image
 */
router.post('/crop', imageProcessingLimiter, dynamicUpload.single('image'), validateDynamicFileSize, cropImage);

/**
 * @route POST /api/images/optimize-blog
 * @desc Optimize an image for blog usage
 */
router.post('/optimize-blog', imageProcessingLimiter, dynamicUpload.single('image'), validateDynamicFileSize, optimizeBlogImage);

/**
 * @route POST /api/images/metadata
 * @desc Extract comprehensive metadata from an image
 */
router.post('/metadata', imageProcessingLimiter, dynamicUpload.single('image'), validateDynamicFileSize, extractMetadata);

/**
 * @route GET /api/images/download/:filename
 * @desc Download a processed image with proper headers for forcing download
 */
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const originalFilename = req.query.originalFilename as string || filename;
  const filePath = path.join(__dirname, '../../uploads/processed', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      status: 'error',
      message: 'File not found'
    });
  }

  // Set headers to force download with original filename
  res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  
  // Stream the file to response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

/**
 * @route POST /api/images/archive
 * @desc Create a ZIP archive of multiple compressed images
 */
router.post('/archive', batchOperationLimiter, async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files provided for archive'
      });
    }
    
    // Create archive directory if it doesn't exist
    const archiveDir = path.join(__dirname, '../../uploads/archives');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // Create a unique archive filename
    const archiveFilename = `tool-compressed-images-${uuidv4()}.zip`;
    const archivePath = path.join(archiveDir, archiveFilename);
    
    // Create a file to stream archive data to
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });
    
    // Listen for all archive data to be written
    output.on('close', () => {
      res.status(200).json({
        status: 'success',
        data: {
          filename: archiveFilename,
          size: archive.pointer(),
          downloadUrl: `/api/images/download-archive/${archiveFilename}`
        }
      });
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Add each file to the archive with its original filename
    for (const file of files) {
      const filePath = path.join(__dirname, '../../uploads/processed', file.filename);
      
      if (fs.existsSync(filePath)) {
        // Use the original filename for the archived file
        archive.file(filePath, { name: file.originalName });
      }
    }
    
    // Finalize the archive (write the zip)
    await archive.finalize();
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create archive'
    });
  }
});

/**
 * @route GET /api/images/download-archive/:filename
 * @desc Download an archive
 */
router.get('/download-archive/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../uploads/archives', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      status: 'error',
      message: 'Archive not found'
    });
  }

  // Use a user-friendly name for the downloaded file
  const downloadName = 'compressed-images.zip';
  
  // Set headers to force download
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Type', 'application/zip');
  
  // Stream the file to response
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

export default router; 