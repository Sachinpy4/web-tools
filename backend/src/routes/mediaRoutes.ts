import express from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middleware/authMiddleware';
import {
  uploadMedia,
  getMediaItems,
  getMedia,
  updateMedia,
  deleteMedia,
  getMediaFile
} from '../controllers/mediaController';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
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
    } else {
      cb(new Error('Invalid file type. Only images and common document formats are allowed.') as any, false);
    }
  }
});

// Public routes for serving files
router.get('/file/:filename', getMediaFile);
router.get('/file/blogs/:filename', (req, res, next) => {
  // Modify the request parameters to include the blogs folder in the path
  req.params.filename = `blogs/${req.params.filename}`;
  getMediaFile(req, res, next);
});

// Protected routes
router.use(protect);

// Admin-only routes
router.route('/')
  .get(restrictTo('admin'), getMediaItems)
  .post(
    restrictTo('admin'), 
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
    },
    upload.array('file', 10), // Allow up to 10 files at once
    uploadMedia
  );

router.route('/:id')
  .get(restrictTo('admin'), getMedia)
  .put(restrictTo('admin'), updateMedia)
  .delete(restrictTo('admin'), deleteMedia);

export default router; 