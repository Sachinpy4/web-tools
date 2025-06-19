import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';

interface LoadBalancerMetrics {
  requestCount: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  lastRequestTime: number;
  startTime: number;
  totalErrors: number;
  responseTimes: number[];
}

interface ServerHealth {
  cpuUsage: number[];
  memoryUsage: number;
  diskUsage: number;
  networkConnections: number;
  isHealthy: boolean;
  lastHealthCheck: number;
}

@Injectable()
export class LoadBalancerService {
  private readonly logger = new Logger(LoadBalancerService.name);
  private metrics: LoadBalancerMetrics;
  private serverHealth: ServerHealth;
  private readonly maxResponseTimes = 100; // Keep last 100 response times

  constructor() {
    this.initializeMetrics();
    this.startHealthMonitoring();
  }

  private initializeMetrics(): void {
    this.metrics = {
      requestCount: 0,
      activeConnections: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastRequestTime: Date.now(),
      startTime: Date.now(),
      totalErrors: 0,
      responseTimes: [],
    };

    this.serverHealth = {
      cpuUsage: os.loadavg(),
      memoryUsage: this.getMemoryUsagePercentage(),
      diskUsage: 0, // Simplified - would need disk usage calculation
      networkConnections: 0,
      isHealthy: true,
      lastHealthCheck: Date.now(),
    };

    this.logger.log('Load balancer metrics initialized');
  }

  private startHealthMonitoring(): void {
    // Update health metrics every 30 seconds
    setInterval(() => {
      this.updateServerHealth();
    }, 30000);

    // Clean old response times every 5 minutes
    setInterval(() => {
      this.cleanOldMetrics();
    }, 300000);
  }

  /**
   * Record an incoming request
   */
  recordRequest(responseTime?: number, isError: boolean = false): void {
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = Date.now();

    if (isError) {
      this.metrics.totalErrors++;
    }

    if (responseTime !== undefined) {
      this.metrics.responseTimes.push(responseTime);
      
      // Keep only the last N response times
      if (this.metrics.responseTimes.length > this.maxResponseTimes) {
        this.metrics.responseTimes.shift();
      }

      // Update average response time
      this.metrics.averageResponseTime = 
        this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
        this.metrics.responseTimes.length;
    }

    // Update error rate
    this.metrics.errorRate = (this.metrics.totalErrors / this.metrics.requestCount) * 100;
  }

  /**
   * Record active connection change
   */
  updateActiveConnections(delta: number): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections + delta);
  }

  /**
   * Get current load balancer metrics
   */
  getLoadBalancerMetrics(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: LoadBalancerMetrics & {
      uptime: number;
      requestsPerSecond: number;
      errorRateFormatted: string;
      averageResponseTimeFormatted: string;
    };
    serverHealth: ServerHealth & {
      cpuUsageFormatted: string;
      memoryUsageFormatted: string;
      healthStatus: string;
    };
    recommendations: string[];
  } {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    const uptimeSeconds = uptime / 1000;
    const requestsPerSecond = uptimeSeconds > 0 ? this.metrics.requestCount / uptimeSeconds : 0;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const recommendations: string[] = [];

    // Check various health indicators
    if (this.metrics.errorRate > 10) {
      status = 'unhealthy';
      recommendations.push('High error rate detected - investigate application issues');
    } else if (this.metrics.errorRate > 5) {
      status = 'degraded';
      recommendations.push('Elevated error rate - monitor closely');
    }

    if (this.metrics.averageResponseTime > 5000) {
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
      recommendations.push('High response times - consider scaling or optimization');
    }

    if (this.serverHealth.memoryUsage > 90) {
      status = 'unhealthy';
      recommendations.push('Critical memory usage - immediate attention required');
    } else if (this.serverHealth.memoryUsage > 80) {
      status = status === 'healthy' ? 'degraded' : status;
      recommendations.push('High memory usage - consider scaling');
    }

    const avgCpuUsage = this.serverHealth.cpuUsage.reduce((sum, usage) => sum + usage, 0) / this.serverHealth.cpuUsage.length;
    if (avgCpuUsage > 0.9) {
      status = 'unhealthy';
      recommendations.push('Critical CPU usage - immediate scaling required');
    } else if (avgCpuUsage > 0.7) {
      status = status === 'healthy' ? 'degraded' : status;
      recommendations.push('High CPU usage - consider scaling');
    }

    if (recommendations.length === 0) {
      recommendations.push('System operating within normal parameters');
    }

    return {
      status,
      metrics: {
        ...this.metrics,
        uptime: uptime,
        requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
        errorRateFormatted: `${this.metrics.errorRate.toFixed(2)}%`,
        averageResponseTimeFormatted: `${this.metrics.averageResponseTime.toFixed(0)}ms`,
      },
      serverHealth: {
        ...this.serverHealth,
        cpuUsageFormatted: this.serverHealth.cpuUsage.map(usage => `${(usage * 100).toFixed(1)}%`).join(', '),
        memoryUsageFormatted: `${this.serverHealth.memoryUsage.toFixed(1)}%`,
        healthStatus: this.serverHealth.isHealthy ? 'healthy' : 'unhealthy',
      },
      recommendations,
    };
  }

  /**
   * Check if system is under high load
   */
  isSystemUnderHighLoad(): boolean {
    const avgCpuUsage = this.serverHealth.cpuUsage.reduce((sum, usage) => sum + usage, 0) / this.serverHealth.cpuUsage.length;
    
    return (
      avgCpuUsage > 0.8 || // CPU usage > 80%
      this.serverHealth.memoryUsage > 85 || // Memory usage > 85%
      this.metrics.averageResponseTime > 3000 || // Response time > 3s
      this.metrics.errorRate > 5 // Error rate > 5%
    );
  }

  /**
   * Get load balancer status for health checks
   */
  getLoadBalancerStatus(): {
    status: 'active' | 'degraded' | 'inactive';
    activeConnections: number;
    requestsPerMinute: number;
    errorRate: string;
    averageResponseTime: string;
    systemLoad: 'low' | 'medium' | 'high' | 'critical';
    lastActivity: string;
  } {
    const now = Date.now();
    const timeSinceLastRequest = now - this.metrics.lastRequestTime;
    const requestsPerMinute = this.getRequestsPerMinute();
    
    let status: 'active' | 'degraded' | 'inactive';
    let systemLoad: 'low' | 'medium' | 'high' | 'critical';

    // Determine status based on recent activity
    if (timeSinceLastRequest > 300000) { // 5 minutes
      status = 'inactive';
    } else if (this.isSystemUnderHighLoad()) {
      status = 'degraded';
    } else {
      status = 'active';
    }

    // Determine system load
    const avgCpuUsage = this.serverHealth.cpuUsage.reduce((sum, usage) => sum + usage, 0) / this.serverHealth.cpuUsage.length;
    
    if (avgCpuUsage > 0.9 || this.serverHealth.memoryUsage > 90) {
      systemLoad = 'critical';
    } else if (avgCpuUsage > 0.7 || this.serverHealth.memoryUsage > 80) {
      systemLoad = 'high';
    } else if (avgCpuUsage > 0.5 || this.serverHealth.memoryUsage > 60) {
      systemLoad = 'medium';
    } else {
      systemLoad = 'low';
    }

    return {
      status,
      activeConnections: this.metrics.activeConnections,
      requestsPerMinute,
      errorRate: `${this.metrics.errorRate.toFixed(2)}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`,
      systemLoad,
      lastActivity: new Date(this.metrics.lastRequestTime).toISOString(),
    };
  }

  /**
   * Reset load balancer metrics
   */
  resetMetrics(): void {
    this.logger.log('Resetting load balancer metrics');
    this.initializeMetrics();
  }

  /**
   * Get requests per minute
   */
  private getRequestsPerMinute(): number {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    const uptimeMinutes = uptime / (1000 * 60);
    
    return uptimeMinutes > 0 ? this.metrics.requestCount / uptimeMinutes : 0;
  }

  /**
   * Update server health metrics
   */
  private updateServerHealth(): void {
    this.serverHealth.cpuUsage = os.loadavg();
    this.serverHealth.memoryUsage = this.getMemoryUsagePercentage();
    this.serverHealth.lastHealthCheck = Date.now();

    // Determine if server is healthy
    const avgCpuUsage = this.serverHealth.cpuUsage.reduce((sum, usage) => sum + usage, 0) / this.serverHealth.cpuUsage.length;
    this.serverHealth.isHealthy = (
      avgCpuUsage < 0.9 &&
      this.serverHealth.memoryUsage < 90 &&
      this.metrics.errorRate < 10
    );

    this.logger.debug(`Server health updated: CPU=${avgCpuUsage.toFixed(2)}, Memory=${this.serverHealth.memoryUsage.toFixed(1)}%, Healthy=${this.serverHealth.isHealthy}`);
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsagePercentage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return (usedMemory / totalMemory) * 100;
  }

  /**
   * Clean old metrics to prevent memory leaks
   */
  private cleanOldMetrics(): void {
    // Keep only recent response times
    if (this.metrics.responseTimes.length > this.maxResponseTimes) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-this.maxResponseTimes);
    }

    this.logger.debug('Old metrics cleaned');
  }
} 