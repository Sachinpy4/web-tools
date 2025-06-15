import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
  getComments,
  approveComment,
  deleteComment,
  approveBatchComments,
  deleteBatchComments
} from '../controllers/commentController';

const router = express.Router();

// Admin routes for comment management
router.route('/')
  .get(protect, adminOnly, getComments);

// Batch operations
router.patch('/approve-batch', protect, adminOnly, approveBatchComments);
router.delete('/delete-batch', protect, adminOnly, deleteBatchComments);

// Individual comment operations
router.patch('/:id/approve', protect, adminOnly, approveComment);
router.delete('/:id', protect, deleteComment); // Allow users to delete their own comments

export default router; 