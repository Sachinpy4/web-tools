"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressImageService = compressImageService;
exports.resizeImageService = resizeImageService;
exports.convertImageService = convertImageService;
exports.cropImageService = cropImageService;
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
const jobTrackingService_1 = require("./jobTrackingService");
// Ensure uploads directories exist
const createUploadDirs = async () => {
    const uploadDir = path_1.default.join(__dirname, '../../uploads');
    const processedDir = path_1.default.join(__dirname, '../../uploads/processed');
    try {
        await promises_1.default.mkdir(uploadDir, { recursive: true });
        await promises_1.default.mkdir(processedDir, { recursive: true });
    }
    catch (err) {
        console.error('Error creating upload directories:', err);
    }
};
// Create dirs on module import
createUploadDirs();
/**
 * Compress an image with Sharp
 */
async function compressImageService(filePath, quality = 80) {
    const startTime = Date.now();
    try {
        // Ensure quality is in valid range
        const validQuality = Math.max(1, Math.min(100, quality));
        if (validQuality !== quality) {
            console.log(`Quality adjusted from ${quality} to valid range: ${validQuality}`);
        }
        const image = (0, sharp_1.default)(filePath);
        const metadata = await image.metadata();
        const ext = path_1.default.extname(filePath);
        const outputPath = path_1.default.join(__dirname, '../../uploads/processed', `tool-compressed-${(0, uuid_1.v4)()}${ext}`);
        console.log('Image format:', metadata.format);
        console.log('Using quality setting:', validQuality);
        let processedImage;
        let mime;
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
                console.log('PNG quality adjusted to:', pngQuality);
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
        console.log('Compression complete:');
        console.log('- Original size:', metadata.size || 'unknown', 'bytes');
        console.log('- Compressed size:', processedImage.size, 'bytes');
        // Record the job completion
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('compress', processingTime, 'completed');
        return {
            path: outputPath,
            mime,
            width: processedImage.width,
            height: processedImage.height,
            size: processedImage.size
        };
    }
    catch (error) {
        // Record the job failure
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('compress', processingTime, 'failed');
        throw error;
    }
}
/**
 * Resize an image with Sharp
 */
async function resizeImageService(filePath, width, height, fit = 'contain') {
    const startTime = Date.now();
    try {
        const image = (0, sharp_1.default)(filePath);
        const metadata = await image.metadata();
        const ext = path_1.default.extname(filePath);
        const outputPath = path_1.default.join(__dirname, '../../uploads/processed', `tool-resized-${(0, uuid_1.v4)()}${ext}`);
        // Validate fit option
        const validFit = ['cover', 'contain', 'fill', 'inside', 'outside'];
        const fitOption = validFit.includes(fit) ? fit : 'cover';
        // Process resize
        let processedImage = await image
            .resize({
            width,
            height,
            fit: fitOption
        })
            .toFile(outputPath);
        // Record the job completion
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('resize', processingTime, 'completed');
        return {
            path: outputPath,
            mime: `image/${metadata.format}`,
            width: processedImage.width,
            height: processedImage.height
        };
    }
    catch (error) {
        // Record the job failure
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('resize', processingTime, 'failed');
        throw error;
    }
}
/**
 * Convert an image format with Sharp
 */
async function convertImageService(filePath, format) {
    const startTime = Date.now();
    try {
        const image = (0, sharp_1.default)(filePath);
        const outputPath = path_1.default.join(__dirname, '../../uploads/processed', `tool-converted-${(0, uuid_1.v4)()}.${format}`);
        let processedImage;
        let mime;
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
        await (0, jobTrackingService_1.recordJobCompletion)('convert', processingTime, 'completed');
        return {
            path: outputPath,
            mime,
            width: processedImage.width,
            height: processedImage.height
        };
    }
    catch (error) {
        // Record the job failure
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('convert', processingTime, 'failed');
        throw error;
    }
}
/**
 * Crop an image with Sharp
 */
async function cropImageService(filePath, left, top, width, height) {
    const startTime = Date.now();
    try {
        console.log('Crop request received:');
        console.log('- File:', filePath);
        console.log('- Crop area:', `left=${left}, top=${top}, width=${width}, height=${height}`);
        const image = (0, sharp_1.default)(filePath);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error('Could not determine image dimensions');
        }
        console.log('- Image dimensions:', `${metadata.width}x${metadata.height}`);
        // Validate crop parameters
        const validLeft = Math.max(0, Math.min(left, metadata.width - 1));
        const validTop = Math.max(0, Math.min(top, metadata.height - 1));
        let validWidth = Math.max(1, Math.min(width, metadata.width - validLeft));
        let validHeight = Math.max(1, Math.min(height, metadata.height - validTop));
        // Log if we had to adjust the crop area
        if (validLeft !== left || validTop !== top || validWidth !== width || validHeight !== height) {
            console.log('Adjusted crop parameters to fit within image:');
            console.log(`Original: left=${left}, top=${top}, width=${width}, height=${height}`);
            console.log(`Adjusted: left=${validLeft}, top=${validTop}, width=${validWidth}, height=${validHeight}`);
        }
        const ext = path_1.default.extname(filePath);
        const outputPath = path_1.default.join(__dirname, '../../uploads/processed', `tool-cropped-${(0, uuid_1.v4)()}${ext}`);
        // Process crop with validated parameters
        const processedImage = await image
            .extract({
            left: validLeft,
            top: validTop,
            width: validWidth,
            height: validHeight
        })
            .toFile(outputPath);
        console.log('Crop completed successfully:');
        console.log('- Output dimensions:', `${processedImage.width}x${processedImage.height}`);
        // Record the job completion
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('crop', processingTime, 'completed');
        return {
            path: outputPath,
            mime: `image/${metadata.format}`,
            width: processedImage.width,
            height: processedImage.height
        };
    }
    catch (error) {
        // Record the job failure
        const processingTime = Date.now() - startTime;
        await (0, jobTrackingService_1.recordJobCompletion)('crop', processingTime, 'failed');
        throw error;
    }
}
//# sourceMappingURL=imageService.js.map