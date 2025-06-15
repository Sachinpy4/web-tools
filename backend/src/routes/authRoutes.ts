import { Router } from 'express';
import { register, login, getMe, getAllUsers, updateUser, updatePassword, deleteUser } from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import { loginSecurityLimiter, bruteForcePrevention, suspiciousActivityDetection } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 */
router.post('/register', register);

/**
 * @route POST /api/auth/login
 * @desc Login a user with enhanced security
 */
router.post('/login', 
  loginSecurityLimiter,           // Rate limiting (10 attempts per 15 min)
  bruteForcePrevention,           // IP-based brute force protection
  suspiciousActivityDetection,    // Detect suspicious user agents
  login                          // Actual login logic
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
router.get('/me', protect, getMe);

/**
 * @route GET /api/auth/users
 * @desc Get all users (Admin only)
 */
router.get('/users', protect, adminOnly, getAllUsers);

/**
 * @route PUT /api/auth/users/:id
 * @desc Update user (Admin only)
 */
router.put('/users/:id', protect, adminOnly, updateUser);

/**
 * @route PUT /api/auth/users/:id/password
 * @desc Update user password (Admin only)
 */
router.put('/users/:id/password', protect, adminOnly, updatePassword);

/**
 * @route DELETE /api/auth/users/:id
 * @desc Delete user (Admin only)
 */
router.delete('/users/:id', protect, adminOnly, deleteUser);

export default router; 