import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Settings, Save } from 'lucide-react';
import { SystemSettings } from './types';

interface ConfigurationTabProps {
  settings: SystemSettings | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  hasChanges: boolean;
  saveSettings: () => Promise<void>;
  updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export function ConfigurationTab({
  settings,
  settingsLoading,
  settingsSaving,
  hasChanges,
  saveSettings,
  updateSetting
}: ConfigurationTabProps) {
  if (settingsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load system settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="font-medium">General API Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiMaxRequests">Max API Requests</Label>
                <Input
                  id="apiMaxRequests"
                  type="number"
                  min={10}
                  max={10000}
                  value={settings.apiMaxRequests}
                  onChange={(e) => updateSetting('apiMaxRequests', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  General API requests per window (10-10000)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiWindowMs">Window (minutes)</Label>
                <Input
                  id="apiWindowMs"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.apiWindowMs / 60000}
                  onChange={(e) => updateSetting('apiWindowMs', parseInt(e.target.value) * 60000)}
                />
                <p className="text-sm text-muted-foreground">
                  Time window for API rate limiting
                </p>
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
      
      {/* Cleanup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Cleanup Settings</CardTitle>
          <CardDescription>
            Configure automatic file cleanup and retention policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auto Cleanup Toggle */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="autoCleanupEnabled" 
                  checked={settings.autoCleanupEnabled}
                  onCheckedChange={(checked) => updateSetting('autoCleanupEnabled', !!checked)}
                />
                <Label htmlFor="autoCleanupEnabled" className="text-base font-medium">
                  Enable Automatic Cleanup
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                When enabled, the system will automatically clean up old files based on the retention policies below
              </p>
            </div>
            
            {/* Retention Settings */}
            <div className="space-y-2">
              <Label htmlFor="processedFileRetentionHours">Processed Files Retention (hours)</Label>
              <Input
                id="processedFileRetentionHours"
                type="number"
                min={1}
                max={720}
                value={settings.processedFileRetentionHours}
                onChange={(e) => updateSetting('processedFileRetentionHours', parseInt(e.target.value))}
                disabled={!settings.autoCleanupEnabled}
              />
              <p className="text-sm text-muted-foreground">
                How long to keep processed images (1h - 30 days)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="archiveFileRetentionHours">Archive Files Retention (hours)</Label>
              <Input
                id="archiveFileRetentionHours"
                type="number"
                min={1}
                max={168}
                value={settings.archiveFileRetentionHours}
                onChange={(e) => updateSetting('archiveFileRetentionHours', parseInt(e.target.value))}
                disabled={!settings.autoCleanupEnabled}
              />
              <p className="text-sm text-muted-foreground">
                How long to keep archived files (1h - 7 days)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tempFileRetentionHours">Temporary Files Retention (hours)</Label>
              <Input
                id="tempFileRetentionHours"
                type="number"
                min={0.5}
                max={48}
                step={0.5}
                value={settings.tempFileRetentionHours}
                onChange={(e) => updateSetting('tempFileRetentionHours', parseFloat(e.target.value))}
                disabled={!settings.autoCleanupEnabled}
              />
              <p className="text-sm text-muted-foreground">
                How long to keep temporary files (0.5h - 48h)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cleanupIntervalHours">Cleanup Interval (hours)</Label>
              <Input
                id="cleanupIntervalHours"
                type="number"
                min={1}
                max={72}
                value={settings.cleanupIntervalHours}
                onChange={(e) => updateSetting('cleanupIntervalHours', parseInt(e.target.value))}
                disabled={!settings.autoCleanupEnabled}
              />
              <p className="text-sm text-muted-foreground">
                How often to run cleanup (1h - 72h)
              </p>
            </div>
          </div>
          
          {/* Current Status */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-medium mb-2">Current Retention Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Processed: </span>
                <span className="font-medium">{(settings.processedFileRetentionHours / 24).toFixed(1)} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Archive: </span>
                <span className="font-medium">{(settings.archiveFileRetentionHours / 24).toFixed(1)} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Temp: </span>
                <span className="font-medium">{settings.tempFileRetentionHours} hours</span>
              </div>
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
              <p className="text-sm text-muted-foreground">
                Node.js memory limit (1GB - 16GB)
              </p>
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
              <p className="text-sm text-muted-foreground">
                Maximum job execution time (30s - 10min)
              </p>
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
              <p className="text-sm text-muted-foreground">
                Number of retry attempts for failed jobs (1-10)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 