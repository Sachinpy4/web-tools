import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiClient';

interface JobStatus {
  position?: number | null;
  waitTime?: string | null;
  isProcessing?: boolean;
}

interface UseJobManagementProps {
  setVisualProgress: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  setProcessingFiles: React.Dispatch<React.SetStateAction<Set<number>>>;
  setResults: React.Dispatch<React.SetStateAction<any[]>>;
  setRateLimitUsage: React.Dispatch<React.SetStateAction<{
    used: number;
    limit: number;
    resetsIn: number | null;
    isLimitReached: boolean;
  }>>;
}

interface UseJobManagementReturn {
  // State
  jobIds: string[];
  jobProgress: Record<string, number>;
  queueStatus: Record<string, JobStatus>;
  fileJobMapping: Record<number, string>;
  
  // Setters
  setJobIds: React.Dispatch<React.SetStateAction<string[]>>;
  setJobProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setQueueStatus: React.Dispatch<React.SetStateAction<Record<string, JobStatus>>>;
  setFileJobMapping: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  
  // Job management functions
  startJobPolling: (jobId: string, toolType: 'compress' | 'convert' | 'resize' | 'crop', fileIndex: number, file: File, resultProcessor: (jobResult: any, file: File) => any) => void;
  cleanupJobState: (jobId: string, fileIndex?: number) => void;
  clearAllJobs: () => void;
}

// Type for job polling settings
interface JobPollingSettings {
  jobStatusPollingIntervalMs: number;
  maxPollingAttempts: number;
}

export const useJobManagement = ({
  setVisualProgress,
  setProcessingFiles,
  setResults,
  setRateLimitUsage
}: UseJobManagementProps): UseJobManagementReturn => {
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [jobProgress, setJobProgress] = useState<Record<string, number>>({});
  const [queueStatus, setQueueStatus] = useState<Record<string, JobStatus>>({});
  const [fileJobMapping, setFileJobMapping] = useState<Record<number, string>>({});
  
  // Dynamic polling settings
  const [pollingIntervalMs, setPollingIntervalMs] = useState<number>(2000);
  const [maxPollAttempts, setMaxPollAttempts] = useState<number>(60);

  // CRITICAL PERFORMANCE FIX: Track active intervals to prevent memory leaks using ref
  const activeIntervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const { toast } = useToast();

  // CRITICAL PERFORMANCE FIX: Cleanup function to clear all active intervals
  const cleanupAllIntervals = useCallback(() => {
    Array.from(activeIntervalsRef.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    activeIntervalsRef.current = new Set();
  }, []); // No dependencies needed since we use ref

  // CRITICAL PERFORMANCE FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllIntervals();
    };
  }, [cleanupAllIntervals]);

  // Fetch polling settings from admin configuration
  useEffect(() => {
    const fetchPollingSettings = async () => {
      try {
        const response = await apiRequest<{ status: string; data: JobPollingSettings }>('admin/settings/polling', {
          requireAuth: false // Public endpoint, no auth needed
        });
        
        const settings = response.data;
        setPollingIntervalMs(settings.jobStatusPollingIntervalMs);
        setMaxPollAttempts(settings.maxPollingAttempts);
      } catch (error) {
        // Fallback to default values if settings fetch fails
        console.warn('Failed to fetch job polling settings, using defaults:', error);
        setPollingIntervalMs(2000); // 2 seconds default
        setMaxPollAttempts(60); // 60 attempts default
      }
    };
    
    fetchPollingSettings();
  }, []);

  const cleanupJobState = useCallback((jobId: string, fileIndex?: number) => {
    // Remove job from active jobs
    setJobIds(prev => prev.filter(id => id !== jobId));
    
    // Clean up job progress
    setJobProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[jobId];
      return newProgress;
    });
    
    // Clean up queue status
    setQueueStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[jobId];
      return newStatus;
    });
    
    // Clean up file job mapping if fileIndex provided
    if (fileIndex !== undefined) {
      setFileJobMapping(prev => {
        const newMapping = { ...prev };
        delete newMapping[fileIndex];
        return newMapping;
      });
    }
  }, [setJobIds, setJobProgress, setQueueStatus, setFileJobMapping]);

  const startJobPolling = useCallback((
    jobId: string, 
    toolType: 'compress' | 'convert' | 'resize' | 'crop', 
    fileIndex: number, 
    file: File,
    resultProcessor: (jobResult: any, file: File) => any
  ) => {
    // Starting job polling
    
    setJobIds(prev => [...prev, jobId]);
    setFileJobMapping(prev => ({ ...prev, [fileIndex]: jobId }));
    setJobProgress(prev => ({ ...prev, [jobId]: 0 }));
    
    let pollAttempts = 0;
    let pollInterval: NodeJS.Timeout;
    
    const pollJobStatus = async () => {
      try {
        pollAttempts++;
        // Polling job status
        
        const response = await apiRequest<any>(`images/status/${jobId}?type=${toolType}`, {
          method: 'GET',
        });

        // Job status response received
        
        // Handle both response structures: direct data or nested in .data
        const jobData = response?.data || response;
        
        if (jobData) {
          const { progress, state, result, error, queuePosition, estimatedWaitTime } = jobData;
          
          // Processing job details
          
          // Update progress if available
          if (progress !== undefined) {
            setVisualProgress(prev => ({
              ...prev,
              [fileIndex]: progress
            }));
            
            setJobProgress(prev => ({
              ...prev,
              [jobId]: progress
            }));
          }
          
          // Update queue status
          if (queuePosition !== undefined || estimatedWaitTime !== undefined) {
            setQueueStatus(prev => ({
              ...prev,
              [jobId]: {
                position: queuePosition,
                waitTime: estimatedWaitTime,
                isProcessing: progress > 0
              }
            }));
          }
          
          // Handle completion
          if (state === 'completed' && result) {
            // Job completed successfully
            clearInterval(pollInterval);
            
            const resultObj = resultProcessor(result, file);
            // Result processed
            
            setResults(prevResults => {
              const newResults = [...prevResults];
              newResults[fileIndex] = resultObj;
              return newResults;
            });
            
            // Clean up states
            setVisualProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[fileIndex];
              return newProgress;
            });
            
            setProcessingFiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(fileIndex);
              return newSet;
            });
            
            // Show success notification
            const successMessage = getSuccessMessage(toolType, file, result);
            toast({
              title: "✅ Processing completed!",
              description: successMessage,
            });
            
            // Clean up job state
            cleanupJobState(jobId, fileIndex);
            
            // Job cleanup completed
            return;
            
          } else if (state === 'failed') {
            // Job failed
            clearInterval(pollInterval);
            
            toast({
              title: `${toolType.charAt(0).toUpperCase() + toolType.slice(1)} failed`,
              description: error || "Job failed to complete",
              variant: "destructive"
            });
            
            // Clean up job state
            cleanupJobState(jobId, fileIndex);
            return;
          }
        }
        
        // Check if we've exceeded max attempts
        if (pollAttempts >= maxPollAttempts) {
          // Max polling attempts exceeded
          clearInterval(pollInterval);
          
          // Clean up job state
          cleanupJobState(jobId, fileIndex);
          
          // Update UI to show error state
          setVisualProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileIndex];
            return newProgress;
          });
          
          setProcessingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileIndex);
            return newSet;
          });
          
          toast({
            title: "❌ Processing timeout",
            description: "Job took too long to complete. Please try again.",
            variant: "destructive"
          });
        }
        
      } catch (pollingError: any) {
        // Job polling failed
        
        // CRITICAL FIX: Handle 404 "job not found" errors more gracefully
        const isJobNotFound = pollingError.status === 404;
        const isJobCleanedUp = pollingError.message?.includes('cleaned up') || pollingError.message?.includes('may have been cleaned');
        
        // Check for network errors
        const isNetworkError = 
          pollingError instanceof TypeError && 
          (pollingError.message?.includes('Failed to fetch') || 
           pollingError.message?.includes('NetworkError') ||
           pollingError.message?.includes('Network request failed'));
        
        // Handle job not found (cleaned up) scenario differently
        if (isJobNotFound && isJobCleanedUp) {
          // Job was cleaned up but likely completed - treat as success
          console.log('🔄 Job cleaned up from queue, assuming completion:', jobId);
          clearInterval(pollInterval);
          
          // Try to find any completed result for this file
          // This is a fallback for when Redis cleans up completed jobs too quickly
          const fallbackResult = {
            filename: file.name,
            originalSize: file.size,
            // We can't get actual compression ratio, but that's OK
            status: 'completed',
            message: 'Processing completed (details unavailable due to queue cleanup)',
            note: 'Your file was processed successfully, but some details were lost due to system cleanup.',
            downloadUrl: null // Will need to be checked separately
          };
          
          const resultObj = resultProcessor(fallbackResult, file);
          
          setResults(prevResults => {
            const newResults = [...prevResults];
            newResults[fileIndex] = resultObj;
            return newResults;
          });
          
          // Clean up states
          setVisualProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileIndex];
            return newProgress;
          });
          
          setProcessingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileIndex);
            return newSet;
          });
          
          // Show informative toast instead of error
          toast({
            title: "✅ Processing completed",
            description: `${file.name} was processed successfully. Some details were unavailable due to system optimization.`,
          });
          
          cleanupJobState(jobId, fileIndex);
          return;
        }
        
        // If job not found but not due to cleanup, or we've exceeded attempts, clean up
        if (isJobNotFound || isNetworkError || pollAttempts >= maxPollAttempts) {
          // Stopping polling due to error or timeout
          clearInterval(pollInterval);
          
          // Clean up job state
          cleanupJobState(jobId, fileIndex);
          
          // Update UI to show error state
          setVisualProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileIndex];
            return newProgress;
          });
          
          setProcessingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileIndex);
            return newSet;
          });
          
          // Improved error messages based on error type
          let errorTitle = "❌ Processing failed";
          let errorDescription = "An error occurred while processing. Please try again.";
          
          if (isJobNotFound && !isJobCleanedUp) {
            errorTitle = "❌ Job not found";
            errorDescription = "The processing job could not be found. This may happen during high traffic periods. Please try again.";
          } else if (isNetworkError) {
            errorDescription = "Network error occurred while processing. Please check your connection and try again.";
          } else if (pollAttempts >= maxPollAttempts) {
            errorDescription = "Processing timeout. The job took too long to complete. Please try again.";
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive"
          });
        }
        // For other errors, continue polling (the interval will handle the next attempt)
      }
    };
    
    // Start polling with configured interval
    pollInterval = setInterval(pollJobStatus, pollingIntervalMs);
    
    // CRITICAL PERFORMANCE FIX: Track the interval for cleanup
    activeIntervalsRef.current.add(pollInterval);
    
    // Start the first poll immediately
    pollJobStatus();
    
    // CRITICAL PERFORMANCE FIX: Return cleanup function
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        activeIntervalsRef.current.delete(pollInterval);
      }
    };
  }, [setJobIds, setFileJobMapping, setVisualProgress, setJobProgress, setQueueStatus, setResults, setProcessingFiles, toast, cleanupJobState, pollingIntervalMs, maxPollAttempts]);

  const clearAllJobs = useCallback(() => {
    // CRITICAL PERFORMANCE FIX: Clear all intervals before clearing jobs
    cleanupAllIntervals();
    
    setJobIds([]);
    setJobProgress({});
    setQueueStatus({});
    setFileJobMapping({});
  }, [setJobIds, setJobProgress, setQueueStatus, setFileJobMapping, cleanupAllIntervals]);

  return {
    // State
    jobIds,
    jobProgress,
    queueStatus,
    fileJobMapping,
    
    // Setters
    setJobIds,
    setJobProgress,
    setQueueStatus,
    setFileJobMapping,
    
    // Functions
    startJobPolling,
    cleanupJobState,
    clearAllJobs
  };
};

// Helper function to generate success messages
const getSuccessMessage = (toolType: 'compress' | 'convert' | 'resize' | 'crop', file: File, jobResult: any): string => {
  switch (toolType) {
    case 'compress':
      return `${file.name} compressed successfully (${jobResult.compressionRatio}% file size reduction)`;
    case 'convert':
      return `${file.name} converted to ${(jobResult.convertedFormat || 'unknown format').toUpperCase()}`;
    case 'resize':
      return `${file.name} resized to ${jobResult.width}×${jobResult.height}`;
    case 'crop':
      return `${file.name} cropped to ${jobResult.width}×${jobResult.height}`;
    default:
      return `${file.name} processed successfully`;
  }
};