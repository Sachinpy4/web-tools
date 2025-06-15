import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
  createBackup,
  getBackupHistory,
  getRestoreHistory,
  getBackupById,
  downloadBackup,
  deleteBackup,
  restoreFromBackup,
  uploadAndRestore,
  getRestorePreview,
  cleanupOldBackups,
  getBackupStatus
} from '../controllers/backupController';

const router = express.Router();

// Configure multer for backup file uploads
const uploadDir = path.join(__dirname, '../../temp');

// Ensure temp directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `backup-upload-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept .json and .zip files
  const allowedTypes = ['.json', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .json and .zip backup files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Apply authentication middleware to all routes
router.use(protect);
router.use(adminOnly);

// Backup Management Routes
router.post('/create', createBackup);
router.get('/history', getBackupHistory);
router.get('/restore-history', getRestoreHistory);
router.get('/status', getBackupStatus);
router.get('/:id', getBackupById);
router.get('/:id/download', downloadBackup);
router.delete('/:id', deleteBackup);

// Restore Routes
router.post('/restore', restoreFromBackup);
router.post('/restore/upload', upload.single('backup'), uploadAndRestore);
router.get('/restore/preview', getRestorePreview);

// Maintenance Routes
router.post('/cleanup', cleanupOldBackups);

export default router; 