import { IsOptional, IsEnum, IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ENUMS
export enum TimeRangeEnum {
  TODAY = 'today',
  SEVEN_DAYS = '7days',
  THIRTY_DAYS = '30days',
  ONE_YEAR = '1year',
}

export enum CircuitBreakerStateEnum {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export enum SystemStatusEnum {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export enum LoadBalancerStatusEnum {
  ACTIVE = 'active',
  DEGRADED = 'degraded',
  INACTIVE = 'inactive',
}

export enum SystemLoadEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// REQUEST DTOs
export class ToolUsageQueryDto {
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  @ApiPropertyOptional({
    description: 'Time range for tool usage statistics',
    enum: TimeRangeEnum,
    example: TimeRangeEnum.TODAY,
  })
  timeRange?: TimeRangeEnum;
}

// RESPONSE DTOs
export class ToolUsageStatsDto {
  @ApiProperty({
    description: 'Total number of uses in the selected time range',
    example: 150,
  })
  totalUses: number;

  @ApiProperty({
    description: 'Number of uses in the last 24 hours',
    example: 25,
  })
  last24Hours: number;

  @ApiProperty({
    description: 'Average processing time formatted as string',
    example: '1.2s',
  })
  averageProcessingTime: string;

  @ApiProperty({
    description: 'Success rate as percentage',
    example: 98.5,
  })
  successRate: number;
}

export class ToolUsageResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Tool usage statistics by tool type',
    type: 'object',
    additionalProperties: true,
  })
  data: {
    compress: ToolUsageStatsDto;
    resize: ToolUsageStatsDto;
    convert: ToolUsageStatsDto;
    crop: ToolUsageStatsDto;
  };
}

export class SystemMemoryDto {
  @ApiProperty({
    description: 'Total system memory formatted',
    example: '8.00 GB',
  })
  total: string;

  @ApiProperty({
    description: 'Free system memory formatted',
    example: '2.50 GB',
  })
  free: string;

  @ApiProperty({
    description: 'Used system memory formatted',
    example: '5.50 GB',
  })
  used: string;

  @ApiProperty({
    description: 'Memory usage percentage',
    example: '68.75%',
  })
  usagePercentage: string;
}

export class ProcessMemoryDto {
  @ApiProperty({
    description: 'Resident Set Size formatted',
    example: '150.25 MB',
  })
  rss: string;

  @ApiProperty({
    description: 'Total heap size formatted',
    example: '120.50 MB',
  })
  heapTotal: string;

  @ApiProperty({
    description: 'Used heap size formatted',
    example: '85.75 MB',
  })
  heapUsed: string;

  @ApiProperty({
    description: 'External memory usage formatted',
    example: '25.30 MB',
  })
  external: string;
}

export class SystemInfoDto {
  @ApiProperty({
    description: 'Server hostname',
    example: 'web-tools-server',
  })
  hostname: string;

  @ApiProperty({
    description: 'Operating system platform',
    example: 'linux',
  })
  platform: string;

  @ApiProperty({
    description: 'System architecture',
    example: 'x64',
  })
  arch: string;

  @ApiProperty({
    description: 'Node.js version',
    example: 'v18.17.0',
  })
  nodeVersion: string;

  @ApiProperty({
    description: 'Number of CPU cores',
    example: 4,
  })
  cpus: number;

  @ApiProperty({
    description: 'CPU load average',
    type: 'array',
    items: { type: 'number' },
    example: [0.5, 0.3, 0.2],
  })
  loadAverage: number[];

  @ApiProperty({
    description: 'System memory information',
    type: SystemMemoryDto,
  })
  memory: SystemMemoryDto;

  @ApiProperty({
    description: 'System uptime formatted',
    example: '5d 12h 30m 45s',
  })
  uptime: string;
}

export class ProcessInfoDto {
  @ApiProperty({
    description: 'Process ID',
    example: 12345,
  })
  pid: number;

  @ApiProperty({
    description: 'Process uptime formatted',
    example: '2d 8h 15m 30s',
  })
  uptime: string;

  @ApiProperty({
    description: 'Process memory usage',
    type: ProcessMemoryDto,
  })
  memory: ProcessMemoryDto;
}

export class ServiceStatusDto {
  @ApiProperty({
    description: 'Database connection status',
    example: 'connected',
  })
  status: string;
}

export class SystemHealthDataDto {
  @ApiProperty({
    description: 'MongoDB connection status and response time',
    type: 'object',
    properties: {
      status: { type: 'string', example: 'connected' },
      responseTime: { type: 'number', example: 15 },
    },
  })
  mongodb: {
    status: string;
    responseTime: number;
  };

  @ApiProperty({
    description: 'Redis connection status and response time',
    type: 'object',
    properties: {
      status: { type: 'string', example: 'connected' },
      responseTime: { type: 'number', example: 5 },
    },
  })
  redis: {
    status: string;
    responseTime: number;
  };

  @ApiProperty({
    description: 'System information',
    type: 'object',
    properties: {
      uptime: { type: 'string', example: '2d 8h 15m 30s' },
      memoryUsage: {
        type: 'object',
        properties: {
          used: { type: 'string', example: '5.50 GB' },
          total: { type: 'string', example: '8.00 GB' },
          percentage: { type: 'number', example: 69 },
        },
      },
      cpuUsage: { type: 'number', example: 25 },
    },
  })
  system: {
    uptime: string;
    memoryUsage: {
      used: string;
      total: string;
      percentage: number;
    };
    cpuUsage: number;
  };
}

export class SystemHealthResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'System health data',
    type: SystemHealthDataDto,
  })
  data: SystemHealthDataDto;
}

export class BasicHealthResponseDto {
  @ApiProperty({
    description: 'System status',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp of health check',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Database connection status',
    example: 'connected',
  })
  database?: string;

  @ApiPropertyOptional({
    description: 'System uptime in seconds',
    example: 3600,
  })
  uptime?: number;

  @ApiProperty({
    description: 'Status message',
    example: 'System operating normally',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Error message when status is error',
    example: 'Health check failed',
  })
  error?: string;
}

// CIRCUIT BREAKER DTOs
export class CircuitBreakerStatsDto {
  @ApiProperty({
    description: 'Circuit breaker name',
    example: 'mongodb',
  })
  name: string;

  @ApiProperty({
    description: 'Current circuit breaker state',
    enum: CircuitBreakerStateEnum,
    example: CircuitBreakerStateEnum.CLOSED,
  })
  state: CircuitBreakerStateEnum;

  @ApiProperty({
    description: 'Current failure count',
    example: 0,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Failure threshold before opening',
    example: 5,
  })
  failureThreshold: number;

  @ApiProperty({
    description: 'Number of successful requests',
    example: 150,
  })
  successCount: number;

  @ApiProperty({
    description: 'Total number of requests',
    example: 150,
  })
  totalRequests: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: '100.00%',
  })
  successRate: string;

  @ApiProperty({
    description: 'Timeout duration in milliseconds',
    example: 60000,
  })
  timeout: number;

  @ApiPropertyOptional({
    description: 'Next attempt time when circuit is open',
    example: '2024-01-15T10:31:00.000Z',
    nullable: true,
  })
  nextAttempt?: string;

  @ApiPropertyOptional({
    description: 'Last failure timestamp',
    example: '2024-01-15T10:29:00.000Z',
    nullable: true,
  })
  lastFailureTime?: string;

  @ApiPropertyOptional({
    description: 'Last success timestamp',
    example: '2024-01-15T10:30:00.000Z',
    nullable: true,
  })
  lastSuccessTime?: string;
}

export class CircuitBreakerStatusResponseDto {
  @ApiProperty({
    description: 'Overall circuit breaker health status',
    example: 'healthy',
  })
  status: string;

  @ApiProperty({
    description: 'List of open circuit breakers',
    type: 'array',
    items: { type: 'string' },
    example: [],
  })
  openBreakers: string[];

  @ApiProperty({
    description: 'Total number of circuit breakers',
    example: 3,
  })
  totalBreakers: number;

  @ApiProperty({
    description: 'Number of healthy circuit breakers',
    example: 3,
  })
  healthyBreakers: number;

  @ApiProperty({
    description: 'Circuit breaker statistics by name',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/CircuitBreakerStatsDto' },
  })
  breakers: Record<string, CircuitBreakerStatsDto>;
}

export class MongoDBTestResponseDto {
  @ApiProperty({
    description: 'Test success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Test result message',
    example: 'MongoDB circuit breaker test completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated MongoDB circuit breaker statistics',
    type: CircuitBreakerStatsDto,
  })
  stats: CircuitBreakerStatsDto;
}

// LOAD BALANCER DTOs
export class LoadBalancerStatusResponseDto {
  @ApiProperty({
    description: 'Load balancer status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Number of active connections',
    example: 25,
  })
  activeConnections: number;

  @ApiProperty({
    description: 'Requests per minute',
    example: 120.5,
  })
  requestsPerMinute: number;

  @ApiProperty({
    description: 'Error rate percentage',
    example: '2.50%',
  })
  errorRate: string;

  @ApiProperty({
    description: 'Average response time',
    example: '150ms',
  })
  averageResponseTime: string;

  @ApiProperty({
    description: 'Current system load level',
    example: 'medium',
  })
  systemLoad: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastActivity: string;
}

export class LoadBalancerMetricsDto {
  @ApiProperty({
    description: 'Total request count',
    example: 1500,
  })
  requestCount: number;

  @ApiProperty({
    description: 'Active connections',
    example: 25,
  })
  activeConnections: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 150,
  })
  averageResponseTime: number;

  @ApiProperty({
    description: 'Error rate percentage',
    example: 2.5,
  })
  errorRate: number;

  @ApiProperty({
    description: 'System uptime in milliseconds',
    example: 3600000,
  })
  uptime: number;

  @ApiProperty({
    description: 'Requests per second',
    example: 2.5,
  })
  requestsPerSecond: number;

  @ApiProperty({
    description: 'Formatted error rate',
    example: '2.50%',
  })
  errorRateFormatted: string;

  @ApiProperty({
    description: 'Formatted average response time',
    example: '150ms',
  })
  averageResponseTimeFormatted: string;
}

export class LoadBalancerServerHealthDto {
  @ApiProperty({
    description: 'CPU usage formatted',
    example: '45.2%, 38.1%, 42.7%',
  })
  cpuUsageFormatted: string;

  @ApiProperty({
    description: 'Memory usage formatted',
    example: '68.5%',
  })
  memoryUsageFormatted: string;

  @ApiProperty({
    description: 'Server health status',
    example: 'healthy',
  })
  healthStatus: string;

  @ApiProperty({
    description: 'Is server healthy',
    example: true,
  })
  isHealthy: boolean;
}

export class LoadBalancerMetricsResponseDto {
  @ApiProperty({
    description: 'Overall load balancer status',
    example: 'healthy',
  })
  status: string;

  @ApiProperty({
    description: 'Load balancer metrics',
    type: LoadBalancerMetricsDto,
  })
  metrics: LoadBalancerMetricsDto;

  @ApiProperty({
    description: 'Server health information',
    type: LoadBalancerServerHealthDto,
  })
  serverHealth: LoadBalancerServerHealthDto;

  @ApiProperty({
    description: 'System recommendations',
    type: 'array',
    items: { type: 'string' },
    example: ['System operating within normal parameters'],
  })
  recommendations: string[];
} 