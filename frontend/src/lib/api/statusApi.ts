import { apiRequest } from '../apiClient';

// Types for processing mode
export type ProcessingMode = 'queued' | 'direct';

// Server status response type
export interface ServerStatus {
  status: string;
  timestamp: string;
  redis: 'connected' | 'unavailable';
  mode: 'queued' | 'direct';
  message: string;
}

// Job status response types
export interface JobStatus {
  id: string;
  state: 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';
  progress: number;
  result: any | null;
  error: string | null;
  queuePosition?: number | null;
  estimatedWaitTime?: string | null;
}

export interface JobStatusResponse {
  status: string;
  data: JobStatus;
}

// Cache the last known status to prevent excessive requests
let cachedStatus: ServerStatus | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5000; // 5 seconds

// Track if we're in initial connection phase
let isInitialConnection = true;
let connectionAttempts = 0;
let consecutiveErrors = 0;

// Health check specific settings
const MAX_INITIAL_ATTEMPTS = 3;
const MAX_CONSECUTIVE_ERRORS = 5;
let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL = 10000; // 10 seconds

/**
 * Get the current server status (processing mode, etc.)
 */
export async function getServerStatus(): Promise<ServerStatus> {
  const now = Date.now();
  
  // Return cached status if it's fresh enough (except during initial connection)
  if (!isInitialConnection && cachedStatus && now - lastFetchTime < CACHE_TTL) {
    return cachedStatus;
  }
  
  try {
    // Increase retry count during initial connection phase
    const retry = isInitialConnection ? 2 : 1;
    const retryDelay = isInitialConnection ? 400 : 800;
    
    // Limit health check console logs
    const shouldLogError = now - lastErrorLogTime > ERROR_LOG_INTERVAL;
    if (shouldLogError) {
      lastErrorLogTime = now;
    }
    
    const response = await apiRequest<{ status: string; data: ServerStatus } | ServerStatus>('health', {
      method: 'GET',
      retry,
      retryDelay,
      noRedirect: true, // Don't redirect to login on auth errors
      bypassCircuitBreaker: true, // Health checks should always bypass circuit breaker
    });
    
    // Handle both response formats
    const result = 'data' in response ? response.data : response;
    
    // Update cache
    cachedStatus = result;
    lastFetchTime = now;
    
    // Reset error tracking on success
    consecutiveErrors = 0;
    
    // Initial connection is complete
    if (isInitialConnection) {
      isInitialConnection = false;
    }
    
    // Reset connection attempts
    connectionAttempts = 0;
    
    return result;
  } catch (error) {
    // Track errors but don't log them to console
    const shouldLogError = now - lastErrorLogTime > ERROR_LOG_INTERVAL;
    if (shouldLogError) {
      lastErrorLogTime = now;
    }
    
    // Increment connection attempts and error count
    connectionAttempts++;
    consecutiveErrors++;
    
    // After MAX_INITIAL_ATTEMPTS failed attempts, consider initial connection phase complete
    if (isInitialConnection && connectionAttempts >= MAX_INITIAL_ATTEMPTS) {
      isInitialConnection = false;
    }
    
    // Default to direct processing mode if status check fails
    const fallbackStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: 'unavailable' as const,
      mode: 'direct' as const,
      message: 'System running in direct processing mode (fallback)'
    };
    
    // Only update cache if we don't have a previous successful response
    if (!cachedStatus) {
      cachedStatus = fallbackStatus;
      lastFetchTime = now;
    }
    
    throw error;
  }
}

/**
 * Get the current processing mode
 */
export async function getProcessingMode(): Promise<ProcessingMode> {
  try {
    const status = await getServerStatus();
    return status.mode === 'queued' ? 'queued' : 'direct';
  } catch (error) {
    // Always default to direct mode on error
    return 'direct';
  }
}

/**
 * Get current rate limit settings
 */
export async function getRateLimitSettings(): Promise<{
  imageProcessing: { max: number; windowMs: number };
  batchOperation: { max: number; windowMs: number };
  api: { max: number; windowMs: number };
}> {
  try {
    const response = await apiRequest<{
      status: string;
      data: {
        imageProcessing: { max: number; windowMs: number };
        batchOperation: { max: number; windowMs: number };
        api: { max: number; windowMs: number };
      };
    }>('admin/settings/rate-limits', {
      method: 'GET',
      noRedirect: true,
    });
    
    return response.data;
  } catch (error) {
    // Fallback to default values if unable to fetch
    return {
      imageProcessing: { max: 50, windowMs: 300000 }, // 50 requests per 5 minutes
      batchOperation: { max: 15, windowMs: 600000 }, // 15 requests per 10 minutes
      api: { max: 1000, windowMs: 900000 } // 1000 requests per 15 minutes
    };
  }
}

// Cache for job statuses to prevent excessive polling
const jobStatusCache: Record<string, {
  status: JobStatus;
  timestamp: number;
}> = {};

/**
 * Poll job status until completion or failure
 * @param jobId The job ID to poll
 * @param jobType The type of job (compress, resize, etc.)
 * @param options Polling options
 */
export async function pollJobStatus(
  jobId: string, 
  jobType: 'compress' | 'resize' | 'convert' | 'crop',
  options: {
    intervalMs?: number,
    maxAttempts?: number,
    onProgress?: (progress: number, queuePosition?: number | null, estimatedWaitTime?: string | null) => void,
    onComplete?: (result: any) => void,
    onError?: (error: string) => void,
    onQueueStatus?: (position: number, waitTime: string) => void,
  } = {}
): Promise<any> {
  const {
    intervalMs = 1000,
    maxAttempts = 60, // 1 minute at 1s intervals
    onProgress,
    onComplete,
    onError,
    onQueueStatus
  } = options;
  
  let attempts = 0;
  let backoffFactor = 1;
  
  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        attempts++;
        
        // Calculate current interval with exponential backoff
        const currentIntervalMs = Math.min(intervalMs * backoffFactor, 5000); // Cap at 5 seconds
        
        // Get job status
        let jobStatus: JobStatus;
        
        try {
          const cachedData = jobStatusCache[jobId];
          const now = Date.now();
          
          // Use cache if it's fresh (within 2 seconds) and not for the final status check
          if (cachedData && now - cachedData.timestamp < 2000 && 
              attempts < maxAttempts && 
              !['completed', 'failed'].includes(cachedData.status.state)) {
            jobStatus = cachedData.status;
          } else {
            const response = await apiRequest<JobStatusResponse>(
              `images/status/${jobId}?type=${jobType}`,
              { method: 'GET' }
            );
            
            jobStatus = response.data;
            
            // Update cache
            jobStatusCache[jobId] = {
              status: jobStatus,
              timestamp: now
            };
          }
        } catch (error) {
          // Increase backoff on connection errors
          backoffFactor = Math.min(backoffFactor * 1.5, 5);
          
          // Continue polling despite errors, but slow down
          setTimeout(checkStatus, currentIntervalMs);
          return;
        }
        
        // Call progress callback
        if (onProgress && typeof jobStatus.progress === 'number') {
          onProgress(jobStatus.progress, jobStatus.queuePosition, jobStatus.estimatedWaitTime);
        }
        
        // Call queue status callback for waiting jobs
        if (onQueueStatus && jobStatus.state === 'waiting' && 
            jobStatus.queuePosition && jobStatus.estimatedWaitTime) {
          onQueueStatus(jobStatus.queuePosition, jobStatus.estimatedWaitTime);
        }
        
        // Check if job is complete or failed
        if (jobStatus.state === 'completed') {
          if (onComplete) onComplete(jobStatus.result);
          resolve(jobStatus.result);
          return;
        } else if (jobStatus.state === 'failed') {
          const errorMessage = jobStatus.error || 'Job failed with unknown error';
          if (onError) onError(errorMessage);
          reject(new Error(errorMessage));
          return;
        }
        
        // Check if we've hit the max attempts
        if (attempts >= maxAttempts) {
          const timeoutError = `Polling timed out after ${maxAttempts} attempts`;
          if (onError) onError(timeoutError);
          reject(new Error(timeoutError));
          return;
        }
        
        // Reset backoff factor on successful responses
        backoffFactor = 1;
        
        // Continue polling
        setTimeout(checkStatus, currentIntervalMs);
      } catch (error) {
        if (onError) onError(error instanceof Error ? error.message : String(error));
        reject(error);
      }
    };
    
    // Start polling
    checkStatus();
  });
}

/**
 * Get current file upload settings
 */
export async function getFileUploadSettings(): Promise<{
  maxFileSize: number;
  maxFiles: number;
}> {
  try {
    const response = await apiRequest<{
      status: string;
      data: {
        maxFileSize: number;
        maxFiles: number;
      };
    }>('admin/settings/file-upload', {
      method: 'GET',
      noRedirect: true,
    });
    
    return response.data;
  } catch (error) {
    // Fallback to default values if unable to fetch
    return {
      maxFileSize: 52428800, // 50MB
      maxFiles: 10
    };
  }
} 