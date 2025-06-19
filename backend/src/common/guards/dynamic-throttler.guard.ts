import { Injectable, ExecutionContext, CanActivate, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisRateLimitService } from '../services/redis-rate-limit.service';
import { SettingsCacheService } from '../services/settings-cache.service';

@Injectable()
export class DynamicThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(DynamicThrottlerGuard.name);

  constructor(
    private readonly redisRateLimitService: RedisRateLimitService,
    private readonly settingsCacheService: SettingsCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const route = request.route?.path || request.url;
    
    try {
      // Get dynamic settings from cache
      const settings = await this.settingsCacheService.getSettings();
      
      // Determine which rate limit to apply based on the route
      let limit: number;
      let windowMs: number;
      let rateLimitType: string;
      
      if (route.includes('/images/batch')) {
        // Batch operations have stricter limits
        limit = settings.batchOperationMaxRequests || 15;
        windowMs = settings.batchOperationWindowMs || 600000;
        rateLimitType = 'batch';
      } else if (route.includes('/images/')) {
        // Regular image processing
        limit = settings.imageProcessingMaxRequests || 50;
        windowMs = settings.imageProcessingWindowMs || 300000;
        rateLimitType = 'image';
      } else {
        // General API limits
        limit = settings.apiMaxRequests || 1000;
        windowMs = settings.apiWindowMs || 900000;
        rateLimitType = 'api';
      }

      // Get client identifier (IP address with additional context)
      const clientId = this.getClientId(request);
      
      // Create a unique key for this client and route type
      const key = `throttle:${rateLimitType}:${clientId}`;
      
      // Check rate limit using Redis service
      const rateLimitResult = await this.redisRateLimitService.checkRateLimit(key, limit, windowMs);
      
      // Add rate limit headers to response
      this.addRateLimitHeaders(response, rateLimitResult, limit);
      
      if (!rateLimitResult.allowed) {
        this.logger.warn(`Rate limit exceeded for ${clientId} on ${route}. Current: ${rateLimitResult.count}/${limit}`);
        
        // Add retry-after header
        if (rateLimitResult.retryAfter) {
          response.setHeader('Retry-After', rateLimitResult.retryAfter);
        }
        
        throw new HttpException({
          message: 'Rate limit exceeded',
          error: 'Too Many Requests',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          retryAfter: rateLimitResult.retryAfter,
        }, HttpStatus.TOO_MANY_REQUESTS);
      }
      
      // Log successful rate limit check for debugging
      if (rateLimitResult.count % 10 === 0) { // Log every 10th request to avoid spam
        this.logger.debug(`Rate limit check passed for ${clientId}: ${rateLimitResult.count}/${limit} requests used`);
      }
      
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Log unexpected errors but allow the request through to avoid blocking all traffic
      this.logger.error('Rate limiting error:', error);
      return true;
    }
  }

  private getClientId(request: any): string {
    // Enhanced client identification with fallbacks
    const forwarded = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const clientIp = forwarded?.split(',')[0] || realIp || request.ip || request.connection.remoteAddress;
    
    // Add user agent hash for additional uniqueness (optional)
    const userAgent = request.headers['user-agent'];
    const userAgentHash = userAgent ? Buffer.from(userAgent).toString('base64').slice(0, 8) : 'no-ua';
    
    return `${clientIp || 'unknown'}-${userAgentHash}`;
  }

  private addRateLimitHeaders(response: any, rateLimitResult: any, limit: number): void {
    try {
      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitResult.remaining));
      response.setHeader('X-RateLimit-Reset', new Date(Date.now() + (rateLimitResult.resetTime * 1000)).toISOString());
      response.setHeader('X-RateLimit-Used', rateLimitResult.count);
      
      // Add connection status for debugging
      if (this.redisRateLimitService.isRedisConnected()) {
        response.setHeader('X-RateLimit-Backend', 'redis');
      } else {
        response.setHeader('X-RateLimit-Backend', 'memory');
      }
    } catch (error) {
      this.logger.warn('Failed to set rate limit headers:', error);
    }
  }
} 