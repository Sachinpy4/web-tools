import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import { generateToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { trackFailedLogin, clearLoginAttempts } from '../middleware/rateLimiter';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  
  if (userExists) {
    return res.status(400).json({
      status: 'error',
      message: 'User already exists'
    });
  }
  
  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    // By default, role will be 'user', but you can change
    // this if needed or add admin creation logic
  }) as IUser;
  
  if (user) {
    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } else {
    res.status(400).json({
      status: 'error',
      message: 'Invalid user data'
    });
  }
});

/**
 * @desc    Login a user with enhanced security
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Validate email & password are provided
  if (!email || !password) {
    trackFailedLogin(req);
    return res.status(400).json({
      status: 'error',
      message: 'Please provide email and password',
      code: 'MISSING_CREDENTIALS'
    });
  }
  
  // Additional validation for email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    trackFailedLogin(req);
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a valid email address',
      code: 'INVALID_EMAIL_FORMAT'
    });
  }
  
  // Find user in database
  const user = await User.findOne({ email }).select('+password') as IUser;
  
  if (!user) {
    // Track failed attempt even for non-existent users
    trackFailedLogin(req);
    
    // Generic message to prevent user enumeration
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials',
      code: 'AUTHENTICATION_FAILED'
    });
  }
  
  // Check if password matches
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    // Track failed login attempt
    trackFailedLogin(req);
    
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials',
      code: 'AUTHENTICATION_FAILED'
    });
  }
  
  // Successful login - clear any failed attempts
  clearLoginAttempts(req);
  
  // Generate token
  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    }
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // User should be attached to request by auth middleware
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, please login'
    });
  }
  
  const user = await User.findById(req.user.id) as IUser;
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * @desc    Get all users
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const users = await User.find().select('-password');
  
  res.status(200).json({
    status: 'success',
    count: users.length,
    data: users
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/auth/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { name, email, role } = req.body;
  
  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID'
    });
  }
  
  // Find the user
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }
  
  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  
  // Save the changes
  const updatedUser = await user.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    }
  });
});

/**
 * @desc    Update user password
 * @route   PUT /api/auth/users/:id/password
 * @access  Private/Admin
 */
export const updatePassword = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a password'
    });
  }
  
  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID'
    });
  }
  
  // Find the user
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }
  
  // Update password
  user.password = password;
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully'
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/auth/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID'
    });
  }
  
  // Find and delete the user
  const user = await User.findByIdAndDelete(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully'
  });
}); 