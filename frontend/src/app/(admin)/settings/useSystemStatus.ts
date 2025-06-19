import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiClient';
import { SystemStatus, SchedulerStates, SchedulerInfo, CleanupType, ApiResponse } from './types';

export function useSystemStatus() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse['data'] | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  
  // Scheduler states for each cleanup type
  const [schedulerStates, setSchedulerStates] = useState<SchedulerStates>({
    images: false,
    logs: false,
    cache: false, 
    database: false,
    memory: false
  });
  
  // Detailed scheduler information
  const [schedulerInfo, setSchedulerInfo] = useState<SchedulerInfo>({});

  // Function to load scheduler status
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
      }>('admin/scheduler/status', {
        requireAuth: true
      });
      
      // Handle different response structures
      if (response.data?.schedulers) {
        // Old structure (Express backend)
        const { schedulers } = response.data;
        setSchedulerStates({
          images: schedulers.images?.active || false,
          logs: schedulers.logs?.active || false,
          cache: schedulers.cache?.active || false,
          database: schedulers.database?.active || false,
          memory: schedulers.memory?.active || false
        });
        setSchedulerInfo(schedulers);
      } else if ((response as any).tasks) {
        // New structure (NestJS backend) - convert tasks array to schedulers object
        const schedulers: any = {};
        (response as any).tasks.forEach((task: any) => {
          schedulers[task.type] = {
            active: task.enabled,
            nextRun: task.nextRun,
            schedule: `${task.hour}:${task.minute.toString().padStart(2, '0')}`
          };
        });
        
        setSchedulerStates({
          images: schedulers.images?.active || false,
          logs: schedulers.logs?.active || false,
          cache: schedulers.cache?.active || false,
          database: schedulers.database?.active || false,
          memory: schedulers.memory?.active || false
        });
        setSchedulerInfo(schedulers);
      } else {
        // Fallback - set all to false
        setSchedulerStates({
          images: false,
          logs: false,
          cache: false,
          database: false,
          memory: false
        });
        setSchedulerInfo({});
      }
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
      // Don't show toast error for this as it's not critical
    }
  };

  // Load system status
  const loadSystemStatus = async () => {
    try {
      const response = await apiRequest<{ 
        status: string; 
        data: { 
          systemStatus: SystemStatus 
        } 
      }>('admin/stats', {
        requireAuth: true
      });
      
      setSystemStatus(response.data.systemStatus);
    } catch (error) {
      console.error('Failed to load system status:', error);
      // Don't show toast error for this as it's not critical
    }
  };

  // Load data on hook initialization
  useEffect(() => {
    loadSchedulerStatus();
    loadSystemStatus();
  }, []);

  // Function to handle cleanup
  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<any>('admin/cleanup', {
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
      }>('admin/stats', {
        requireAuth: true
      });
      
      setSystemStatus(response.data.systemStatus);
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    }
  };

  // Function to handle system cleanup (logs, cache, database, memory)
  const handleSystemCleanup = async (type: CleanupType) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<any>(`admin/cleanup`, {
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
  const handleSchedulerSetup = async (type: CleanupType, enabled: boolean) => {
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
      
      const response = await apiRequest<any>(`admin/scheduler`, {
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
      await loadSchedulerStatus();
      
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

  return {
    isLoading,
    results,
    systemStatus,
    schedulerStates,
    schedulerInfo,
    handleCleanup,
    refreshSystemStatus,
    handleSystemCleanup,
    handleSchedulerSetup,
    loadSchedulerStatus
  };
} 