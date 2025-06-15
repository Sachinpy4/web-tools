import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  getBlogBySlug,
  getBlogAnalytics,
  toggleLikeBlog,
  checkLikeStatus
} from '../controllers/blogController';
import {
  getBlogComments, 
  addComment
} from '../controllers/commentController';

const router = express.Router();

// Blog post routes
router.route('/')
  .get(getBlogs)
  .post(protect, adminOnly, createBlog);

router.get('/by-slug/:slug', getBlogBySlug);

// Add the analytics route
router.get('/:id/analytics', protect, adminOnly, getBlogAnalytics);

router.route('/:id')
  .get(getBlog)
  .put(protect, adminOnly, updateBlog)
  .delete(protect, adminOnly, deleteBlog);

// Comment routes for blogs
router.route('/:blogId/comments')
  .get(getBlogComments)
  .post(addComment);

// Like a blog post
router.route('/:id/like')
  .get(checkLikeStatus)
  .post(toggleLikeBlog);

export default router; 