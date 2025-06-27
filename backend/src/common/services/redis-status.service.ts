import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { createClient } from 'redis';

@Injectable()
export class RedisStatusService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStatusService.name);
  
  // Redis availability flag - will be set to false if Redis connection fails
  private _isRedisAvailable = false;
  
  // Flag to prevent excessive error logging
  private redisConnectionErrorLogged = false;
  
  // Flag to track last known Redis status (for detecting changes)
  private lastKnownRedisStatus = false;
  
  // Add stability counters to prevent rapid oscillation
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private readonly STABILITY_THRESHOLD = 3; // Same as original
  
  // Health check interval
  private healthCheckInterval: NodeJS.Timeout;
  private readonly REDIS_CHECK_INTERVAL = 3000; // Check every 3 seconds (optimized for faster detection)

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async onModuleInit() {
    this.logger.log('🔍 Initializing Redis Status Service...');
    
    // Test initial connection
    await this.testRedisConnection();
    
    // Start periodic health checks
    this.startPeriodicHealthChecks();
    
    this.logger.log(`✅ Redis Status Service initialized - Redis: ${this._isRedisAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  // Getter for Redis availability
  get isRedisAvailable(): boolean {
    return this._isRedisAvailable;
  }

  // Add debug logging
  private logDebug(message: string): void {
    this.logger.debug(`[Redis Debug] ${message}`);
  }

  // Function to test Redis connection (fixed to prevent double event handling)
  async testRedisConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false; // Prevent multiple resolutions
      
      try {
        const redisHost = this.configService.get<string>('redis.host') || 'localhost';
        const redisPort = this.configService.get<number>('redis.port') || 6379;
        const redisPassword = this.configService.get<string>('redis.password');
        const redisUsername = this.configService.get<string>('redis.username');
        const redisDb = this.configService.get<number>('redis.db') || 0;
        
        this.logDebug(`Attempting to connect to Redis at ${redisHost}:${redisPort}`);
        
        // Create connection URL with authentication if provided
        const redisUrl = redisPassword
          ? `redis://${redisUsername ? redisUsername + ':' : ''}${redisPassword}@${redisHost}:${redisPort}/${redisDb}`
          : `redis://${redisHost}:${redisPort}/${redisDb}`;
        
        // Create Redis client with better error handling
        const testClient = createClient({ 
          url: redisUrl,
          socket: {
            connectTimeout: 3000,
          },
        });
        
        // Helper function to clean up and resolve once
        const cleanupAndResolve = (success: boolean, logMessage?: string) => {
          if (resolved) return; // Prevent double execution
          resolved = true;
          
          clearTimeout(timeout);
          testClient.quit().catch(() => {});
          
          if (logMessage && !this.redisConnectionErrorLogged) {
            this.logger.warn(logMessage);
            this.redisConnectionErrorLogged = true;
          }
          
          if (success) {
            this.logger.log('Redis connection test succeeded');
            this.redisConnectionErrorLogged = false;
            this.handleSuccess();
          } else {
            this.handleFailure();
          }
          
          resolve(success);
        };
        
        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
          cleanupAndResolve(false, 'Redis connection test timed out after 3 seconds');
        }, 3000);
        
        // Set up event handlers with better error handling
        testClient.on('error', (err) => {
          cleanupAndResolve(false, `Redis connection test failed: ${err.message}`);
        });
        
        testClient.on('ready', () => {
          cleanupAndResolve(true);
        });

        // Handle unexpected disconnections during testing
        // Only treat as failure if we haven't already resolved successfully
        testClient.on('end', () => {
          if (!resolved) {
            cleanupAndResolve(false, 'Redis connection closed unexpectedly during test');
          }
        });
        
        testClient.connect().catch(err => {
          cleanupAndResolve(false, `Redis connection test failed during connect: ${err.message}`);
        });
      } catch (error) {
        if (!resolved) {
          resolved = true;
          if (!this.redisConnectionErrorLogged) {
            this.logger.warn('Redis connection test failed (exception):', error);
            this.redisConnectionErrorLogged = true;
          }
          this.handleFailure();
          resolve(false);
        }
      }
    });
  }

  // Function to handle success with stability counter (same as original)
  private handleSuccess(): void {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    
    this.logDebug(`Success counter: ${this.consecutiveSuccesses}/${this.STABILITY_THRESHOLD}, Failure counter: ${this.consecutiveFailures}/${this.STABILITY_THRESHOLD}`);
    
    // Only update status after multiple consecutive successes
    if (this.consecutiveSuccesses >= this.STABILITY_THRESHOLD && !this._isRedisAvailable) {
      this.updateRedisStatus(true);
    }
  }

  // Function to handle failure with stability counter (same as original)
  private handleFailure(): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    
    this.logDebug(`Success counter: ${this.consecutiveSuccesses}/${this.STABILITY_THRESHOLD}, Failure counter: ${this.consecutiveFailures}/${this.STABILITY_THRESHOLD}`);
    
    // Only update status after multiple consecutive failures
    if (this.consecutiveFailures >= this.STABILITY_THRESHOLD && this._isRedisAvailable) {
      this.updateRedisStatus(false);
    }
  }

  // Function to update Redis status and emit events when it changes (same as original)
  private updateRedisStatus(status: boolean): void {
    this._isRedisAvailable = status;
    
    // Emit an event if the status changed
    if (status !== this.lastKnownRedisStatus) {
      this.logger.log(`🔄 Redis status changed: ${status ? 'AVAILABLE' : 'UNAVAILABLE'}`);
      this.lastKnownRedisStatus = status;
      this.emit('statusChanged', status);
    }
  }

  // Start periodic Redis connectivity checks (same as original)
  private startPeriodicHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.testRedisConnection();
      } catch (error) {
        this.handleFailure();
      }
    }, this.REDIS_CHECK_INTERVAL);
    
    this.logger.log(`🔍 Started Redis health checks every ${this.REDIS_CHECK_INTERVAL / 1000} seconds`);
  }

  // Get Redis configuration for Bull queues (same as original)
  getRedisConfig() {
    const redisHost = this.configService.get<string>('redis.host') || 'localhost';
    const redisPort = this.configService.get<number>('redis.port') || 6379;
    const redisPassword = this.configService.get<string>('redis.password');
    const redisUsername = this.configService.get<string>('redis.username');
    const redisDb = this.configService.get<number>('redis.db') || 0;

    return {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      username: redisUsername,
      db: redisDb,
      maxRetriesPerRequest: null, // BullMQ requires this to be null
      retryStrategy: (times: number) => {
        if (times >= 2) {
          if (!this.redisConnectionErrorLogged) {
            this.logger.warn('Redis connection failed after 2 attempts. Operating in local-only mode.');
            this.redisConnectionErrorLogged = true;
          }
          this.handleFailure();
          return null;
        }
        return 500;
      },
      connectTimeout: 3000,
      enableAutoPipelining: false,
      disableOfflineQueue: true,
    };
  }

  // Get Bull queue configuration (same as original)
  getBullConfig() {
    const redisConfig = this.getRedisConfig();
    
    return {
      redis: redisConfig.password 
        ? { 
            url: `redis://${redisConfig.username ? redisConfig.username + ':' : ''}${redisConfig.password}@${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`
          } 
        : redisConfig,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
        timeout: 5 * 60 * 1000, // 5 minutes timeout
      },
    };
  }
} 