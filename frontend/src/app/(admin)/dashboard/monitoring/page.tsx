'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, Server, Database, HardDrive } from 'lucide-react';
import { apiRequest } from '@/lib/apiClient';

// Simple Progress component implementation
const Progress = ({ value, className, indicatorClassName }: { value: number, className?: string, indicatorClassName?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ''}`}>
    <div 
      className={`h-full bg-primary transition-all ${indicatorClassName || ''}`} 
      style={{ width: `${value}%` }}
    />
  </div>
);

// Simple Alert components
const Alert = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => (
  <div className={`p-4 rounded-md ${variant === 'destructive' ? 'bg-red-100 border border-red-400' : 'bg-gray-100'} ${className || ''}`}>
    {children}
  </div>
);

const AlertTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h5 className={`text-sm font-medium mb-1 ${className || ''}`}>{children}</h5>
);

const AlertDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`text-sm ${className || ''}`}>{children}</div>
);

// Simple Skeleton component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />
);

interface ToolUsage {
  totalUses: number;
  last24Hours: number;
  averageProcessingTime: string;
  successRate: number;
}

interface ToolUsageStats {
  compress: ToolUsage;
  resize: ToolUsage;
  convert: ToolUsage;
  crop: ToolUsage;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  services: {
    redis: {
      status: string;
      mode: string;
    };
    database: {
      status: string;
    };
  };
  system: {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    cpus: number;
    loadAverage: number[];
    memory: {
      total: string;
      free: string;
      used: string;
      usagePercentage: string;
    };
    disk: {
      total: string;
      free: string;
      used: string;
      percentUsed: string;
    };
    uptime: string;
  };
  process: {
    pid: number;
    uptime: string;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
  };
  circuitBreakers: Record<string, any>;
  loadBalancer: {
    activeRequests: number;
    totalRequests: number;
    rejectedRequests: number;
    isInDegradationMode: boolean;
    systemLoad: {
      cpuLoad: number;
      memoryUsage: number;
      cpuCount: number;
    };
  };
}

interface CircuitBreakerStatus {
  [key: string]: {
    state: string;
    stats: {
      successes: number;
      failures: number;
      timeouts: number;
      rejects: number;
    }
  }
}

interface LoadBalancerStatus {
  activeRequests: number;
  totalRequests: number;
  rejectedRequests: number;
  isInDegradationMode: boolean;
  highLoad: boolean;
  systemLoad: {
    cpuLoad: number;
    memoryUsage: number;
    cpuCount: number;
  }
  thresholds?: {
    maxLoadThreshold: number;
    maxMemoryUsagePercent: number;
    degradationCooldownMs: number;
  }
}

// Add a helper function to get a readable time range display text
const getTimeRangeText = (range: string): string => {
  switch (range) {
    case 'today':
      return 'Today';
    case '7days':
      return 'Last 7 Days';
    case '30days':
      return 'Last 30 Days';
    case '1year':
      return 'Last Year';
    default:
      return 'Today';
  }
};

export default function MonitoringPage() {
  const { user } = useAuth();
  const [toolStats, setToolStats] = useState<ToolUsageStats | null>(null);
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [circuitBreakerStats, setCircuitBreakerStats] = useState<CircuitBreakerStatus | null>(null);
  const [loadBalancerStats, setLoadBalancerStats] = useState<LoadBalancerStatus | null>(null);
  const [timeRange, setTimeRange] = useState<string>('today');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch tool usage statistics using the apiRequest utility with time range
      const toolData = await apiRequest<{status: string, data: ToolUsageStats}>(`monitoring/tool-usage?timeRange=${timeRange}`, {
        requireAuth: true
      });
      
      setToolStats(toolData.data);
      
      // Fetch system health data using the apiRequest utility
      const healthData = await apiRequest<SystemHealth>('monitoring/system-health', {
        requireAuth: true
      });
      
      setHealthData(healthData);
      
      // Fetch circuit breaker data
      const circuitBreakerData = await apiRequest<{status: string, data: CircuitBreakerStatus}>('monitoring/circuit-breakers', {
        requireAuth: true
      });
      
      setCircuitBreakerStats(circuitBreakerData.data);
      
      // Fetch load balancer data
      const loadBalancerData = await apiRequest<{status: string, data: LoadBalancerStatus}>('monitoring/load-balancer', {
        requireAuth: true
      });
      
      setLoadBalancerStats(loadBalancerData.data);
      
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Error fetching monitoring data:', err);
      setError(err.message || 'Failed to fetch monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this useEffect to refetch data when timeRange changes
  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // For clarity, you may want to rename the existing initial data fetch useEffect
  // Initial data fetch on component mount
  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchData();
  };

  if (!user || user.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system health, tool usage, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="tools">Tool Usage</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="load-balancer">Load Balancer</TabsTrigger>
        </TabsList>
        
        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* System Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : healthData ? (
                  <div className="flex items-center">
                    {healthData.status === 'ok' ? (
                      <CheckCircle className="h-10 w-10 text-green-500 mr-2" />
                    ) : (
                      <AlertTriangle className="h-10 w-10 text-amber-500 mr-2" />
                    )}
                    <div>
                      <p className="text-2xl font-bold">
                        {healthData.status === 'ok' ? 'Healthy' : 'Degraded'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {healthData.system.uptime} uptime
                      </p>
                    </div>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </CardContent>
            </Card>
            
            {/* Database */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : healthData ? (
                  <div className="flex items-center">
                    {healthData.services.database.status === 'connected' ? (
                      <Database className="h-10 w-10 text-green-500 mr-2" />
                    ) : (
                      <Database className="h-10 w-10 text-red-500 mr-2" />
                    )}
                    <div>
                      <p className="text-2xl font-bold">
                        {healthData.services.database.status === 'connected' ? 'Connected' : 'Disconnected'}
                      </p>
                      <p className="text-xs text-muted-foreground">MongoDB</p>
                    </div>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </CardContent>
            </Card>
            
            {/* Redis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Queue System</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : healthData ? (
                  <div className="flex items-center">
                    {healthData.services.redis.status === 'connected' ? (
                      <Server className="h-10 w-10 text-green-500 mr-2" />
                    ) : (
                      <Server className="h-10 w-10 text-amber-500 mr-2" />
                    )}
                    <div>
                      <p className="text-2xl font-bold">
                        {healthData.services.redis.status === 'connected' ? 'Redis' : 'Local'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mode: {healthData.services.redis.mode}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </CardContent>
            </Card>
            
            {/* Memory */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : healthData ? (
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium">
                        {healthData.system.memory.usagePercentage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {healthData.system.memory.used} / {healthData.system.memory.total}
                      </p>
                    </div>
                    <Progress 
                      value={parseInt(healthData.system.memory.usagePercentage)} 
                      className="h-2"
                      indicatorClassName={
                        parseInt(healthData.system.memory.usagePercentage) > 80
                          ? "bg-red-500"
                          : parseInt(healthData.system.memory.usagePercentage) > 60
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      <HardDrive className="h-3 w-3 inline mr-1" />
                      {healthData.process.memory.heapUsed} heap used
                    </p>
                  </div>
                ) : (
                  <p>No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Detailed information about the server environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : healthData ? (
                <>
                  {/* Environment */}
                  <div>
                    <h3 className="font-medium mb-2">Environment</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Hostname</p>
                        <p className="text-sm text-muted-foreground">{healthData.system.hostname}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Platform</p>
                        <p className="text-sm text-muted-foreground">{healthData.system.platform} ({healthData.system.arch})</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Node.js Version</p>
                        <p className="text-sm text-muted-foreground">{healthData.system.nodeVersion}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">CPUs</p>
                        <p className="text-sm text-muted-foreground">{healthData.system.cpus} cores</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Process ID</p>
                        <p className="text-sm text-muted-foreground">{healthData.process.pid}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Load Average</p>
                        <p className="text-sm text-muted-foreground">
                          {healthData.system.loadAverage.map(load => load.toFixed(2)).join(' | ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p>No system information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tool Usage Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Tool Usage Statistics</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Time Range:</span>
              <select 
                className="bg-background border rounded px-2 py-1 text-sm"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : toolStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Compression Tool */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Image Compression</CardTitle>
                  <CardDescription>
                    JPEG, PNG, WebP optimization tool
                    <span className="ml-1 text-xs text-muted-foreground">
                      (Total uses for {getTimeRangeText(timeRange)})
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Uses</p>
                      <p className="text-3xl font-bold">{toolStats.compress.totalUses.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                      <p className="text-3xl font-bold">{toolStats.compress.last24Hours}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                      <p className="text-lg font-semibold">{toolStats.compress.averageProcessingTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-semibold">{toolStats.compress.successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Resize Tool */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Image Resize</CardTitle>
                  <CardDescription>
                    Resize images with various options
                    <span className="ml-1 text-xs text-muted-foreground">
                      (Total uses for {getTimeRangeText(timeRange)})
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Uses</p>
                      <p className="text-3xl font-bold">{toolStats.resize.totalUses.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                      <p className="text-3xl font-bold">{toolStats.resize.last24Hours}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                      <p className="text-lg font-semibold">{toolStats.resize.averageProcessingTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-semibold">{toolStats.resize.successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Format Conversion */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Format Conversion</CardTitle>
                  <CardDescription>
                    Convert between image formats
                    <span className="ml-1 text-xs text-muted-foreground">
                      (Total uses for {getTimeRangeText(timeRange)})
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Uses</p>
                      <p className="text-3xl font-bold">{toolStats.convert.totalUses.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                      <p className="text-3xl font-bold">{toolStats.convert.last24Hours}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                      <p className="text-lg font-semibold">{toolStats.convert.averageProcessingTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-semibold">{toolStats.convert.successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Crop Tool */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Image Crop</CardTitle>
                  <CardDescription>
                    Crop and adjust images
                    <span className="ml-1 text-xs text-muted-foreground">
                      (Total uses for {getTimeRangeText(timeRange)})
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Uses</p>
                      <p className="text-3xl font-bold">{toolStats.crop.totalUses.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                      <p className="text-3xl font-bold">{toolStats.crop.last24Hours}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Processing Time</p>
                      <p className="text-lg font-semibold">{toolStats.crop.averageProcessingTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-semibold">{toolStats.crop.successRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No tool usage data available</p>
            </div>
          )}
        </TabsContent>
        
        {/* Circuit Breakers Tab */}
        <TabsContent value="circuit-breakers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Circuit Breakers Status</CardTitle>
                <CardDescription>
                  Monitors external service calls to prevent cascading failures
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    await apiRequest('monitoring/test-mongodb-breaker', {
                      method: 'POST',
                      requireAuth: true
                    });
                    await fetchData(); // Refresh data after test
                  } catch (err) {
                    console.error('Error testing circuit breaker:', err);
                    setError('Failed to test circuit breaker');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                Test MongoDB Breaker
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : circuitBreakerStats && Object.keys(circuitBreakerStats).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(circuitBreakerStats).map(([name, data]) => (
                    <div key={name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-semibold capitalize">{name}</h3>
                          <Badge 
                            className="ml-2"
                            variant={
                              data.state === 'closed' ? 'outline' :
                              data.state === 'open' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {data.state || 'unknown'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-background/50 p-2 rounded">
                          <p className="text-xs text-muted-foreground">Success Count</p>
                          <p className="text-xl font-medium">{data.stats?.successes || 0}</p>
                        </div>
                        <div className="bg-background/50 p-2 rounded">
                          <p className="text-xs text-muted-foreground">Failure Count</p>
                          <p className="text-xl font-medium">{data.stats?.failures || 0}</p>
                        </div>
                        <div className="bg-background/50 p-2 rounded">
                          <p className="text-xs text-muted-foreground">Timeout Count</p>
                          <p className="text-xl font-medium">{data.stats?.timeouts || 0}</p>
                        </div>
                        <div className="bg-background/50 p-2 rounded">
                          <p className="text-xs text-muted-foreground">Rejected Count</p>
                          <p className="text-xl font-medium">{data.stats?.rejects || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p>No circuit breakers active</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Load Balancer Tab */}
        <TabsContent value="load-balancer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Load Balancer Status</CardTitle>
              <CardDescription>
                System load management and request handling statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadBalancerStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{loadBalancerStats.activeRequests || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{loadBalancerStats.totalRequests || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Rejected Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{loadBalancerStats.rejectedRequests || 0}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Degradation Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={loadBalancerStats.isInDegradationMode ? "destructive" : "outline"}>
                        {loadBalancerStats.isInDegradationMode ? "Active" : "Inactive"}
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">CPU Load</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Progress 
                            value={loadBalancerStats.systemLoad?.cpuLoad || 0} 
                            className="h-2"
                          />
                        </div>
                        <div className="text-sm font-medium">
                          {(loadBalancerStats.systemLoad?.cpuLoad || 0).toFixed(1)}%
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {loadBalancerStats.systemLoad?.cpuCount || 0} CPU cores available
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Progress 
                            value={loadBalancerStats.systemLoad?.memoryUsage || 0} 
                            className="h-2"
                          />
                        </div>
                        <div className="text-sm font-medium">
                          {(loadBalancerStats.systemLoad?.memoryUsage || 0).toFixed(1)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No load balancer data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-muted-foreground mt-4 text-center">
        Monitoring data auto-refreshes every 30 seconds. Last updated: {lastRefreshed.toLocaleString()}
      </div>
    </div>
  );
} 