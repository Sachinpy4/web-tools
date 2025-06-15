"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const backupController_1 = require("../controllers/backupController");
const router = express_1.default.Router();
// Configure multer for backup file uploads
const uploadDir = path_1.default.join(__dirname, '../../temp');
// Ensure temp directory exists
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `backup-upload-${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    // Accept .json and .zip files
    const allowedTypes = ['.json', '.zip'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only .json and .zip backup files are allowed'));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});
// Apply authentication middleware to all routes
router.use(authMiddleware_1.protect);
router.use(authMiddleware_1.adminOnly);
// Backup Management Routes
router.post('/create', backupController_1.createBackup);
router.get('/history', backupController_1.getBackupHistory);
router.get('/restore-history', backupController_1.getRestoreHistory);
router.get('/status', backupController_1.getBackupStatus);
router.get('/:id', backupController_1.getBackupById);
router.get('/:id/download', backupController_1.downloadBackup);
router.delete('/:id', backupController_1.deleteBackup);
// Restore Routes
router.post('/restore', backupController_1.restoreFromBackup);
router.post('/restore/upload', upload.single('backup'), backupController_1.uploadAndRestore);
router.get('/restore/preview', backupController_1.getRestorePreview);
// Maintenance Routes
router.post('/cleanup', backupController_1.cleanupOldBackups);
exports.default = router;
//# sourceMappingURL=backupRoutes.js.map