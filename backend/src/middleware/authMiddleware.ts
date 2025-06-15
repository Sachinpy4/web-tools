import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

// Extend the Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to protect routes - verifies JWT token
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      console.log('Auth middleware: No token provided in request headers');
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, no token provided'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log('Auth middleware: Token verification failed');
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, token failed verification'
      });
    }
    
    // Add user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    console.log(`Auth middleware: User authenticated as ${decoded.email} with role ${decoded.role}`);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Not authorized, token failed'
    });
  }
};

/**
 * Middleware to restrict routes to specific roles
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log('Role middleware: No user in request');
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, please login'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`Role middleware: User role ${req.user.role} not in allowed roles: ${roles.join(', ')}`);
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    
    console.log(`Role middleware: User with role ${req.user.role} authorized for action`);
    next();
  };
};

/**
 * Middleware to restrict routes to admin users only
 */
export const adminOnly = restrictTo('admin'); 