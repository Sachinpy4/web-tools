"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBatchOperationLimiter = exports.createImageProcessingLimiter = exports.lightApiLimiter = exports.apiLimiter = exports.batchOperationLimiter = exports.imageProcessingLimiter = exports.suspiciousActivityDetection = exports.clearLoginAttempts = exports.trackFailedLogin = exports.bruteForcePrevention = exports.loginSecurityLimiter = void 0;
exports.clearRateLimitCache = clearRateLimitCache;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const settingsService_1 = require("../services/settingsService");
// Cache for rate limit settings
let rateLimitCache = null;
let lastRateLimitUpdate = 0;
const RATE_LIMIT_CACHE_DURATION = 60000; // 1 minute
// Login attempt tracking for enhanced security
const loginAttempts = new Map();
const FAILED_LOGIN_LIMIT = 3; // Max failed attempts
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes block
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes window
/**
 * Enhanced login security middleware with brute force protection
 */
exports.loginSecurityLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Only 3 login attempts per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        status: 'error',
        message: 'Too many login attempts. Please try again in 15 minutes.',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED',
        retryAfter: 900 // 15 minutes in seconds
    },
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
        res.status(429).json({
            status: 'error',
            message: 'Too many login attempts. Please try again in 15 minutes.',
            code: 'LOGIN_RATE_LIMIT_EXCEEDED',
            retryAfter: 900
        });
    }
});
/**
 * Advanced brute force protection middleware
 */
const bruteForcePrevention = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    // Get or create attempt record for this IP
    let attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0, blocked: false };
    // Check if IP is currently blocked
    if (attempts.blocked && attempts.blockUntil && now < attempts.blockUntil) {
        const remainingTime = Math.ceil((attempts.blockUntil - now) / 1000 / 60);
        return res.status(423).json({
            status: 'error',
            message: `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`,
            code: 'ACCOUNT_TEMPORARILY_LOCKED',
            retryAfter: Math.ceil((attempts.blockUntil - now) / 1000)
        });
    }
    // Reset block if time has passed
    if (attempts.blocked && attempts.blockUntil && now >= attempts.blockUntil) {
        attempts = { count: 0, lastAttempt: 0, blocked: false };
        loginAttempts.set(ip, attempts);
    }
    // Reset count if outside attempt window
    if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
        attempts.count = 0;
    }
    // Store the middleware check result for later use
    req.loginSecurity = {
        ip,
        currentAttempts: attempts.count,
        isBlocked: attempts.blocked
    };
    next();
};
exports.bruteForcePrevention = bruteForcePrevention;
/**
 * Track failed login attempts
 */
const trackFailedLogin = (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    let attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0, blocked: false };
    attempts.count += 1;
    attempts.lastAttempt = now;
    // Block IP if too many failed attempts
    if (attempts.count >= FAILED_LOGIN_LIMIT) {
        attempts.blocked = true;
        attempts.blockUntil = now + BLOCK_DURATION;
    }
    loginAttempts.set(ip, attempts);
};
exports.trackFailedLogin = trackFailedLogin;
/**
 * Clear successful login attempts
 */
const clearLoginAttempts = (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    loginAttempts.delete(ip);
};
exports.clearLoginAttempts = clearLoginAttempts;
/**
 * Suspicious activity detection middleware
 */
const suspiciousActivityDetection = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const { email } = req.body;
    // Check for suspicious patterns
    const suspiciousPatterns = [
        /bot|crawler|spider|scraper/i,
        /curl|wget|python|postman/i,
        /automated|script|tool/i
    ];
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    if (isSuspicious) {
        // Add extra delay for suspicious requests
        setTimeout(() => {
            res.status(429).json({
                status: 'error',
                message: 'Request blocked due to suspicious activity.',
                code: 'SUSPICIOUS_ACTIVITY_DETECTED'
            });
        }, 3000); // 3 second delay
        return;
    }
    next();
};
exports.suspiciousActivityDetection = suspiciousActivityDetection;
/**
 * Get rate limit configuration with caching
 */
async function getRateLimitConfig() {
    const now = Date.now();
    // Return cached config if still valid
    if (rateLimitCache && (now - lastRateLimitUpdate) < RATE_LIMIT_CACHE_DURATION) {
        return rateLimitCache;
    }
    try {
        const settings = await (0, settingsService_1.getRateLimitSettings)();
        rateLimitCache = {
            imageProcessing: {
                windowMs: settings.imageProcessing.windowMs,
                max: settings.imageProcessing.max,
                message: {
                    status: 'error',
                    message: `Too many image processing requests. Limit: ${settings.imageProcessing.max} requests per ${settings.imageProcessing.windowMs / 60000} minutes.`,
                    retryAfter: Math.ceil(settings.imageProcessing.windowMs / 1000),
                }
            },
            batchOperation: {
                windowMs: settings.batchOperation.windowMs,
                max: settings.batchOperation.max,
                message: {
                    status: 'error',
                    message: `Too many batch operations. Limit: ${settings.batchOperation.max} operations per ${settings.batchOperation.windowMs / 60000} minutes.`,
                    retryAfter: Math.ceil(settings.batchOperation.windowMs / 1000),
                }
            }
        };
        lastRateLimitUpdate = now;
        return rateLimitCache;
    }
    catch (error) {
        // Fallback configuration
        return {
            imageProcessing: {
                windowMs: 300000, // 5 minutes
                max: 50,
                message: {
                    status: 'error',
                    message: 'Too many image processing requests. Limit: 50 requests per 5 minutes.',
                    retryAfter: 300,
                }
            },
            batchOperation: {
                windowMs: 600000, // 10 minutes
                max: 15,
                message: {
                    status: 'error',
                    message: 'Too many batch operations. Limit: 15 operations per 10 minutes.',
                    retryAfter: 600,
                }
            }
        };
    }
}
// Store for dynamic rate limiters
const rateLimiters = new Map();
/**
 * Get or create a rate limiter for specific configuration
 */
function getOrCreateRateLimiter(key, config) {
    const configKey = `${key}-${config.windowMs}-${config.max}`;
    if (!rateLimiters.has(configKey)) {
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: config.windowMs,
            max: config.max,
            message: config.message,
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => {
                return process.env.NODE_ENV === 'development' && process.env.ENABLE_RATE_LIMITING !== 'true';
            },
            keyGenerator: (req) => {
                return req.ip || req.connection.remoteAddress || 'unknown';
            },
            handler: (req, res) => {
                res.status(429).json(config.message);
            }
        });
        rateLimiters.set(configKey, limiter);
        // Clean up old limiters (keep only last 10)
        if (rateLimiters.size > 10) {
            const firstKey = rateLimiters.keys().next().value;
            rateLimiters.delete(firstKey);
        }
    }
    return rateLimiters.get(configKey);
}
/**
 * Dynamic image processing rate limiter middleware
 */
const imageProcessingLimiter = async (req, res, next) => {
    try {
        const config = await getRateLimitConfig();
        const limiter = getOrCreateRateLimiter('imageProcessing', config.imageProcessing);
        limiter(req, res, next);
    }
    catch (error) {
        next(); // Continue without rate limiting on error
    }
};
exports.imageProcessingLimiter = imageProcessingLimiter;
/**
 * Dynamic batch operation rate limiter middleware
 */
const batchOperationLimiter = async (req, res, next) => {
    try {
        const config = await getRateLimitConfig();
        const limiter = getOrCreateRateLimiter('batchOperation', config.batchOperation);
        limiter(req, res, next);
    }
    catch (error) {
        next(); // Continue without rate limiting on error
    }
};
exports.batchOperationLimiter = batchOperationLimiter;
/**
 * Clear rate limit cache (call when settings are updated)
 */
function clearRateLimitCache() {
    rateLimitCache = null;
    lastRateLimitUpdate = 0;
    rateLimiters.clear(); // Clear all cached limiters to force recreation
}
/**
 * General API rate limiter - static for overall API protection
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests, please try again later.',
    }
});
/**
 * Light API rate limiter for non-processing endpoints
 */
exports.lightApiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests, please slow down.',
    }
});
// For backwards compatibility
const createImageProcessingLimiter = () => exports.imageProcessingLimiter;
exports.createImageProcessingLimiter = createImageProcessingLimiter;
const createBatchOperationLimiter = () => exports.batchOperationLimiter;
exports.createBatchOperationLimiter = createBatchOperationLimiter;
//# sourceMappingURL=rateLimiter.js.map