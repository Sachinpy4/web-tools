import { useState, useCallback } from 'react';
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

  const { toast } = useToast();

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
    console.log('🔍 FRONTEND - Starting job polling:', { jobId, toolType, fileIndex, originalFilename: file?.name });
    
    setJobIds(prev => [...prev, jobId]);
    setFileJobMapping(prev => ({ ...prev, [fileIndex]: jobId }));
    setJobProgress(prev => ({ ...prev, [jobId]: 0 }));
    
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 60 attempts = 2 minutes with 2s intervals
    let pollInterval: NodeJS.Timeout;
    
    const pollJobStatus = async () => {
      try {
        pollAttempts++;
        console.log(`🔍 FRONTEND - Polling job status (attempt ${pollAttempts}/${maxPollAttempts}):`, jobId);
        
        const response = await apiRequest<any>(`images/status/${jobId}?type=${toolType}`, {
          method: 'GET',
        });

        console.log('📊 FRONTEND - Job status response:', response);
        
        // Handle both response structures: direct data or nested in .data
        const jobData = response?.data || response;
        
        if (jobData) {
          const { progress, state, result, error, queuePosition, estimatedWaitTime } = jobData;
          
          console.log('📈 FRONTEND - Job details:', { progress, state, result, error });
          
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
            console.log('✅ FRONTEND - Job completed:', { jobId, result });
            clearInterval(pollInterval);
            
            const resultObj = resultProcessor(result, file);
            console.log('🎯 FRONTEND - Processed result:', resultObj);
            
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
            
            console.log('🧹 FRONTEND - Job cleanup completed for:', jobId);
            return;
            
          } else if (state === 'failed') {
            console.error('❌ FRONTEND - Job failed:', { jobId, error });
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
          console.error(`💥 FRONTEND - Max polling attempts exceeded for job ${jobId}`);
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
        console.error('🚨 FRONTEND - Job polling failed:', pollingError);
        
        // Check for network errors
        const isNetworkError = 
          pollingError instanceof TypeError && 
          (pollingError.message?.includes('Failed to fetch') || 
           pollingError.message?.includes('NetworkError') ||
           pollingError.message?.includes('Network request failed'));
        
        // If network error or we've exceeded attempts, clean up
        if (isNetworkError || pollAttempts >= maxPollAttempts) {
          console.warn(`🚨 FRONTEND - Stopping polling for job ${jobId} due to error or timeout`);
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
            title: "❌ Processing failed",
            description: isNetworkError ? "Network error occurred while processing. Please try again." : "Processing timeout. Please try again.",
            variant: "destructive"
          });
        }
        // For other errors, continue polling (the interval will handle the next attempt)
      }
    };
    
    // Start polling with 2-second intervals
    pollInterval = setInterval(pollJobStatus, 2000);
    
    // Start the first poll immediately
    pollJobStatus();
    
  }, [setJobIds, setFileJobMapping, setVisualProgress, setJobProgress, setQueueStatus, setResults, setProcessingFiles, toast, cleanupJobState]);

  const clearAllJobs = useCallback(() => {
    setJobIds([]);
    setJobProgress({});
    setQueueStatus({});
    setFileJobMapping({});
  }, [setJobIds, setJobProgress, setQueueStatus, setFileJobMapping]);

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

// Helper function to generate success messages based on tool type
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