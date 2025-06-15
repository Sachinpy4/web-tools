"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = exports.restrictTo = exports.protect = void 0;
const jwt_1 = require("../utils/jwt");
/**
 * Middleware to protect routes - verifies JWT token
 */
const protect = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = (0, jwt_1.extractTokenFromHeader)(authHeader);
        if (!token) {
            console.log('Auth middleware: No token provided in request headers');
            return res.status(401).json({
                status: 'error',
                message: 'Not authorized, no token provided'
            });
        }
        // Verify token
        const decoded = (0, jwt_1.verifyToken)(token);
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
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            status: 'error',
            message: 'Not authorized, token failed'
        });
    }
};
exports.protect = protect;
/**
 * Middleware to restrict routes to specific roles
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
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
exports.restrictTo = restrictTo;
/**
 * Middleware to restrict routes to admin users only
 */
exports.adminOnly = (0, exports.restrictTo)('admin');
//# sourceMappingURL=authMiddleware.js.map