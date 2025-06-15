import { Request, Response, NextFunction } from 'express';

/**
 * Cache Control Middleware
 * 
 * Prevents browser caching issues by setting appropriate cache headers
 * for different types of content.
 */

/**
 * Disable caching for API responses
 * Use this for dynamic content that changes frequently
 */
export const noCacheAPI = (req: Request, res: Response, next: NextFunction) => {
  // Prevent all caching for API responses
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expires': '0',
    'Pragma': 'no-cache',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}-${Math.random()}"` // Always unique ETag
  });
  
  next();
};

/**
 * Short-term caching for semi-static content
 * Use this for content that doesn't change often (like blog posts)
 */
export const shortCacheAPI = (req: Request, res: Response, next: NextFunction) => {
  // Cache for 5 minutes, but allow revalidation
  res.set({
    'Cache-Control': 'public, max-age=300, must-revalidate', // 5 minutes
    'Vary': 'Accept-Encoding, Authorization'
  });
  
  next();
};

/**
 * Medium-term caching for static-ish content
 * Use this for user profiles, settings, etc.
 */
export const mediumCacheAPI = (req: Request, res: Response, next: NextFunction) => {
  // Cache for 1 hour, but allow revalidation
  res.set({
    'Cache-Control': 'public, max-age=3600, must-revalidate', // 1 hour
    'Vary': 'Accept-Encoding, Authorization'
  });
  
  next();
};

/**
 * Version-aware caching
 * Use this for API responses that should update when app version changes
 */
export const versionedCacheAPI = (req: Request, res: Response, next: NextFunction) => {
  const appVersion = process.env.APP_VERSION || Date.now().toString();
  
  res.set({
    'Cache-Control': 'public, max-age=1800', // 30 minutes
    'ETag': `"v${appVersion}-${req.url}"`,
    'Vary': 'Accept-Encoding, Authorization'
  });
  
  next();
};

/**
 * Health check specific caching
 * Short cache to reduce load but ensure freshness
 */
export const healthCacheAPI = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Cache-Control': 'public, max-age=30', // 30 seconds
    'Vary': 'Accept-Encoding'
  });
  
  next();
};

/**
 * Add deployment version headers
 * This helps with cache invalidation when you deploy new code
 */
export const addVersionHeaders = (req: Request, res: Response, next: NextFunction) => {
  const deploymentTime = process.env.DEPLOYMENT_TIME || Date.now().toString();
  const appVersion = process.env.APP_VERSION || '1.0.0';
  
  res.set({
    'X-App-Version': appVersion,
    'X-Deployment-Time': deploymentTime,
    'X-Cache-Buster': `${appVersion}-${deploymentTime}`
  });
  
  next();
}; 