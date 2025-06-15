import express from 'express';
import {
  getAllScripts,
  getScriptsForPage,
  createScript,
  updateScript,
  deleteScript,
  toggleScriptStatus
} from '../controllers/scriptsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public route - Get scripts for a specific page
router.get('/public', getScriptsForPage);

// Admin routes (require authentication)
router.get('/', protect, getAllScripts);
router.post('/', protect, createScript);
router.put('/:id', protect, updateScript);
router.delete('/:id', protect, deleteScript);
router.patch('/:id/toggle', protect, toggleScriptStatus);

export default router; 