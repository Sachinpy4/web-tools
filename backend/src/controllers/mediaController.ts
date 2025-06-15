import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Media, { IMedia } from '../models/Media';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * @desc    Upload a new media item
 * @route   POST /api/media
 * @access  Private (Admin Only)
 */
export const uploadMedia = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Check if files exist (either as array or single file)
  const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : null);
  
  if (!files || files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No files uploaded'
    });
  }

  // UPDATED: Always save media uploads to the blogs folder since they're intended for blog use
  // This ensures consistency between direct uploads and media library uploads
  const isBlogImage = true;
  console.log(`Processing ${files.length} file(s) for upload`);
  
  // Process each file
  const mediaResults: any[] = [];
  
  for (const file of files) {
    console.log(`Media upload - Type: ${file.mimetype}, Size: ${formatFileSize(file.size)}, Blog: ${isBlogImage ? 'Yes' : 'No'}`);
    
    // Generate unique filename while preserving the original filename
    const originalNameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));
    // Clean filename: replace spaces and special chars with dashes, lowercase
    const cleanedName = originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    // Add short unique id at the end to avoid conflicts (first 8 chars of UUID)
    const uniqueId = uuidv4().split('-')[0];
    const uniqueFilename = `blog-${cleanedName}-${uniqueId}${path.extname(file.originalname)}`;
    
    // Always use blogs directory for media uploads
    const uploadDir = path.join('uploads', 'blogs');
    const uploadPath = path.join(uploadDir, uniqueFilename);
    
    console.log(`Uploading to: ${uploadPath}`);
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created directory: ${uploadDir}`);
    }
    
    // Get image dimensions using Sharp
    let width, height;
    
    try {
      if (file.mimetype.startsWith('image/')) {
        const metadata = await sharp(file.buffer || file.path).metadata();
        width = metadata.width;
        height = metadata.height;
        
        // Save optimized version for images
        await sharp(file.buffer || file.path)
          .resize(1920) // Limit max width to 1920px
          .toFile(path.join(uploadDir, uniqueFilename));
      } else {
        // For non-image files, just save the file as is
        fs.writeFileSync(path.join(uploadDir, uniqueFilename), 
          file.buffer || fs.readFileSync(file.path));
      }
      
      // Create the correct URL path based on the directory
      const urlPath = `/api/media/file/blogs/${uniqueFilename}`;
      
      // Get alt text for this specific file index if provided
      const altIndex = files.indexOf(file);
      const altText = req.body.alt 
        ? Array.isArray(req.body.alt) 
          ? req.body.alt[altIndex] || file.originalname
          : req.body.alt || file.originalname
        : file.originalname;
      
      // Create media record
      const media = await Media.create({
        filename: uniqueFilename,
        originalname: file.originalname,
        path: uploadPath,
        url: urlPath,
        size: file.size,
        mimetype: file.mimetype,
        width,
        height,
        alt: altText,
        title: req.body.title || '',
        description: req.body.description || '',
        tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : [],
        uploadedBy: req.user?.id,
        isBlogImage: isBlogImage // Store this info in the database
      });
      
      mediaResults.push(media);
      
    } catch (error) {
      console.error('Error processing upload:', error);
      // Continue with remaining files even if one fails
    }
  }
  
  if (mediaResults.length === 0) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process any of the uploaded files'
    });
  }
  
  res.status(201).json({
    status: 'success',
    data: mediaResults
  });
});

/**
 * @desc    Get all media items with pagination and filters
 * @route   GET /api/media
 * @access  Private (Admin Only)
 */
export const getMediaItems = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  // Build query
  let query: any = {};
  
  // Filter by type if provided
  if (req.query.type) {
    query.mimetype = { $regex: new RegExp(`^${req.query.type}/`) };
  }
  
  // Search if provided
  if (req.query.search) {
    query.$text = { $search: req.query.search as string };
  }
  
  // Filter by tags if provided
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  
  // Count total items for pagination
  const total = await Media.countDocuments(query);
  
  // Execute query with pagination
  const media = await Media.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'name email');
  
  res.status(200).json({
    status: 'success',
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
    data: media
  });
});

/**
 * @desc    Get a single media item
 * @route   GET /api/media/:id
 * @access  Private (Admin Only)
 */
export const getMedia = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const media = await Media.findById(req.params.id)
    .populate('uploadedBy', 'name email');
  
  if (!media) {
    return res.status(404).json({
      status: 'error',
      message: 'Media item not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: media
  });
});

/**
 * @desc    Update a media item
 * @route   PUT /api/media/:id
 * @access  Private (Admin Only)
 */
export const updateMedia = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { alt, title, description, tags } = req.body;
  
  const media = await Media.findById(req.params.id);
  
  if (!media) {
    return res.status(404).json({
      status: 'error',
      message: 'Media item not found'
    });
  }
  
  // Update media record
  media.alt = alt || media.alt;
  media.title = title || media.title;
  media.description = description || media.description;
  media.tags = tags ? tags.split(',').map((tag: string) => tag.trim()) : media.tags;
  
  await media.save();
  
  res.status(200).json({
    status: 'success',
    data: media
  });
});

/**
 * @desc    Delete a media item
 * @route   DELETE /api/media/:id
 * @access  Private (Admin Only)
 */
export const deleteMedia = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const media = await Media.findById(req.params.id);
  
  if (!media) {
    return res.status(404).json({
      status: 'error',
      message: 'Media item not found'
    });
  }
  
  // Delete file from disk
  try {
    fs.unlinkSync(media.path);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Continue with deletion even if file removal fails
  }
  
  // Delete database record
  await media.deleteOne();
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Get file content
 * @route   GET /api/media/file/:filename
 * @access  Public
 */
export const getMediaFile = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const filename = req.params.filename;
  
  // Handle blog subfolder if path includes 'blogs/'
  let filePath;
  if (filename.startsWith('blogs/')) {
    // Extract the actual filename from the path
    const actualFilename = filename.replace('blogs/', '');
    filePath = path.join('uploads', 'blogs', actualFilename);
  } else {
    filePath = path.join('uploads', filename);
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      status: 'error',
      message: 'File not found'
    });
  }
  
  // Increment usage count
  const queryFilename = filename.startsWith('blogs/') 
    ? filename.replace('blogs/', '') 
    : filename;
    
  await Media.findOneAndUpdate(
    { filename: queryFilename },
    { $inc: { uses: 1 } }
  );
  
  // Determine content type
  const media = await Media.findOne({ filename: queryFilename });
  if (media) {
    res.setHeader('Content-Type', media.mimetype);
  }
  
  // Send file
  res.sendFile(path.resolve(filePath));
}); 