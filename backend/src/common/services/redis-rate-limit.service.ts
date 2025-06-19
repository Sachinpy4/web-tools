import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class RedisRateLimitService {
  private readonly logger = new Logger(RedisRateLimitService.name);
  private redisClient: RedisClientType | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  // Fallback in-memory cache when Redis is unavailable
  private fallbackCache = new Map<string, { count: number; expires: number }>();

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = {
        socket: {
          host: this.configService.get<string>('redis.host') || 'localhost',
          port: this.configService.get<number>('redis.port') || 6379,
        },
        password: this.configService.get<string>('redis.password'),
        username: this.configService.get<string>('redis.username'),
        database: this.configService.get<number>('redis.db') || 0,
      };

      this.redisClient = createClient(redisConfig);

      this.redisClient.on('error', (error) => {
        this.logger.warn('Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis for rate limiting');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.redisClient.on('ready', () => {
        this.isConnected = true;
      });

      this.redisClient.on('end', () => {
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      this.connectionAttempts++;
      this.logger.warn(`Failed to connect to Redis for rate limiting (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}):`, error.message);
      this.isConnected = false;

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        // Retry connection after a delay
        setTimeout(() => this.initializeRedis(), 5000 * this.connectionAttempts);
      } else {
        this.logger.warn('Max Redis connection attempts reached. Using fallback in-memory cache for rate limiting.');
      }
    }
  }

  /**
   * Check and increment rate limit for a given key
   */
  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const ttlSeconds = Math.ceil(windowMs / 1000);

    if (this.isConnected && this.redisClient) {
      return this.checkRateLimitRedis(key, limit, ttlSeconds);
    } else {
      // Fallback to in-memory cache
      return this.checkRateLimitFallback(key, limit, windowMs);
    }
  }

  private async checkRateLimitRedis(key: string, limit: number, ttlSeconds: number): Promise<RateLimitResult> {
    try {
      const multi = this.redisClient!.multi();
      
      // Use a Lua script for atomic increment and TTL operations
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local ttl = tonumber(ARGV[2])
        
        local current = redis.call('GET', key)
        
        if current == false then
          -- Key doesn't exist, set it to 1 with TTL
          redis.call('SETEX', key, ttl, 1)
          return {1, limit - 1, ttl}
        else
          local count = tonumber(current)
          if count < limit then
            -- Increment the counter
            local newCount = redis.call('INCR', key)
            local remaining = redis.call('TTL', key)
            return {newCount, limit - newCount, remaining}
          else
            -- Rate limit exceeded
            local remaining = redis.call('TTL', key)
            return {count, 0, remaining}
          end
        end
      `;

      const result = await this.redisClient!.eval(luaScript, {
        keys: [key],
        arguments: [limit.toString(), ttlSeconds.toString()],
      }) as number[];

      const [count, remaining, resetTime] = result;
      const allowed = count <= limit;

      return {
        allowed,
        count,
        remaining: Math.max(0, remaining),
        resetTime: Math.max(0, resetTime),
        retryAfter: allowed ? undefined : resetTime,
      };
    } catch (error) {
      this.logger.error('Redis rate limit check failed:', error);
      // Fallback to in-memory cache on Redis error
      return this.checkRateLimitFallback(key, limit, ttlSeconds * 1000);
    }
  }

  private checkRateLimitFallback(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.fallbackCache.get(key);

    if (!entry || now > entry.expires) {
      // Create new entry
      const newEntry = { count: 1, expires: now + windowMs };
      this.fallbackCache.set(key, newEntry);
      
      return {
        allowed: true,
        count: 1,
        remaining: limit - 1,
        resetTime: Math.ceil(windowMs / 1000),
      };
    } else {
      // Update existing entry
      entry.count++;
      const allowed = entry.count <= limit;
      const resetTime = Math.ceil((entry.expires - now) / 1000);

      return {
        allowed,
        count: entry.count,
        remaining: Math.max(0, limit - entry.count),
        resetTime: Math.max(0, resetTime),
        retryAfter: allowed ? undefined : resetTime,
      };
    }
  }

  /**
   * Clean up expired entries from fallback cache
   */
  private cleanupFallbackCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now > entry.expires) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * Get current usage for a key without incrementing
   */
  async getCurrentUsage(key: string): Promise<{ count: number; resetTime: number } | null> {
    if (this.isConnected && this.redisClient) {
      try {
        const [count, ttl] = await Promise.all([
          this.redisClient.get(key),
          this.redisClient.ttl(key),
        ]);

        if (count === null) {
          return null;
        }

        return {
          count: parseInt(count, 10),
          resetTime: Math.max(0, ttl),
        };
      } catch (error) {
        this.logger.error('Failed to get current usage from Redis:', error);
      }
    }

    // Fallback to in-memory cache
    const entry = this.fallbackCache.get(key);
    if (!entry || Date.now() > entry.expires) {
      return null;
    }

    return {
      count: entry.count,
      resetTime: Math.ceil((entry.expires - Date.now()) / 1000),
    };
  }

  /**
   * Reset rate limit for a specific key (useful for testing or admin overrides)
   */
  async resetRateLimit(key: string): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (error) {
        this.logger.error('Failed to reset rate limit in Redis:', error);
      }
    }

    // Fallback to in-memory cache
    this.fallbackCache.delete(key);
  }

  /**
   * Get connection status
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error) {
        this.logger.warn('Error closing Redis connection:', error);
      }
    }

    // Clean up fallback cache
    this.fallbackCache.clear();
  }
} 