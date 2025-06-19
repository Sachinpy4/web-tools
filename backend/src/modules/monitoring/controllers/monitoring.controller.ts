import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonitoringService } from '../services/monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  ToolUsageQueryDto,
  ToolUsageResponseDto,
  SystemHealthResponseDto,
  BasicHealthResponseDto,
  CircuitBreakerStatusResponseDto,
  MongoDBTestResponseDto,
  LoadBalancerStatusResponseDto,
  LoadBalancerMetricsResponseDto,
  TimeRangeEnum,
} from '../dto/monitoring.dto';

@ApiTags('Monitoring & Health')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  // Public health check endpoint
  @Get('health')
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Get basic system health status. Public endpoint for load balancers and monitoring systems.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status retrieved successfully',
    type: BasicHealthResponseDto,
  })
  async getHealth(): Promise<BasicHealthResponseDto> {
    return this.monitoringService.getHealthStatus();
  }

  // Admin monitoring endpoints
  @Get('tool-usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get tool usage statistics',
    description: 'Retrieve comprehensive tool usage statistics including processing times, success rates, and usage counts. Admin access required.',
  })
  @ApiQuery({
    name: 'timeRange',
    description: 'Time range for statistics',
    example: TimeRangeEnum.TODAY,
    enum: TimeRangeEnum,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tool usage statistics retrieved successfully',
    type: ToolUsageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getToolUsageStats(@Query() query: ToolUsageQueryDto): Promise<ToolUsageResponseDto> {
    try {
      const toolStats = await this.monitoringService.getToolUsageStats(query.timeRange);
      console.log('🔍 MONITORING - Tool usage stats:', JSON.stringify(toolStats, null, 2));
      return toolStats;
    } catch (error) {
      console.error('❌ MONITORING - Tool usage error:', error);
      throw error;
    }
  }

  @Get('system-health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detailed system health metrics',
    description: 'Retrieve comprehensive system health metrics including memory usage, CPU load, process information, and service status. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health metrics retrieved successfully',
    type: SystemHealthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getSystemHealth() {
    try {
      const healthData = await this.monitoringService.getSystemHealth();
      console.log('🔍 MONITORING - System health data:', JSON.stringify(healthData, null, 2));
      return healthData;
    } catch (error) {
      console.error('❌ MONITORING - System health error:', error);
      throw error;
    }
  }

  // CIRCUIT BREAKER ENDPOINTS

  @Get('circuit-breakers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get circuit breaker status',
    description: 'Retrieve the status of all circuit breakers including failure counts, success rates, and current states. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker status retrieved successfully',
    type: CircuitBreakerStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getCircuitBreakerStatus(): Promise<CircuitBreakerStatusResponseDto> {
    try {
      const status = this.monitoringService.getCircuitBreakerStatus();
      console.log('🔍 MONITORING - Circuit breaker status:', JSON.stringify(status, null, 2));
      return {
        status: 'success',
        data: status
      } as any;
    } catch (error) {
      console.error('❌ MONITORING - Circuit breaker error:', error);
      throw error;
    }
  }

  @Post('test-mongodb-breaker')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Test MongoDB circuit breaker',
    description: 'Test the MongoDB circuit breaker by performing a connection test. This will update the circuit breaker statistics. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MongoDB circuit breaker test completed',
    type: MongoDBTestResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async testMongoDBBreaker(): Promise<MongoDBTestResponseDto> {
    return this.monitoringService.testMongoDBBreaker();
  }

  // LOAD BALANCER ENDPOINTS

  @Get('load-balancer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get load balancer status',
    description: 'Retrieve current load balancer metrics including active connections, request rates, and system load indicators. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Load balancer status retrieved successfully',
    type: LoadBalancerStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getLoadBalancerStatus(): Promise<LoadBalancerStatusResponseDto> {
    try {
      const status = this.monitoringService.getLoadBalancerStatus();
      console.log('🔍 MONITORING - Load balancer status:', JSON.stringify(status, null, 2));
      return {
        status: 'success',
        data: status
      } as any;
    } catch (error) {
      console.error('❌ MONITORING - Load balancer error:', error);
      throw error;
    }
  }

  @Get('load-balancer/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detailed load balancer metrics',
    description: 'Retrieve comprehensive load balancer metrics including performance data, server health, and recommendations. Admin access required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Load balancer metrics retrieved successfully',
    type: LoadBalancerMetricsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access forbidden - Admin role required',
  })
  async getLoadBalancerMetrics(): Promise<LoadBalancerMetricsResponseDto> {
    return this.monitoringService.getLoadBalancerMetrics();
  }
} 