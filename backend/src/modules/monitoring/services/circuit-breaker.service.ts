import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

interface CircuitBreakerState {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  failureThreshold: number;
  timeout: number;
  nextAttempt: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers: Map<string, CircuitBreakerState> = new Map();

  constructor(@InjectConnection() private connection: Connection) {
    this.initializeBreakers();
  }

  private initializeBreakers(): void {
    // Initialize MongoDB circuit breaker
    this.breakers.set('mongodb', {
      name: 'mongodb',
      state: 'CLOSED',
      failureCount: 0,
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      nextAttempt: 0,
      successCount: 0,
      totalRequests: 0,
    });

    // Initialize Redis circuit breaker (if needed)
    this.breakers.set('redis', {
      name: 'redis',
      state: 'CLOSED',
      failureCount: 0,
      failureThreshold: 3,
      timeout: 30000, // 30 seconds
      nextAttempt: 0,
      successCount: 0,
      totalRequests: 0,
    });

    // Initialize external API circuit breaker
    this.breakers.set('external-api', {
      name: 'external-api',
      state: 'CLOSED',
      failureCount: 0,
      failureThreshold: 10,
      timeout: 120000, // 2 minutes
      nextAttempt: 0,
      successCount: 0,
      totalRequests: 0,
    });

    this.logger.log('Circuit breakers initialized');
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    breakerName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const breaker = this.breakers.get(breakerName);
    if (!breaker) {
      throw new Error(`Circuit breaker '${breakerName}' not found`);
    }

    breaker.totalRequests++;

    // Check if circuit is open
    if (breaker.state === 'OPEN') {
      if (Date.now() < breaker.nextAttempt) {
        this.logger.warn(`Circuit breaker '${breakerName}' is OPEN, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker '${breakerName}' is OPEN`);
      } else {
        // Try to close the circuit
        breaker.state = 'HALF_OPEN';
        this.logger.log(`Circuit breaker '${breakerName}' moved to HALF_OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(breakerName);
      return result;
    } catch (error) {
      this.onFailure(breakerName);
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  private onSuccess(breakerName: string): void {
    const breaker = this.breakers.get(breakerName);
    if (!breaker) return;

    breaker.successCount++;
    breaker.lastSuccessTime = Date.now();

    if (breaker.state === 'HALF_OPEN') {
      // Reset the circuit breaker
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      this.logger.log(`Circuit breaker '${breakerName}' reset to CLOSED`);
    }
  }

  /**
   * Record a failed operation
   */
  private onFailure(breakerName: string): void {
    const breaker = this.breakers.get(breakerName);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failureCount >= breaker.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = Date.now() + breaker.timeout;
      this.logger.warn(
        `Circuit breaker '${breakerName}' opened after ${breaker.failureCount} failures`
      );
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, breaker] of this.breakers) {
      const successRate = breaker.totalRequests > 0 
        ? ((breaker.successCount / breaker.totalRequests) * 100).toFixed(2)
        : '0.00';

      stats[name] = {
        name: breaker.name,
        state: breaker.state,
        failureCount: breaker.failureCount,
        failureThreshold: breaker.failureThreshold,
        successCount: breaker.successCount,
        totalRequests: breaker.totalRequests,
        successRate: `${successRate}%`,
        timeout: breaker.timeout,
        nextAttempt: breaker.state === 'OPEN' ? new Date(breaker.nextAttempt).toISOString() : null,
        lastFailureTime: breaker.lastFailureTime ? new Date(breaker.lastFailureTime).toISOString() : null,
        lastSuccessTime: breaker.lastSuccessTime ? new Date(breaker.lastSuccessTime).toISOString() : null,
      };
    }

    return stats;
  }

  /**
   * Test MongoDB circuit breaker
   */
  async testMongoDBBreaker(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      const result = await this.execute(
        'mongodb',
        async () => {
          // Test MongoDB connection
          if (this.connection.readyState !== 1) {
            throw new Error('MongoDB connection is not ready');
          }
          
          // Perform a simple operation to test the connection
          await this.connection.db.admin().ping();
          return { status: 'connected' };
        },
        async () => {
          return { status: 'fallback - using cached data' };
        }
      );

      return {
        success: true,
        message: 'MongoDB circuit breaker test completed successfully',
        stats: this.getCircuitBreakerStats()['mongodb']
      };
    } catch (error) {
      return {
        success: false,
        message: `MongoDB circuit breaker test failed: ${error instanceof Error ? error.message : String(error)}`,
        stats: this.getCircuitBreakerStats()['mongodb']
      };
    }
  }

  /**
   * Reset a circuit breaker
   */
  resetCircuitBreaker(breakerName: string): boolean {
    const breaker = this.breakers.get(breakerName);
    if (!breaker) {
      return false;
    }

    breaker.state = 'CLOSED';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.totalRequests = 0;
    breaker.nextAttempt = 0;
    breaker.lastFailureTime = undefined;
    breaker.lastSuccessTime = undefined;

    this.logger.log(`Circuit breaker '${breakerName}' has been reset`);
    return true;
  }

  /**
   * Get overall circuit breaker health
   */
  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    openBreakers: string[];
    totalBreakers: number;
    healthyBreakers: number;
  } {
    const openBreakers: string[] = [];
    let healthyCount = 0;

    for (const [name, breaker] of this.breakers) {
      if (breaker.state === 'OPEN') {
        openBreakers.push(name);
      } else {
        healthyCount++;
      }
    }

    const totalBreakers = this.breakers.size;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (openBreakers.length === 0) {
      status = 'healthy';
    } else if (openBreakers.length < totalBreakers) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      openBreakers,
      totalBreakers,
      healthyBreakers: healthyCount,
    };
  }
} 