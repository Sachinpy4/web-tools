"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.extractTokenFromHeader = extractTokenFromHeader;
// @ts-ignore
const jwt = require('jsonwebtoken');
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt-should-be-long-and-secure';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '4h'; // Reduced from 7d to 4h for better security
/**
 * Generate a JWT token for a user
 * @param payload User information to include in the token
 * @returns JWT token string
 */
function generateToken(payload) {
    // @ts-ignore - Ignoring type errors for JWT sign
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}
/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns Decoded token payload if valid, null if invalid
 */
function verifyToken(token) {
    try {
        // @ts-ignore - Ignoring type errors for JWT verify
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
}
/**
 * Extract token from authorization header
 * @param authHeader Authorization header from request
 * @returns Token string if found, null otherwise
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
}
//# sourceMappingURL=jwt.js.map