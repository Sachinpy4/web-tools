import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Trash2, CheckCircle, Timer, ClockIcon, RefreshCw, Database, HardDrive, MemoryStick } from 'lucide-react';
import { SystemStatus, SchedulerStates, SchedulerInfo, ApiResponse } from './types';

interface MaintenanceTabProps {
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  results: ApiResponse['data'] | null;
  schedulerStates: SchedulerStates;
  schedulerInfo: SchedulerInfo;
  handleCleanup: () => Promise<void>;
  refreshSystemStatus: () => Promise<void>;
  handleSystemCleanup: (type: 'images' | 'logs' | 'cache' | 'database' | 'memory' | 'files') => Promise<void>;
  handleSchedulerSetup: (type: 'images' | 'logs' | 'cache' | 'database' | 'memory' | 'files', enabled: boolean) => Promise<void>;
}

export function MaintenanceTab({
  systemStatus,
  isLoading,
  results,
  schedulerStates,
  schedulerInfo,
  handleCleanup,
  refreshSystemStatus,
  handleSystemCleanup,
  handleSchedulerSetup
}: MaintenanceTabProps) {
  return (
    <div className="space-y-6">
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
        
        {/* File System Cleanup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="mr-2 h-5 w-5" />
              File System Cleanup
              {schedulerStates.files && (
                <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Scheduled
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Clean up orphaned temporary files, old processed images, and expired archives. Helps prevent disk space issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Cleanup policy: <strong>Upload files (1 hour), Processed files (24 hours), Archives (7 days)</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                File retention: <strong>Smart cleanup based on file age and type</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Windows compatibility: <strong>Enhanced with retry logic and garbage collection</strong>
              </p>
              {schedulerInfo.files && schedulerInfo.files.active && (
                <p className="text-sm text-green-600">
                  <ClockIcon className="h-3 w-3 inline mr-1" />
                  Next cleanup: {schedulerInfo.files.nextRun ? 
                    new Date(schedulerInfo.files.nextRun).toLocaleString() : 
                    schedulerInfo.files.schedule || 'Unknown'}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox 
                id="filesScheduler" 
                checked={schedulerStates.files}
                onCheckedChange={(checked) => handleSchedulerSetup('files', !!checked)}
                disabled={isLoading}
              />
              <label
                htmlFor="filesScheduler"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Schedule automatic cleanup (5:00 AM daily)
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleSystemCleanup('files')} 
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
                  Clean Files
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
      </div>
    </div>
  );
} 