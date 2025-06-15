// @ts-ignore
const jwt = require('jsonwebtoken');
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt-should-be-long-and-secure';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '4h'; // Reduced from 7d to 4h for better security

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT token for a user
 * @param payload User information to include in the token
 * @returns JWT token string
 */
export function generateToken(payload: TokenPayload): string {
  // @ts-ignore - Ignoring type errors for JWT sign
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns Decoded token payload if valid, null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    // @ts-ignore - Ignoring type errors for JWT verify
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from authorization header
 * @param authHeader Authorization header from request
 * @returns Token string if found, null otherwise
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
} 