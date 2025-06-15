'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiClient';
import { Trash2, CheckCircle, Timer, ClockIcon, RefreshCw, Settings, Save, Database, HardDrive, MemoryStick } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Add type definitions for the API response
interface CleanupResult {
  processedFiles: {
    deletedCount: number;
    sizeFormatted: string;
  };
  archiveFiles: {
    deletedCount: number;
    sizeFormatted: string;
  };
  uploadedFiles: {
    deletedCount: number;
    sizeFormatted: string;
  };
  totalDeleted: number;
  totalSizeRecovered: string;
}

interface ScheduledTaskResult {
  success: boolean;
  message: string;
}

interface ApiResponse {
  status: string;
  data: {
    cleanup: CleanupResult;
    scheduledTask: ScheduledTaskResult | null;
  };
}

interface SystemSettings {
  workerConcurrency: number;
  maxLoadThreshold: number;
  maxMemoryUsagePercent: number;
  degradationCooldownMs: number;
  imageProcessingMaxRequests: number;
  imageProcessingWindowMs: number;
  batchOperationMaxRequests: number;
  batchOperationWindowMs: number;
  apiMaxRequests: number;
  apiWindowMs: number;
  maxFileSize: number;
  maxFiles: number;
  processedFileRetentionHours: number;
  archiveFileRetentionHours: number;
  tempFileRetentionHours: number;
  autoCleanupEnabled: boolean;
  cleanupIntervalHours: number;
  nodeMemoryLimit: number;
  jobTimeoutMs: number;
  jobRetryAttempts: number;
}

interface SystemStatus {
  logs: { 
    size: string; 
    lines: number; 
    errorSize: string; 
  };
  memory: { 
    used: number; 
    total: number; 
    percentage: number; 
  };
  database: { 
    collections: number; 
    totalSize: string; 
    documents: number; 
  };
  cache: { 
    connected: boolean; 
    keys: number; 
    memory: string; 
  };
  disk: { 
    used: string; 
    available: string; 
    percentage: number; 
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Cleanup states
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse['data'] | null>(null);
  
  // System settings states
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Scheduler states for each cleanup type
  const [schedulerStates, setSchedulerStates] = useState({
    images: false,
    logs: false,
    cache: false, 
    database: false,
    memory: false
  });
  
  // Detailed scheduler information
  const [schedulerInfo, setSchedulerInfo] = useState<{
    [key: string]: { 
      active: boolean; 
      nextRun?: string; 
      schedule?: string 
    }
  }>({});
  
  // System status information
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  
  // Load system settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await apiRequest<{ status: string; data: { settings: SystemSettings } }>('admin/settings', {
          requireAuth: true
        });
        setSettings(response.data.settings);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: 'Failed to load settings',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive'
        });
      } finally {
        setSettingsLoading(false);
      }
    };
    
    loadSettings();
  }, [toast]);
  
  // Load scheduler status on component mount
  useEffect(() => {
    const loadSchedulerStatus = async () => {
      try {
        const response = await apiRequest<{ 
          status: string; 
          data: { 
            schedulers: { 
              [key: string]: { 
                active: boolean; 
                nextRun?: string; 
                schedule?: string 
              } 
            } 
          } 
        }>('admin/scheduler-status', {
          requireAuth: true
        });
        
        // Update scheduler states based on API response
        const { schedulers } = response.data;
        setSchedulerStates({
          images: schedulers.images?.active || false,
          logs: schedulers.logs?.active || false,
          cache: schedulers.cache?.active || false,
          database: schedulers.database?.active || false,
          memory: schedulers.memory?.active || false
        });
        
        // Store detailed scheduler information
        setSchedulerInfo(schedulers);
      } catch (error) {
        console.error('Failed to load scheduler status:', error);
        // Don't show toast error for this as it's not critical
      }
    };
    
    loadSchedulerStatus();
  }, []);
  
  // Load system status on component mount
  useEffect(() => {
    const loadSystemStatus = async () => {
      try {
        const response = await apiRequest<{ 
          status: string; 
          data: { 
            systemStatus: SystemStatus 
          } 
        }>('admin/system-status', {
          requireAuth: true
        });
        
        setSystemStatus(response.data.systemStatus);
      } catch (error) {
        console.error('Failed to load system status:', error);
        // Don't show toast error for this as it's not critical
      }
    };
    
    loadSystemStatus();
  }, []);
  
  // Function to save system settings
  const saveSettings = async () => {
    if (!settings || !hasChanges) return;
    
    try {
      setSettingsSaving(true);
      const response = await apiRequest<{ status: string; data: { settings: SystemSettings; message: string } }>('admin/settings', {
        method: 'PUT',
        body: settings,
        requireAuth: true
      });
      
      setSettings(response.data.settings);
      setHasChanges(false);
      
      toast({
        title: 'Settings saved successfully',
        description: response.data.message,
        variant: 'default'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setSettingsSaving(false);
    }
  };
  
  // Function to update a setting value
  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };
  
  // Function to handle cleanup
  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<any>('admin/cleanup-system', {
        method: 'POST',
        body: { type: 'images' },
        requireAuth: true
      });
      
      // Refresh system status after cleanup
      await refreshSystemStatus();
      
      toast({
        title: 'Image cleanup completed successfully',
        description: `Deleted ${response.data.totalDeleted || 0} files, recovered ${response.data.sizeRecovered || '0 MB'} of space.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
      
      toast({
        title: 'Image cleanup failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to refresh system status
  const refreshSystemStatus = async () => {
    try {
      const response = await apiRequest<{ 
        status: string; 
        data: { 
          systemStatus: SystemStatus 
        } 
      }>('admin/system-status', {
        requireAuth: true
      });
      
      setSystemStatus(response.data.systemStatus);
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    }
  };
  
  // Function to handle system cleanup (logs, cache, database, memory)
  const handleSystemCleanup = async (type: 'images' | 'logs' | 'cache' | 'database' | 'memory') => {
    setIsLoading(true);
    try {
      const response = await apiRequest<any>(`admin/cleanup-system`, {
        method: 'POST',
        body: { type },
        requireAuth: true
      });
      
      // Refresh system status after cleanup
      await refreshSystemStatus();
      
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} cleanup completed`,
        description: `Successfully cleaned ${type} - ${response.data.totalDeleted || 0} items processed`,
        variant: 'default'
      });
    } catch (error) {
      console.error(`${type} cleanup failed:`, error);
      
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} cleanup failed`,
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle scheduler setup for individual cleanup types
  const handleSchedulerSetup = async (type: 'images' | 'logs' | 'cache' | 'database' | 'memory', enabled: boolean) => {
    setIsLoading(true);
    try {
      // Default schedule times for each type
      const scheduleMap = {
        images: { hour: 3, minute: 0 },
        logs: { hour: 2, minute: 0 },
        cache: { hour: 1, minute: 0 },
        database: { hour: 4, minute: 0 },
        memory: { hour: 6, minute: 0 }
      };
      
      const schedule = scheduleMap[type];
      
      const response = await apiRequest<any>(`admin/setup-scheduler`, {
        method: 'POST',
        body: { 
          type, 
          enabled,
          hour: schedule.hour,
          minute: schedule.minute 
        },
        requireAuth: true
      });
      
      // Update local state
      setSchedulerStates(prev => ({
        ...prev,
        [type]: enabled
      }));
      
      // Refresh scheduler status to get updated next run times
      try {
        const statusResponse = await apiRequest<{ 
          status: string; 
          data: { 
            schedulers: { 
              [key: string]: { 
                active: boolean; 
                nextRun?: string; 
                schedule?: string 
              } 
            } 
          } 
        }>('admin/scheduler-status', {
          requireAuth: true
        });
        
        const { schedulers } = statusResponse.data;
        setSchedulerStates({
          images: schedulers.images?.active || false,
          logs: schedulers.logs?.active || false,
          cache: schedulers.cache?.active || false,
          database: schedulers.database?.active || false,
          memory: schedulers.memory?.active || false
        });
        setSchedulerInfo(schedulers);
      } catch (statusError) {
        console.error('Failed to refresh scheduler status:', statusError);
      }
      
      toast({
        title: enabled ? 'Scheduler activated' : 'Scheduler deactivated',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} cleanup ${enabled ? `scheduled daily at ${schedule.hour}:${schedule.minute.toString().padStart(2, '0')}` : 'scheduling disabled'}`,
        variant: 'default'
      });
    } catch (error) {
      console.error(`${type} scheduler setup failed:`, error);
      
      toast({
        title: 'Scheduler setup failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user || user.role !== 'admin') {
    return <div>Access denied. Admin privileges required.</div>;
  }
  
  return (
    <div className="container space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">
          Manage system configuration and maintenance tasks
        </p>
      </div>
      
      <Tabs defaultValue="maintenance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        
        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">System Status</h2>
              <p className="text-sm text-muted-foreground">Real-time system information and maintenance</p>
            </div>
            <Button 
              onClick={refreshSystemStatus} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>
                Perform system maintenance tasks and configure automated cleanup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  Image Cleanup
                  {schedulerStates.images && (
                    <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Clean up temporary and processed images to free up disk space.
                  This will remove processed images, conversion results, and archives that are older than 7 days.
                  Blog images will be preserved.
                </p>
                
                {/* NEW: High-load emergency cleanup info */}
                <Alert>
                  <Timer className="h-4 w-4" />
                  <AlertTitle>High-Load Optimization</AlertTitle>
                  <AlertDescription>
                    Automatic emergency cleanup is now enabled during traffic spikes. 
                    Files are cleaned more aggressively (30min-2hr retention) when system load exceeds 90%.
                  </AlertDescription>
                </Alert>
                
                {results && (
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Cleanup completed</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-2 text-sm">
                        <p>
                          <strong>Processed files:</strong> {results.cleanup.processedFiles.deletedCount} deleted 
                          ({results.cleanup.processedFiles.sizeFormatted})
                        </p>
                        <p>
                          <strong>Archive files:</strong> {results.cleanup.archiveFiles.deletedCount} deleted 
                          ({results.cleanup.archiveFiles.sizeFormatted})
                        </p>
                        <p>
                          <strong>Uploaded files:</strong> {results.cleanup.uploadedFiles.deletedCount} deleted 
                          ({results.cleanup.uploadedFiles.sizeFormatted})
                        </p>
                        <Separator className="my-2" />
                        <p>
                          <strong>Total:</strong> {results.cleanup.totalDeleted} files deleted, 
                          {results.cleanup.totalSizeRecovered} recovered
                        </p>
                        
                        {results.scheduledTask && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                            <p className={results.scheduledTask.success ? 'text-green-600' : 'text-red-600'}>
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              {results.scheduledTask.message}
                            </p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                {schedulerInfo.images && schedulerInfo.images.active && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      Next cleanup: {schedulerInfo.images.nextRun ? 
                        new Date(schedulerInfo.images.nextRun).toLocaleString() : 
                        schedulerInfo.images.schedule || 'Unknown'}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="imagesScheduler" 
                    checked={schedulerStates.images}
                    onCheckedChange={(checked) => handleSchedulerSetup('images', !!checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="imagesScheduler"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Schedule automatic cleanup (3:00 AM daily)
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCleanup} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" /> 
                    Clean Now
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Additional System Cleanup Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Log Files Cleanup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="mr-2 h-5 w-5" />
                  Log Files Cleanup
                  {schedulerStates.logs && (
                    <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Clean up system log files to free up disk space. Large log files will be truncated and old logs will be removed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Current logs: <strong>{systemStatus?.logs.size || 'Loading...'}</strong> ({systemStatus?.logs.lines || 0} lines)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Error log: <strong>{systemStatus?.logs.errorSize || 'Loading...'}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Retention: 7 days for log files
                  </p>
                  {schedulerInfo.logs && schedulerInfo.logs.active && (
                    <p className="text-sm text-green-600">
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      Next cleanup: {schedulerInfo.logs.nextRun ? 
                        new Date(schedulerInfo.logs.nextRun).toLocaleString() : 
                        schedulerInfo.logs.schedule || 'Unknown'}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="logsScheduler" 
                    checked={schedulerStates.logs}
                    onCheckedChange={(checked) => handleSchedulerSetup('logs', !!checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="logsScheduler"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Schedule automatic cleanup (2:00 AM daily)
                  </label>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSystemCleanup('logs')} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <HardDrive className="mr-2 h-4 w-4" /> 
                      Clean Logs
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Cache/Redis Cleanup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Cache Cleanup
                  {schedulerStates.cache && (
                    <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Clear expired Redis cache keys and optimize memory usage. Rate limiting and circuit breaker data will be cleaned.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Redis status: <strong className={systemStatus?.cache.connected ? 'text-green-600' : 'text-red-600'}>
                      {systemStatus?.cache.connected ? 'Connected' : 'Disconnected'}
                    </strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cache memory: <strong>{systemStatus?.cache.memory || 'Loading...'}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Keys: <strong>{systemStatus?.cache.keys || 0}</strong>
                  </p>
                  {schedulerInfo.cache && schedulerInfo.cache.active && (
                    <p className="text-sm text-green-600">
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      Next cleanup: {schedulerInfo.cache.nextRun ? 
                        new Date(schedulerInfo.cache.nextRun).toLocaleString() : 
                        schedulerInfo.cache.schedule || 'Unknown'}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="cacheScheduler" 
                    checked={schedulerStates.cache}
                    onCheckedChange={(checked) => handleSchedulerSetup('cache', !!checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="cacheScheduler"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Schedule automatic cleanup (1:00 AM daily)
                  </label>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSystemCleanup('cache')} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" /> 
                      Clean Cache
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Database Cleanup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Database Cleanup
                  {schedulerStates.database && (
                    <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Remove expired sessions, old analytics data, and orphaned records. Optimizes database performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Collections: <strong>{systemStatus?.database.collections || 0}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total documents: <strong>{systemStatus?.database.documents || 0}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Database size: <strong>{systemStatus?.database.totalSize || 'Loading...'}</strong>
                  </p>
                  {schedulerInfo.database && schedulerInfo.database.active && (
                    <p className="text-sm text-green-600">
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      Next cleanup: {schedulerInfo.database.nextRun ? 
                        new Date(schedulerInfo.database.nextRun).toLocaleString() : 
                        schedulerInfo.database.schedule || 'Unknown'}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="databaseScheduler" 
                    checked={schedulerStates.database}
                    onCheckedChange={(checked) => handleSchedulerSetup('database', !!checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="databaseScheduler"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Schedule automatic cleanup (4:00 AM daily)
                  </label>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSystemCleanup('database')} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" /> 
                      Clean Database
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Memory Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MemoryStick className="mr-2 h-5 w-5" />
                  Memory Optimization
                  {schedulerStates.memory && (
                    <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Scheduled
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Force garbage collection and clear cached modules to free up Node.js memory usage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Memory used: <strong>{systemStatus?.memory.used || 0} MB</strong> ({systemStatus?.memory.percentage || 0}%)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total memory: <strong>{systemStatus?.memory.total || 0} MB</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Disk usage: <strong>{systemStatus?.disk.used || 'Loading...'}</strong>
                  </p>
                  {schedulerInfo.memory && schedulerInfo.memory.active && (
                    <p className="text-sm text-green-600">
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      Next cleanup: {schedulerInfo.memory.nextRun ? 
                        new Date(schedulerInfo.memory.nextRun).toLocaleString() : 
                        schedulerInfo.memory.schedule || 'Unknown'}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="memoryScheduler" 
                    checked={schedulerStates.memory}
                    onCheckedChange={(checked) => handleSchedulerSetup('memory', !!checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="memoryScheduler"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Schedule automatic cleanup (6:00 AM daily)
                  </label>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSystemCleanup('memory')} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <MemoryStick className="mr-2 h-4 w-4" /> 
                      Optimize Memory
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
          </div>
        </TabsContent>
        
        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          {settingsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading settings...
                </div>
              </CardContent>
            </Card>
          ) : settings ? (
            <>
              {/* Save Button at top */}
              {hasChanges && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertTitle>Unsaved Changes</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>You have unsaved configuration changes.</span>
                    <Button 
                      onClick={saveSettings} 
                      disabled={settingsSaving}
                      size="sm"
                    >
                      {settingsSaving ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Worker & Processing Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Worker & Processing Settings</CardTitle>
                  <CardDescription>
                    Configure how the system handles image processing workloads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workerConcurrency">Worker Concurrency</Label>
                      <Input
                        id="workerConcurrency"
                        type="number"
                        min={1}
                        max={100}
                        value={settings.workerConcurrency}
                        onChange={(e) => updateSetting('workerConcurrency', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Number of simultaneous image processing jobs (1-100)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxLoadThreshold">CPU Load Threshold</Label>
                      <Input
                        id="maxLoadThreshold"
                        type="number"
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={settings.maxLoadThreshold}
                        onChange={(e) => updateSetting('maxLoadThreshold', parseFloat(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">
                        CPU load threshold for degraded mode (0.1-1.0)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxMemoryUsagePercent">Memory Usage Threshold (%)</Label>
                      <Input
                        id="maxMemoryUsagePercent"
                        type="number"
                        min={50}
                        max={99}
                        value={settings.maxMemoryUsagePercent}
                        onChange={(e) => updateSetting('maxMemoryUsagePercent', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Memory usage percentage for degraded mode (50-99%)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="degradationCooldownMs">Cooldown Period (ms)</Label>
                      <Input
                        id="degradationCooldownMs"
                        type="number"
                        min={1000}
                        max={300000}
                        step={1000}
                        value={settings.degradationCooldownMs}
                        onChange={(e) => updateSetting('degradationCooldownMs', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Cooldown period before exiting degraded mode (1s-5min)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Rate Limiting Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Rate Limiting Settings</CardTitle>
                  <CardDescription>
                    Configure request limits to prevent abuse and maintain performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Image Processing Limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="imageProcessingMaxRequests">Max Requests</Label>
                        <Input
                          id="imageProcessingMaxRequests"
                          type="number"
                          min={1}
                          max={1000}
                          value={settings.imageProcessingMaxRequests}
                          onChange={(e) => updateSetting('imageProcessingMaxRequests', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="imageProcessingWindowMs">Window (minutes)</Label>
                        <Input
                          id="imageProcessingWindowMs"
                          type="number"
                          min={1}
                          max={60}
                          value={settings.imageProcessingWindowMs / 60000}
                          onChange={(e) => updateSetting('imageProcessingWindowMs', parseInt(e.target.value) * 60000)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Batch Operation Limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="batchOperationMaxRequests">Max Batch Operations</Label>
                        <Input
                          id="batchOperationMaxRequests"
                          type="number"
                          min={1}
                          max={100}
                          value={settings.batchOperationMaxRequests}
                          onChange={(e) => updateSetting('batchOperationMaxRequests', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batchOperationWindowMs">Window (minutes)</Label>
                        <Input
                          id="batchOperationWindowMs"
                          type="number"
                          min={1}
                          max={60}
                          value={settings.batchOperationWindowMs / 60000}
                          onChange={(e) => updateSetting('batchOperationWindowMs', parseInt(e.target.value) * 60000)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* File Upload Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>File Upload Settings</CardTitle>
                  <CardDescription>
                    Configure file upload limits and restrictions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        min={1}
                        max={100}
                        value={settings.maxFileSize / 1048576}
                        onChange={(e) => updateSetting('maxFileSize', parseInt(e.target.value) * 1048576)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum file size for uploads (1-100MB)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxFiles">Max Files Per Request</Label>
                      <Input
                        id="maxFiles"
                        type="number"
                        min={1}
                        max={50}
                        value={settings.maxFiles}
                        onChange={(e) => updateSetting('maxFiles', parseInt(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum number of files per upload (1-50)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* System Performance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>
                    Configure system-level performance parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nodeMemoryLimit">Memory Limit (MB)</Label>
                      <Input
                        id="nodeMemoryLimit"
                        type="number"
                        min={1024}
                        max={16384}
                        value={settings.nodeMemoryLimit}
                        onChange={(e) => updateSetting('nodeMemoryLimit', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="jobTimeoutMs">Job Timeout (seconds)</Label>
                      <Input
                        id="jobTimeoutMs"
                        type="number"
                        min={30}
                        max={600}
                        value={settings.jobTimeoutMs / 1000}
                        onChange={(e) => updateSetting('jobTimeoutMs', parseInt(e.target.value) * 1000)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="jobRetryAttempts">Job Retry Attempts</Label>
                      <Input
                        id="jobRetryAttempts"
                        type="number"
                        min={1}
                        max={10}
                        value={settings.jobRetryAttempts}
                        onChange={(e) => updateSetting('jobRetryAttempts', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-muted-foreground">Failed to load system settings</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 