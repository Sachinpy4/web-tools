"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const mediaController_1 = require("../controllers/mediaController");
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and common document formats
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images and common document formats are allowed.'), false);
        }
    }
});
// Public routes for serving files
router.get('/file/:filename', mediaController_1.getMediaFile);
router.get('/file/blogs/:filename', (req, res, next) => {
    // Modify the request parameters to include the blogs folder in the path
    req.params.filename = `blogs/${req.params.filename}`;
    (0, mediaController_1.getMediaFile)(req, res, next);
});
// Protected routes
router.use(authMiddleware_1.protect);
// Admin-only routes
router.route('/')
    .get((0, authMiddleware_1.restrictTo)('admin'), mediaController_1.getMediaItems)
    .post((0, authMiddleware_1.restrictTo)('admin'), 
// Add middleware to handle type parameters before multer processes the file
(req, res, next) => {
    // If type is in query params, transfer it to req.body
    // This ensures it's available during the multer storage configuration
    if (req.query.type && !req.body) {
        req.body = {};
    }
    if (req.query.type) {
        req.body.type = req.query.type;
    }
    next();
}, upload.array('file', 10), // Allow up to 10 files at once
mediaController_1.uploadMedia);
router.route('/:id')
    .get((0, authMiddleware_1.restrictTo)('admin'), mediaController_1.getMedia)
    .put((0, authMiddleware_1.restrictTo)('admin'), mediaController_1.updateMedia)
    .delete((0, authMiddleware_1.restrictTo)('admin'), mediaController_1.deleteMedia);
exports.default = router;
//# sourceMappingURL=mediaRoutes.js.map