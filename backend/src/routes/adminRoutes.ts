import express from 'express';
import * as adminController from '../controllers/adminController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (no auth required for read-only settings)
router.get('/settings/rate-limits', adminController.getRateLimitSettings);
router.get('/settings/file-upload', adminController.getFileUploadSettings);

// Apply authentication to all other routes
router.use(protect);

// Restrict to admin role
router.use(restrictTo('admin'));

// Cleanup routes
router.post('/cleanup-images', adminController.cleanupImages);
router.post('/cleanup-system', adminController.cleanupSystem);
router.post('/setup-scheduler', adminController.setupScheduler);
router.get('/scheduler-status', adminController.getSchedulerStatus);
router.get('/system-status', adminController.getSystemStatus);

// Settings routes (admin only)
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

export default router; 