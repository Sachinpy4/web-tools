"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Import auth middleware if needed
// import { requireAdminRole } from '../middleware/auth';
const upload_1 = require("../middleware/upload");
const imageController_1 = require("../controllers/imageController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// Create dynamic upload middleware instance
const dynamicUpload = (0, upload_1.createDynamicUpload)();
/**
 * @route GET /api/images/status/:id
 * @desc Get status for a job
 */
router.get('/status/:id', imageController_1.getJobStatus);
/**
 * @route POST /api/images/compress
 * @desc Compress an image
 */
router.post('/compress', rateLimiter_1.imageProcessingLimiter, dynamicUpload.single('image'), upload_1.validateDynamicFileSize, imageController_1.compressImage);
/**
 * @route POST /api/images/resize
 * @desc Resize an image
 */
router.post('/resize', rateLimiter_1.imageProcessingLimiter, dynamicUpload.single('image'), upload_1.validateDynamicFileSize, imageController_1.resizeImage);
/**
 * @route POST /api/images/convert
 * @desc Convert image format
 */
router.post('/convert', rateLimiter_1.imageProcessingLimiter, dynamicUpload.single('image'), upload_1.validateDynamicFileSize, imageController_1.convertImage);
/**
 * @route POST /api/images/crop
 * @desc Crop an image
 */
router.post('/crop', rateLimiter_1.imageProcessingLimiter, dynamicUpload.single('image'), upload_1.validateDynamicFileSize, imageController_1.cropImage);
/**
 * @route POST /api/images/optimize-blog
 * @desc Optimize an image for blog usage
 */
router.post('/optimize-blog', rateLimiter_1.imageProcessingLimiter, dynamicUpload.single('image'), upload_1.validateDynamicFileSize, imageController_1.optimizeBlogImage);
/**
 * @route POST /api/images/metadata
 * @desc Extract comprehensive metadata from an image
 */
router.post('/metadata', rateLimiter_1.imageProcessingLimiter, dynamicUpload.single('image'), upload_1.validateDynamicFileSize, imageController_1.extractMetadata);
/**
 * @route GET /api/images/download/:filename
 * @desc Download a processed image with proper headers for forcing download
 */
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const originalFilename = req.query.originalFilename || filename;
    const filePath = path_1.default.join(__dirname, '../../uploads/processed', filename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({
            status: 'error',
            message: 'File not found'
        });
    }
    // Set headers to force download with original filename
    res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    // Stream the file to response
    const fileStream = fs_1.default.createReadStream(filePath);
    fileStream.pipe(res);
});
/**
 * @route POST /api/images/archive
 * @desc Create a ZIP archive of multiple compressed images
 */
router.post('/archive', rateLimiter_1.batchOperationLimiter, async (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No files provided for archive'
            });
        }
        // Create archive directory if it doesn't exist
        const archiveDir = path_1.default.join(__dirname, '../../uploads/archives');
        if (!fs_1.default.existsSync(archiveDir)) {
            fs_1.default.mkdirSync(archiveDir, { recursive: true });
        }
        // Create a unique archive filename
        const archiveFilename = `tool-compressed-images-${(0, uuid_1.v4)()}.zip`;
        const archivePath = path_1.default.join(archiveDir, archiveFilename);
        // Create a file to stream archive data to
        const output = fs_1.default.createWriteStream(archivePath);
        const archive = (0, archiver_1.default)('zip', {
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
            const filePath = path_1.default.join(__dirname, '../../uploads/processed', file.filename);
            if (fs_1.default.existsSync(filePath)) {
                // Use the original filename for the archived file
                archive.file(filePath, { name: file.originalName });
            }
        }
        // Finalize the archive (write the zip)
        await archive.finalize();
    }
    catch (error) {
        console.error('Archive error:', error);
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
    const filePath = path_1.default.join(__dirname, '../../uploads/archives', filename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
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
    const fileStream = fs_1.default.createReadStream(filePath);
    fileStream.pipe(res);
});
exports.default = router;
//# sourceMappingURL=imageRoutes.js.map