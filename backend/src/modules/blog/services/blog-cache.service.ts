import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisStatusService } from '../../../common/services/redis-status.service';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class BlogCacheService {
  private readonly logger = new Logger(BlogCacheService.name);
  private redisClient: RedisClientType | null = null;
  private isConnected = false;

  // Cache TTL settings (in seconds)
  private readonly CACHE_TTL = {
    SINGLE_BLOG: 3600,      // 1 hour for individual blog posts
    BLOG_LIST: 900,         // 15 minutes for blog lists
    POPULAR_BLOGS: 1800,    // 30 minutes for popular blogs
    RECENT_BLOGS: 1800,     // 30 minutes for recent blogs
    CATEGORIES: 3600,       // 1 hour for categories
    TAGS: 3600,             // 1 hour for tags
    SEARCH_RESULTS: 1800,   // 30 minutes for search results
  };

  // Cache key prefixes
  private readonly CACHE_KEYS = {
    BLOG_BY_ID: 'blog:id:',
    BLOG_BY_SLUG: 'blog:slug:',
    BLOG_LIST: 'blog:list:',
    POPULAR_BLOGS: 'blog:popular:',
    RECENT_BLOGS: 'blog:recent:',
    CATEGORIES: 'blog:categories',
    TAGS: 'blog:tags',
    SEARCH: 'blog:search:',
    LIKE_STATUS: 'blog:likes:',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly redisStatusService: RedisStatusService,
  ) {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    // Only initialize if Redis is available
    if (!this.redisStatusService.isRedisAvailable) {
      return;
    }

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
        this.logger.warn('Blog cache Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Blog cache connected to Redis');
        this.isConnected = true;
      });

      this.redisClient.on('ready', () => {
        this.isConnected = true;
      });

      this.redisClient.on('end', () => {
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.warn('Failed to connect blog cache to Redis:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Check if Redis caching is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.redisClient !== null && this.redisStatusService.isRedisAvailable;
  }

  /**
   * Get cached data
   */
  async get(key: string): Promise<any> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cached = await this.redisClient!.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to get from blog cache:', error.message);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key: string, data: any, ttl: number): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.redisClient!.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.warn('Failed to set blog cache:', error.message);
    }
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      await this.redisClient!.del(key);
    } catch (error) {
      this.logger.warn('Failed to delete from blog cache:', error.message);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const keys = await this.redisClient!.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient!.del(keys);
      }
    } catch (error) {
      this.logger.warn('Failed to delete pattern from blog cache:', error.message);
    }
  }

  // Blog-specific cache methods

  /**
   * Get cached blog by ID
   */
  async getBlogById(blogId: string): Promise<any> {
    return this.get(`${this.CACHE_KEYS.BLOG_BY_ID}${blogId}`);
  }

  /**
   * Cache blog by ID
   */
  async setBlogById(blogId: string, blogData: any): Promise<void> {
    await this.set(`${this.CACHE_KEYS.BLOG_BY_ID}${blogId}`, blogData, this.CACHE_TTL.SINGLE_BLOG);
  }

  /**
   * Get cached blog by slug
   */
  async getBlogBySlug(slug: string): Promise<any> {
    return this.get(`${this.CACHE_KEYS.BLOG_BY_SLUG}${slug}`);
  }

  /**
   * Cache blog by slug
   */
  async setBlogBySlug(slug: string, blogData: any): Promise<void> {
    await this.set(`${this.CACHE_KEYS.BLOG_BY_SLUG}${slug}`, blogData, this.CACHE_TTL.SINGLE_BLOG);
  }

  /**
   * Get cached blog list
   */
  async getBlogList(queryHash: string): Promise<any> {
    return this.get(`${this.CACHE_KEYS.BLOG_LIST}${queryHash}`);
  }

  /**
   * Cache blog list
   */
  async setBlogList(queryHash: string, listData: any): Promise<void> {
    await this.set(`${this.CACHE_KEYS.BLOG_LIST}${queryHash}`, listData, this.CACHE_TTL.BLOG_LIST);
  }

  /**
   * Get cached popular blogs
   */
  async getPopularBlogs(limit: number): Promise<any> {
    return this.get(`${this.CACHE_KEYS.POPULAR_BLOGS}${limit}`);
  }

  /**
   * Cache popular blogs
   */
  async setPopularBlogs(limit: number, blogsData: any): Promise<void> {
    await this.set(`${this.CACHE_KEYS.POPULAR_BLOGS}${limit}`, blogsData, this.CACHE_TTL.POPULAR_BLOGS);
  }

  /**
   * Get cached recent blogs
   */
  async getRecentBlogs(limit: number): Promise<any> {
    return this.get(`${this.CACHE_KEYS.RECENT_BLOGS}${limit}`);
  }

  /**
   * Cache recent blogs
   */
  async setRecentBlogs(limit: number, blogsData: any): Promise<void> {
    await this.set(`${this.CACHE_KEYS.RECENT_BLOGS}${limit}`, blogsData, this.CACHE_TTL.RECENT_BLOGS);
  }

  /**
   * Get cached categories
   */
  async getCategories(): Promise<any> {
    return this.get(this.CACHE_KEYS.CATEGORIES);
  }

  /**
   * Cache categories
   */
  async setCategories(categoriesData: any): Promise<void> {
    await this.set(this.CACHE_KEYS.CATEGORIES, categoriesData, this.CACHE_TTL.CATEGORIES);
  }

  /**
   * Get cached tags
   */
  async getTags(): Promise<any> {
    return this.get(this.CACHE_KEYS.TAGS);
  }

  /**
   * Cache tags
   */
  async setTags(tagsData: any): Promise<void> {
    await this.set(this.CACHE_KEYS.TAGS, tagsData, this.CACHE_TTL.TAGS);
  }

  /**
   * Get cached search results
   */
  async getSearchResults(searchTerm: string, limit: number): Promise<any> {
    const searchKey = `${this.CACHE_KEYS.SEARCH}${searchTerm}:${limit}`;
    return this.get(searchKey);
  }

  /**
   * Cache search results
   */
  async setSearchResults(searchTerm: string, limit: number, resultsData: any): Promise<void> {
    const searchKey = `${this.CACHE_KEYS.SEARCH}${searchTerm}:${limit}`;
    await this.set(searchKey, resultsData, this.CACHE_TTL.SEARCH_RESULTS);
  }

  /**
   * Get cached like status
   */
  async getLikeStatus(blogId: string, visitorIP: string): Promise<any> {
    return this.get(`${this.CACHE_KEYS.LIKE_STATUS}${blogId}:${visitorIP}`);
  }

  /**
   * Cache like status
   */
  async setLikeStatus(blogId: string, visitorIP: string, likeData: any): Promise<void> {
    await this.set(`${this.CACHE_KEYS.LIKE_STATUS}${blogId}:${visitorIP}`, likeData, this.CACHE_TTL.SINGLE_BLOG);
  }

  /**
   * Invalidate cache for a specific blog (when updated/deleted)
   */
  async invalidateBlog(blogId: string, slug?: string): Promise<void> {
    const promises = [
      // Remove specific blog caches
      this.del(`${this.CACHE_KEYS.BLOG_BY_ID}${blogId}`),
    ];

    if (slug) {
      promises.push(this.del(`${this.CACHE_KEYS.BLOG_BY_SLUG}${slug}`));
    }

    await Promise.all(promises);
  }

  /**
   * Invalidate all blog list caches (when any blog is created/updated/deleted)
   */
  async invalidateListCaches(): Promise<void> {
    const promises = [
      // Remove all blog list caches
      this.delPattern(`${this.CACHE_KEYS.BLOG_LIST}*`),
      this.delPattern(`${this.CACHE_KEYS.POPULAR_BLOGS}*`),
      this.delPattern(`${this.CACHE_KEYS.RECENT_BLOGS}*`),
      this.delPattern(`${this.CACHE_KEYS.SEARCH}*`),
      this.del(this.CACHE_KEYS.CATEGORIES),
      this.del(this.CACHE_KEYS.TAGS),
    ];

    await Promise.all(promises);
  }

  /**
   * Invalidate like-related caches for a blog
   */
  async invalidateLikeCaches(blogId: string): Promise<void> {
    await this.delPattern(`${this.CACHE_KEYS.LIKE_STATUS}${blogId}:*`);
  }

  /**
   * Generate cache key hash for complex queries
   */
  generateQueryHash(query: any): string {
    // Create a consistent hash from query parameters
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((result, key) => {
        result[key] = query[key];
        return result;
      }, {} as any);

    return Buffer.from(JSON.stringify(sortedQuery)).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, but we can log cache stats
    if (this.isAvailable()) {
      try {
        const keys = await this.redisClient!.keys('blog:*');
        this.logger.log(`Blog cache contains ${keys.length} entries`);
      } catch (error) {
        this.logger.warn('Failed to get blog cache stats:', error.message);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.isAvailable()) {
      return {
        available: false,
        connected: false,
        keyCount: 0,
      };
    }

    try {
      const keys = await this.redisClient!.keys('blog:*');
      return {
        available: true,
        connected: this.isConnected,
        keyCount: keys.length,
        keyTypes: {
          blogs: keys.filter(k => k.includes(':id:') || k.includes(':slug:')).length,
          lists: keys.filter(k => k.includes(':list:') || k.includes(':popular:') || k.includes(':recent:')).length,
          metadata: keys.filter(k => k.includes('categories') || k.includes('tags')).length,
          search: keys.filter(k => k.includes(':search:')).length,
          likes: keys.filter(k => k.includes(':likes:')).length,
        },
      };
    } catch (error) {
      this.logger.warn('Failed to get blog cache stats:', error.message);
      return {
        available: false,
        connected: false,
        keyCount: 0,
        error: error.message,
      };
    }
  }
} 