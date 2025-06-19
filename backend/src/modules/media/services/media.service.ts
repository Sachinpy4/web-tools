import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import Sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { Media, MediaDocument } from '../schemas/media.schema';
import { UploadMediaDto, UpdateMediaDto, MediaQueryDto, BulkDeleteDto, BulkUpdateDto } from '../dto/media.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Upload media files
   */
  async uploadMedia(files: Express.Multer.File[], uploadMediaDto: UploadMediaDto, userId: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    console.log(`Processing ${files.length} file(s) for upload`);
    
    const mediaResults: any[] = [];
    
    for (const file of files) {
      console.log(`Media upload - Type: ${file.mimetype}, Size: ${this.formatFileSize(file.size)}`);
      
      try {
        // Generate unique filename while preserving the original filename
        const originalNameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));
        const cleanedName = originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
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
        let width: number | undefined;
        let height: number | undefined;
        
        if (file.mimetype.startsWith('image/')) {
          const metadata = await Sharp(file.buffer || file.path).metadata();
          width = metadata.width;
          height = metadata.height;
          
          // Save optimized version for images
          await Sharp(file.buffer || file.path)
            .resize(1920) // Limit max width to 1920px
            .toFile(uploadPath);
        } else {
          // For non-image files, just save the file as is
          fs.writeFileSync(uploadPath, file.buffer || fs.readFileSync(file.path));
        }
        
        // Create the correct URL path based on the directory
        const urlPath = `/api/media/file/blogs/${uniqueFilename}`;
        
        // Parse tags if provided
        const tags = uploadMediaDto.tags 
          ? uploadMediaDto.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : [];
        
        // Get alt text for this specific file index if provided
        const altIndex = files.indexOf(file);
        let altText = file.originalname;
        
        if (uploadMediaDto.alt) {
          if (typeof uploadMediaDto.alt === 'string') {
            try {
              // Try to parse as JSON array first
              const parsedAlt = JSON.parse(uploadMediaDto.alt);
              if (Array.isArray(parsedAlt)) {
                altText = parsedAlt[altIndex] || file.originalname;
              } else {
                // Single string value for all files
                altText = uploadMediaDto.alt;
              }
            } catch {
              // Not JSON, use as single string value for all files
              altText = uploadMediaDto.alt;
            }
          } else if (Array.isArray(uploadMediaDto.alt)) {
            // Already an array
            altText = uploadMediaDto.alt[altIndex] || file.originalname;
          }
        }

        // Create media record
        const media = await this.mediaModel.create({
          filename: uniqueFilename,
          originalname: file.originalname,
          path: uploadPath,
          url: urlPath,
          size: file.size,
          mimetype: file.mimetype,
          width,
          height,
          alt: altText,
          title: uploadMediaDto.title || '',
          description: uploadMediaDto.description || '',
          tags,
          uploadedBy: userId,
        });
        
        mediaResults.push(media);
        
      } catch (error) {
        console.error('Error processing upload:', error);
        throw new InternalServerErrorException(`Failed to process file: ${file.originalname}`);
      }
    }
    
    return {
      status: 'success',
      data: mediaResults,
    };
  }

  /**
   * Get all media items with pagination and filters
   */
  async getMediaItems(query: MediaQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    
    // Build query
    const dbQuery: any = {};
    
    // Filter by type if provided
    if (query.type) {
      dbQuery.mimetype = { $regex: new RegExp(`^${query.type}/`) };
    }
    
    // Search if provided
    if (query.search) {
      dbQuery.$text = { $search: query.search };
    }
    
    // Filter by tags if provided
    if (query.tag) {
      dbQuery.tags = query.tag;
    }
    
    // Filter by uploader if provided
    if (query.uploadedBy) {
      dbQuery.uploadedBy = query.uploadedBy;
    }
    
    // Build sort object
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortBy] = sortOrder;
    
    // Count total items for pagination
    const total = await this.mediaModel.countDocuments(dbQuery);
    
    // Execute query with pagination
    const media = await this.mediaModel
      .find(dbQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy', 'name email');
    
    return {
      status: 'success',
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      data: media,
    };
  }

  /**
   * Get a single media item
   */
  async getMediaItem(mediaId: string) {
    const media = await this.mediaModel
      .findById(mediaId)
      .populate('uploadedBy', 'name email');
    
    if (!media) {
      throw new NotFoundException('Media item not found');
    }
    
    return {
      status: 'success',
      data: media,
    };
  }

  /**
   * Update a media item
   */
  async updateMediaItem(mediaId: string, updateMediaDto: UpdateMediaDto) {
    const media = await this.mediaModel.findById(mediaId);
    
    if (!media) {
      throw new NotFoundException('Media item not found');
    }
    
    const updatedMedia = await this.mediaModel.findByIdAndUpdate(
      mediaId,
      updateMediaDto,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'name email');
    
    return {
      status: 'success',
      data: updatedMedia,
    };
  }

  /**
   * Delete a media item
   */
  async deleteMediaItem(mediaId: string) {
    const media = await this.mediaModel.findById(mediaId);
    
    if (!media) {
      throw new NotFoundException('Media item not found');
    }
    
    // Delete the physical file
    try {
      if (fs.existsSync(media.path)) {
        fs.unlinkSync(media.path);
        console.log(`Deleted file: ${media.path}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue with database deletion even if file deletion fails
    }
    
    await this.mediaModel.findByIdAndDelete(mediaId);
    
    return {
      status: 'success',
      message: 'Media item deleted successfully',
    };
  }

  /**
   * Serve a media file
   */
  async serveFile(folder: string, filename: string): Promise<{ path: string; mimetype: string }> {
    const filePath = path.join('uploads', folder, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    
    // Get media record to retrieve mimetype
    const media = await this.mediaModel.findOne({ filename });
    
    return {
      path: filePath,
      mimetype: media?.mimetype || 'application/octet-stream',
    };
  }

  /**
   * Increment usage counter for a media item
   */
  async incrementUsage(mediaId: string) {
    await this.mediaModel.findByIdAndUpdate(
      mediaId,
      { $inc: { uses: 1 } }
    );
  }

  /**
   * Get media statistics
   */
  async getMediaStats() {
    const totalFiles = await this.mediaModel.countDocuments();
    
    // Get total size
    const sizeResult = await this.mediaModel.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
        },
      },
    ]);
    
    const totalSizeBytes = sizeResult[0]?.totalSize || 0;
    
    // Get file types distribution
    const fileTypesResult = await this.mediaModel.aggregate([
      {
        $group: {
          _id: '$mimetype',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const fileTypes: any = {};
    fileTypesResult.forEach(item => {
      fileTypes[item._id] = item.count;
    });
    
    // Get uploads this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const uploadsThisMonth = await this.mediaModel.countDocuments({
      createdAt: { $gte: startOfMonth },
    });
    
    // Get most used files
    const mostUsedFiles = await this.mediaModel
      .find({}, 'originalname uses url')
      .sort({ uses: -1 })
      .limit(10);
    
    return {
      status: 'success',
      data: {
        totalFiles,
        totalSizeBytes,
        totalSizeFormatted: this.formatFileSize(totalSizeBytes),
        fileTypes,
        uploadsThisMonth,
        mostUsedFiles,
      },
    };
  }

  /**
   * Get recent uploads
   */
  async getRecentUploads(limit: number = 10) {
    const media = await this.mediaModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('uploadedBy', 'name email');
    
    return {
      status: 'success',
      data: media,
    };
  }

  /**
   * Bulk delete media items
   */
  async bulkDeleteMedia(bulkDeleteDto: BulkDeleteDto) {
    const { mediaIds } = bulkDeleteDto;
    
    // Find all media items to delete
    const mediaItems = await this.mediaModel.find({ _id: { $in: mediaIds } });
    
    // Delete physical files
    let deletedFiles = 0;
    for (const media of mediaItems) {
      try {
        if (fs.existsSync(media.path)) {
          fs.unlinkSync(media.path);
          deletedFiles++;
        }
      } catch (error) {
        console.error(`Error deleting file ${media.path}:`, error);
      }
    }
    
    // Delete database records
    const result = await this.mediaModel.deleteMany({ _id: { $in: mediaIds } });
    
    return {
      status: 'success',
      message: `${result.deletedCount} media items deleted successfully`,
      deletedFiles,
      deletedRecords: result.deletedCount,
    };
  }

  /**
   * Bulk update media items
   */
  async bulkUpdateMedia(bulkUpdateDto: BulkUpdateDto) {
    const { mediaIds, addTags, removeTags } = bulkUpdateDto;
    
    const updateOperations: any = {};
    
    if (addTags && addTags.length > 0) {
      updateOperations.$addToSet = { tags: { $each: addTags } };
    }
    
    if (removeTags && removeTags.length > 0) {
      updateOperations.$pullAll = { tags: removeTags };
    }
    
    if (Object.keys(updateOperations).length === 0) {
      throw new BadRequestException('No update operations specified');
    }
    
    const result = await this.mediaModel.updateMany(
      { _id: { $in: mediaIds } },
      updateOperations
    );
    
    return {
      status: 'success',
      message: `${result.modifiedCount} media items updated successfully`,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Search media by text
   */
  async searchMedia(searchTerm: string, limit: number = 20) {
    const media = await this.mediaModel
      .find(
        { $text: { $search: searchTerm } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .populate('uploadedBy', 'name email');
    
    return {
      status: 'success',
      data: media,
    };
  }
} 