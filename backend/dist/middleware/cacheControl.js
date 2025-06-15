"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addVersionHeaders = exports.healthCacheAPI = exports.versionedCacheAPI = exports.mediumCacheAPI = exports.shortCacheAPI = exports.noCacheAPI = void 0;
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
const noCacheAPI = (req, res, next) => {
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
exports.noCacheAPI = noCacheAPI;
/**
 * Short-term caching for semi-static content
 * Use this for content that doesn't change often (like blog posts)
 */
const shortCacheAPI = (req, res, next) => {
    // Cache for 5 minutes, but allow revalidation
    res.set({
        'Cache-Control': 'public, max-age=300, must-revalidate', // 5 minutes
        'Vary': 'Accept-Encoding, Authorization'
    });
    next();
};
exports.shortCacheAPI = shortCacheAPI;
/**
 * Medium-term caching for static-ish content
 * Use this for user profiles, settings, etc.
 */
const mediumCacheAPI = (req, res, next) => {
    // Cache for 1 hour, but allow revalidation
    res.set({
        'Cache-Control': 'public, max-age=3600, must-revalidate', // 1 hour
        'Vary': 'Accept-Encoding, Authorization'
    });
    next();
};
exports.mediumCacheAPI = mediumCacheAPI;
/**
 * Version-aware caching
 * Use this for API responses that should update when app version changes
 */
const versionedCacheAPI = (req, res, next) => {
    const appVersion = process.env.APP_VERSION || Date.now().toString();
    res.set({
        'Cache-Control': 'public, max-age=1800', // 30 minutes
        'ETag': `"v${appVersion}-${req.url}"`,
        'Vary': 'Accept-Encoding, Authorization'
    });
    next();
};
exports.versionedCacheAPI = versionedCacheAPI;
/**
 * Health check specific caching
 * Short cache to reduce load but ensure freshness
 */
const healthCacheAPI = (req, res, next) => {
    res.set({
        'Cache-Control': 'public, max-age=30', // 30 seconds
        'Vary': 'Accept-Encoding'
    });
    next();
};
exports.healthCacheAPI = healthCacheAPI;
/**
 * Add deployment version headers
 * This helps with cache invalidation when you deploy new code
 */
const addVersionHeaders = (req, res, next) => {
    const deploymentTime = process.env.DEPLOYMENT_TIME || Date.now().toString();
    const appVersion = process.env.APP_VERSION || '1.0.0';
    res.set({
        'X-App-Version': appVersion,
        'X-Deployment-Time': deploymentTime,
        'X-Cache-Buster': `${appVersion}-${deploymentTime}`
    });
    next();
};
exports.addVersionHeaders = addVersionHeaders;
//# sourceMappingURL=cacheControl.js.map