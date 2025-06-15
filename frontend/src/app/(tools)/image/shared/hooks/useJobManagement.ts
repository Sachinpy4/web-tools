import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { pollJobStatus } from '@/lib/api/statusApi';

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
    // Add job to tracking
    setJobIds(prev => [...prev, jobId]);
    
    // Map file index to job ID
    setFileJobMapping(prev => ({
      ...prev,
      [fileIndex]: jobId
    }));

    // Start polling this job
    pollJobStatus(jobId, toolType, {
      intervalMs: 1000,
      onProgress: (progress, queuePosition, estimatedWaitTime) => {
        // Update visual progress for queued jobs (use actual progress)
        setVisualProgress(prev => ({
          ...prev,
          [fileIndex]: progress
        }));
        
        setJobProgress(prev => ({
          ...prev,
          [jobId]: progress
        }));
        
        // Update queue status
        setQueueStatus(prev => ({
          ...prev,
          [jobId]: {
            position: queuePosition,
            waitTime: estimatedWaitTime,
            isProcessing: progress > 0
          }
        }));
      },
      onQueueStatus: (position, waitTime) => {
        setQueueStatus(prev => ({
          ...prev,
          [jobId]: {
            position,
            waitTime,
            isProcessing: false
          }
        }));
      },
      onComplete: async (jobResult) => {
        // Process the result using the provided processor
        const resultObj = resultProcessor(jobResult, file);
        
        // Show progress completion and then result
        setVisualProgress(prev => ({
          ...prev,
          [fileIndex]: 100
        }));
        
        // Wait a brief moment for the 100% to be visible, then show result
        setTimeout(() => {
          setResults(prevResults => {
            const newResults = [...prevResults];
            newResults[fileIndex] = resultObj;
            return newResults;
          });
          
          // Clean up progress state
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
          const successMessage = getSuccessMessage(toolType, file, jobResult);
          toast({
            title: "✅ Processing completed!",
            description: successMessage,
          });
        }, 100);
        
        // Clean up job state
        cleanupJobState(jobId, fileIndex);
      },
      onError: (error) => {
        // Clean up progress state on error
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
          title: `${toolType.charAt(0).toUpperCase() + toolType.slice(1)} failed`,
          description: error,
          variant: "destructive"
        });
        
        // Clean up job state
        cleanupJobState(jobId, fileIndex);
      }
    }).catch(error => {
      // Silent error handling
    });
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
      return `${file.name} converted to ${jobResult.convertedFormat.toUpperCase()}`;
    case 'resize':
      return `${file.name} resized to ${jobResult.width}×${jobResult.height}`;
    case 'crop':
      return `${file.name} cropped to ${jobResult.width}×${jobResult.height}`;
    default:
      return `${file.name} processed successfully`;
  }
}; 