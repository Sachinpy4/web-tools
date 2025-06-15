"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMediaFile = exports.deleteMedia = exports.updateMedia = exports.getMedia = exports.getMediaItems = exports.uploadMedia = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
const Media_1 = __importDefault(require("../models/Media"));
const asyncHandler_1 = require("../utils/asyncHandler");
/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
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
exports.uploadMedia = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // Check if files exist (either as array or single file)
    const files = req.files || (req.file ? [req.file] : null);
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
    const mediaResults = [];
    for (const file of files) {
        console.log(`Media upload - Type: ${file.mimetype}, Size: ${formatFileSize(file.size)}, Blog: ${isBlogImage ? 'Yes' : 'No'}`);
        // Generate unique filename while preserving the original filename
        const originalNameWithoutExt = path_1.default.basename(file.originalname, path_1.default.extname(file.originalname));
        // Clean filename: replace spaces and special chars with dashes, lowercase
        const cleanedName = originalNameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        // Add short unique id at the end to avoid conflicts (first 8 chars of UUID)
        const uniqueId = (0, uuid_1.v4)().split('-')[0];
        const uniqueFilename = `blog-${cleanedName}-${uniqueId}${path_1.default.extname(file.originalname)}`;
        // Always use blogs directory for media uploads
        const uploadDir = path_1.default.join('uploads', 'blogs');
        const uploadPath = path_1.default.join(uploadDir, uniqueFilename);
        console.log(`Uploading to: ${uploadPath}`);
        // Ensure the directory exists
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
            console.log(`Created directory: ${uploadDir}`);
        }
        // Get image dimensions using Sharp
        let width, height;
        try {
            if (file.mimetype.startsWith('image/')) {
                const metadata = await (0, sharp_1.default)(file.buffer || file.path).metadata();
                width = metadata.width;
                height = metadata.height;
                // Save optimized version for images
                await (0, sharp_1.default)(file.buffer || file.path)
                    .resize(1920) // Limit max width to 1920px
                    .toFile(path_1.default.join(uploadDir, uniqueFilename));
            }
            else {
                // For non-image files, just save the file as is
                fs_1.default.writeFileSync(path_1.default.join(uploadDir, uniqueFilename), file.buffer || fs_1.default.readFileSync(file.path));
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
            const media = await Media_1.default.create({
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
                tags: req.body.tags ? req.body.tags.split(',').map((tag) => tag.trim()) : [],
                uploadedBy: req.user?.id,
                isBlogImage: isBlogImage // Store this info in the database
            });
            mediaResults.push(media);
        }
        catch (error) {
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
exports.getMediaItems = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Build query
    let query = {};
    // Filter by type if provided
    if (req.query.type) {
        query.mimetype = { $regex: new RegExp(`^${req.query.type}/`) };
    }
    // Search if provided
    if (req.query.search) {
        query.$text = { $search: req.query.search };
    }
    // Filter by tags if provided
    if (req.query.tag) {
        query.tags = req.query.tag;
    }
    // Count total items for pagination
    const total = await Media_1.default.countDocuments(query);
    // Execute query with pagination
    const media = await Media_1.default.find(query)
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
exports.getMedia = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const media = await Media_1.default.findById(req.params.id)
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
exports.updateMedia = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const { alt, title, description, tags } = req.body;
    const media = await Media_1.default.findById(req.params.id);
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
    media.tags = tags ? tags.split(',').map((tag) => tag.trim()) : media.tags;
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
exports.deleteMedia = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const media = await Media_1.default.findById(req.params.id);
    if (!media) {
        return res.status(404).json({
            status: 'error',
            message: 'Media item not found'
        });
    }
    // Delete file from disk
    try {
        fs_1.default.unlinkSync(media.path);
    }
    catch (error) {
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
exports.getMediaFile = (0, asyncHandler_1.asyncHandler)(async (req, res, next) => {
    const filename = req.params.filename;
    // Handle blog subfolder if path includes 'blogs/'
    let filePath;
    if (filename.startsWith('blogs/')) {
        // Extract the actual filename from the path
        const actualFilename = filename.replace('blogs/', '');
        filePath = path_1.default.join('uploads', 'blogs', actualFilename);
    }
    else {
        filePath = path_1.default.join('uploads', filename);
    }
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({
            status: 'error',
            message: 'File not found'
        });
    }
    // Increment usage count
    const queryFilename = filename.startsWith('blogs/')
        ? filename.replace('blogs/', '')
        : filename;
    await Media_1.default.findOneAndUpdate({ filename: queryFilename }, { $inc: { uses: 1 } });
    // Determine content type
    const media = await Media_1.default.findOne({ filename: queryFilename });
    if (media) {
        res.setHeader('Content-Type', media.mimetype);
    }
    // Send file
    res.sendFile(path_1.default.resolve(filePath));
});
//# sourceMappingURL=mediaController.js.map